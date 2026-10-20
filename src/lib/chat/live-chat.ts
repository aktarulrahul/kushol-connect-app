// Live chat backend (05 Stage 5): the `@/fixtures/chat` seam delegates here when the session is
// live (real access token — fixtures keep serving demo sessions and tests). REST runs through the
// generated client via `liveAuth()` (bearer + single-flight 401 rotate); realtime through the
// plain WS gateway (`ws-client`) — the server subscribes every room at connect. Every error maps
// onto the shared fixture codes so screens keep their exact states. Attachments stream from the
// device file to the api, which sniffs them and stores them in Cloudflare R2 — the app never
// talks to storage (owner 2026-10-17).
import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";

import { isProblem, type Schemas } from "@/api/client";
import { env } from "@/env";
import { accessTokenNeedsRefresh, isFixtureAccessToken } from "@/lib/auth/session-restore";
import { liveAuth } from "@/lib/auth/live-session";
import { tokenStore } from "@/lib/auth/token-store";
import { createChatSocket, type WsServerEvent } from "@/lib/chat/ws-client";
import { stickerEmoji } from "@/lib/chat/stickers";
import { ChatFixtureError, type ChatFixtureErrorCode } from "@/fixtures/chat-error";
import type {
  ChatGroup,
  ChatMessage,
  ChatMessageSendInput,
  ChatRealtimeEvent,
  ChatGroupCreateInput,
  ChatGroupUpdateInput,
  ChatRosterMember,
  MessageInfo,
  MessageReceipt,
  MessageRequest,
  MessageRequestDecision,
  MessageRequestInput,
  StarredPage,
} from "@/fixtures/chat";
import type { ChatMediaRef } from "@/fixtures/media";
import type { KlipyConfig } from "@/lib/chat/klipy";
import type { MediaPick } from "@/lib/chat/media-pipeline";

type EventListener = (event: ChatRealtimeEvent) => void;

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

// ─── Live-mode detection ─────────────────────────────────────────────────────────────────────

/** Sync snapshot for the realtime subscription — `chatLiveActive()` keeps it fresh. */
let liveModeCache = false;

/** True when the stored session carries a real (non-fixture) access token. */
export async function chatLiveActive(): Promise<boolean> {
  const tokens = await tokenStore.get();
  liveModeCache = !!tokens && !isFixtureAccessToken(tokens.accessToken);
  return liveModeCache;
}

/** Sync snapshot (last `chatLiveActive()` result) for non-async seam functions. */
export function chatLiveModeSync(): boolean {
  return liveModeCache;
}

// ─── Error mapping ───────────────────────────────────────────────────────────────────────────

function codeFor(problemCode: string, fallback: ChatFixtureErrorCode): ChatFixtureErrorCode {
  switch (problemCode) {
    case "VALIDATION_FAILED":
      return "VALIDATION_FAILED";
    case "FORBIDDEN":
    case "SUSPENDED":
      return "FORBIDDEN";
    case "NOT_FOUND":
      return "NOT_FOUND";
    case "CONFLICT":
      return "CONFLICT";
    case "RATE_LIMITED":
      return "RATE_LIMITED";
    case "NOT_VERIFIED":
      return "NOT_VERIFIED";
    case "UNAUTHENTICATED":
      // rotate already ran (liveAuth); treat a dead session as retryable-offline like
      // `loadCurrentUser` does when tokens exist but the call fails.
      return "OFFLINE";
    default:
      return fallback;
  }
}

function problemDetail(error: { detail?: unknown }): string | undefined {
  if (error.detail === undefined || error.detail === null) return undefined;
  return typeof error.detail === "string" ? error.detail : JSON.stringify(error.detail);
}

/** Runs one generated-client call, mapping problems and transport failures onto fixture codes. */
async function call<T>(
  run: () => Promise<{ data?: T; error?: unknown; response: Response }>,
  fallback: ChatFixtureErrorCode,
): Promise<T> {
  try {
    const { data, error, response } = await run();
    if (!error && response.ok && data !== undefined && data !== null) return data;
    if (isProblem(error)) {
      throw new ChatFixtureError(codeFor(error.code, fallback), problemDetail(error));
    }
    if (response.status >= 500) throw new ChatFixtureError("OFFLINE");
    throw new ChatFixtureError(fallback);
  } catch (cause) {
    if (cause instanceof ChatFixtureError) throw cause;
    throw new ChatFixtureError("OFFLINE"); // transport failure — the queue/retry paths apply
  }
}

// ─── REST surface ────────────────────────────────────────────────────────────────────────────

function toSendBody(input: ChatMessageSendInput): Schemas["ChatMessageSendInput"] {
  // KLIPY GIFs/stickers (owner 2026-10-18) carry the KLIPY reference; the api checks the host.
  if ((input.kind === "gif" || input.kind === "sticker") && input.klipy) {
    return {
      groupId: input.groupId,
      kind: input.kind,
      klipy: input.klipy,
      clientMsgId: input.clientMsgId,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    };
  }
  // The emoji sticker set (KLIPY off / demo) has no api kind — it goes out as the emoji text.
  if (input.kind === "sticker") {
    return {
      groupId: input.groupId,
      kind: "text",
      body: stickerEmoji(input.stickerId ?? ""),
      clientMsgId: input.clientMsgId,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    };
  }
  if (input.kind === "poll") {
    if (!input.poll) throw new ChatFixtureError("VALIDATION_FAILED", "poll payload missing");
    return {
      groupId: input.groupId,
      kind: "poll",
      poll: input.poll,
      clientMsgId: input.clientMsgId,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    };
  }
  return {
    groupId: input.groupId,
    kind: input.kind,
    ...(input.body ? { body: input.body } : {}),
    ...(input.mediaAssetId ? { mediaAssetId: input.mediaAssetId } : {}),
    clientMsgId: input.clientMsgId,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    // @mentions (owner 2026-10-19): text and captioned attachments only; every id must be a
    // current member (VALIDATION_FAILED otherwise), ≤ 50 distinct.
    ...(input.mentions?.length ? { mentions: input.mentions } : {}),
  };
}

export const liveChat = {
  async listChatGroups(): Promise<ChatGroup[]> {
    const data = await call(() => liveAuth().GET("/api/v1/chat/groups"), "VALIDATION_FAILED");
    return data.data;
  },

  async listChatMessages(
    groupId: string,
    before?: string,
    limit = 50,
  ): Promise<{
    data: ChatMessage[];
    nextBefore?: string;
    readUpTo?: string;
    deliveredUpTo?: string;
  }> {
    const page = await call(
      () =>
        liveAuth().GET("/api/v1/chat/groups/{groupId}/messages", {
          params: { path: { groupId }, query: before ? { before, limit } : { limit } },
        }),
      "NOT_FOUND",
    );
    return {
      data: page.data,
      ...(page.nextBefore ? { nextBefore: page.nextBefore } : {}),
      ...(page.readUpTo ? { readUpTo: page.readUpTo } : {}),
      ...(page.deliveredUpTo ? { deliveredUpTo: page.deliveredUpTo } : {}),
    };
  },

  async sendChatMessage(input: ChatMessageSendInput): Promise<ChatMessage> {
    return call(
      () => liveAuth().POST("/api/v1/chat/messages", { body: toSendBody(input) }),
      "SEND_FAILED",
    );
  },

  async markChatRead(groupId: string, lastReadMessageId: string): Promise<void> {
    await call(
      () =>
        liveAuth().PATCH("/api/v1/chat/groups/{groupId}/read", {
          params: { path: { groupId } },
          body: { lastReadMessageId },
        }),
      "VALIDATION_FAILED",
    );
  },

  async deleteChatMessage(messageId: string): Promise<{ id: string; deletedAt: string }> {
    const data = await call(
      () =>
        liveAuth().DELETE("/api/v1/chat/messages/{messageId}", {
          params: { path: { messageId } },
        }),
      "NOT_FOUND",
    );
    return data.data;
  },

  /**
   * Author edit (PATCH semantics for @mentions, owner 2026-10-19): `mentions` absent keeps the
   * stored ones, a list replaces them (`[]` clears). The answer is the author's view without the
   * per-viewer `starred` flag — callers refetch history instead of merging it.
   */
  async editChatMessage(
    messageId: string,
    body: string,
    mentions?: string[],
  ): Promise<ChatMessage> {
    const message = await call(
      () =>
        liveAuth().PATCH("/api/v1/chat/messages/{messageId}", {
          params: { path: { messageId } },
          body: mentions === undefined ? { body } : { body, mentions },
        }),
      "VALIDATION_FAILED",
    );
    return normalizeMessage(message);
  },

  /** G-7 (`TODO: Confirm`): no OpenAPI path — see `editChatMessage`. */
  setChatMessagePinned(messageId: string, pinned: boolean): Promise<ChatMessage> {
    const body = { pinned };
    const result = liveAuth().POST("/api/v1/chat/messages/{messageId}/pin", {
      params: { path: { messageId } },
      body,
    });
    return result.then(({ data }) => data as unknown as ChatMessage);
  },

  /** Stars (bookmarks) one message — private to the viewer: no event, no push (2026-10-19). */
  async starChatMessage(
    messageId: string,
  ): Promise<{ starred: boolean; starredAt?: string }> {
    return call(
      () =>
        liveAuth().PUT("/api/v1/chat/messages/{messageId}/star", {
          params: { path: { messageId } },
        }),
      "NOT_FOUND",
    );
  },

  /** Removes the viewer's star (idempotent). */
  async unstarChatMessage(messageId: string): Promise<{ starred: boolean }> {
    return call(
      () =>
        liveAuth().DELETE("/api/v1/chat/messages/{messageId}/star", {
          params: { path: { messageId } },
        }),
      "NOT_FOUND",
    );
  },

  /** The viewer's starred messages (newest star first; `groupId` scopes, `before` pages). */
  async listStarredChatMessages(
    params: { groupId?: string; before?: string; limit?: number } = {},
  ): Promise<StarredPage> {
    const page = await call(
      () =>
        liveAuth().GET("/api/v1/chat/starred", {
          params: {
            query: {
              ...(params.groupId ? { groupId: params.groupId } : {}),
              ...(params.before ? { before: params.before } : {}),
              ...(params.limit ? { limit: params.limit } : {}),
            },
          },
        }),
      "FORBIDDEN",
    );
    return {
      data: page.data,
      ...(page.nextBefore ? { nextBefore: page.nextBefore } : {}),
    };
  },

  /** The room roster (@mention picker + name resolution); includes the caller. */
  async listChatGroupMembers(groupId: string): Promise<ChatRosterMember[]> {
    const data = await call(
      () =>
        liveAuth().GET("/api/v1/chat/groups/{groupId}/members", {
          params: { path: { groupId } },
        }),
      "NOT_FOUND",
    );
    return data.data.map((m) => ({
      userId: m.userId,
      name: m.name,
      avatarUrl: (m as { avatarUrl?: string }).avatarUrl,
    }));
  },

  /** "Message info": read by / delivered to (api order), members not reached, reactions. */
  async messageInfo(messageId: string): Promise<MessageInfo> {
    const [page, reactions] = await Promise.all([
      call(
        () =>
          liveAuth().GET("/api/v1/chat/messages/{messageId}/seen-by", {
            params: { path: { messageId } },
          }),
        "NOT_FOUND",
      ),
      call(
        () =>
          liveAuth().GET("/api/v1/chat/messages/{messageId}/reactions", {
            params: { path: { messageId } },
          }),
        "NOT_FOUND",
      ),
    ]);
    return {
      receipts: page.data.map(toReceipt),
      pending: page.pending,
      reactors: reactions.data.map((r) => ({
        userId: r.userId,
        name: r.name,
        emoji: r.emoji,
        at: r.reactedAt,
      })),
    };
  },

  /** WhatsApp forward: copies into ≤ 5 chats (1 once forwarded many times). */
  async forwardChatMessage(messageId: string, targetGroupIds: string[]): Promise<number> {
    const result = await call(
      () =>
        liveAuth().POST("/api/v1/chat/messages/{messageId}/forward", {
          params: { path: { messageId } },
          body: { targetGroupIds },
        }),
      "FORBIDDEN",
    );
    return result.data.forwarded;
  },

  /** Grey double ticks: another member's message reached this device. */
  async markChatDelivered(groupId: string, lastDeliveredMessageId: string): Promise<void> {
    await call(
      () =>
        liveAuth().PATCH("/api/v1/chat/groups/{groupId}/delivered", {
          params: { path: { groupId } },
          body: { lastDeliveredMessageId },
        }),
      "VALIDATION_FAILED",
    );
  },

  async openDm(peerId: string): Promise<ChatGroup> {
    const data = await call(
      () => liveAuth().GET("/api/v1/chat/dm/{peerId}", { params: { path: { peerId } } }),
      "NOT_FOUND",
    );
    return data;
  },

  async listMessageRequests(): Promise<{ received: MessageRequest[]; sent: MessageRequest[] }> {
    const data = await call(
      () => liveAuth().GET("/api/v1/chat/message-requests"),
      "VALIDATION_FAILED",
    );
    return data;
  },

  async createMessageRequest(input: MessageRequestInput): Promise<MessageRequest> {
    return call(
      () => liveAuth().POST("/api/v1/chat/message-requests", { body: input }),
      "NOT_FOUND",
    );
  },

  async acceptMessageRequest(requestId: string): Promise<MessageRequestDecision> {
    const data = await call(
      () =>
        liveAuth().POST("/api/v1/chat/message-requests/{id}/accept", {
          params: { path: { id: requestId } },
        }),
      "NOT_FOUND",
    );
    return data.data;
  },

  async declineMessageRequest(requestId: string): Promise<MessageRequestDecision> {
    const data = await call(
      () =>
        liveAuth().POST("/api/v1/chat/message-requests/{id}/decline", {
          params: { path: { id: requestId } },
        }),
      "NOT_FOUND",
    );
    return data.data;
  },

  async createChatGroup(input: ChatGroupCreateInput): Promise<ChatGroup> {
    return call(() => liveAuth().POST("/api/v1/chat/groups", { body: input }), "VALIDATION_FAILED");
  },

  /** Group settings (owner 2026-10-18): only the changed fields; "" clears description/photo. */
  async updateChatGroup(groupId: string, input: ChatGroupUpdateInput): Promise<ChatGroup> {
    return call(
      () =>
        liveAuth().PATCH("/api/v1/chat/groups/{groupId}", {
          params: { path: { groupId } },
          body: input,
        }),
      "VALIDATION_FAILED",
    );
  },

  /** WhatsApp reaction toggle (server-side; the bubble renders the returned aggregate). */
  /** The caller's KLIPY app key + customer id (the device calls KLIPY itself). */
  async klipyConfig(): Promise<KlipyConfig> {
    const result = await call(() => liveAuth().GET("/api/v1/chat/klipy"), "VALIDATION_FAILED");
    return result.data;
  },

  /** Vote / withdraw on a poll option (single-choice polls withdraw on a repeat tap). */
  async votePoll(messageId: string, optionIndex: number): Promise<ChatMessage> {
    const message = await call(
      () =>
        liveAuth().POST("/api/v1/chat/messages/{messageId}/poll/vote", {
          params: { path: { messageId } },
          body: { optionIndex },
        }),
      "VALIDATION_FAILED",
    );
    return normalizeMessage(message);
  },

  async toggleReaction(messageId: string, emoji: string): Promise<ChatMessage> {
    const message = await call(
      () =>
        liveAuth().PUT("/api/v1/chat/messages/{messageId}/reactions", {
          params: { path: { messageId } },
          body: { emoji },
        }),
      "VALIDATION_FAILED",
    );
    return normalizeMessage(message);
  },
};

/** api receipt row → the sheet's row (read → "seen"; the time of that state). */
export function toReceipt(r: Schemas["ChatSeenByEntry"]): MessageReceipt {
  return r.status === "read"
    ? { userId: r.userId, name: r.name, status: "seen", at: r.readAt ?? r.deliveredAt ?? "" }
    : { userId: r.userId, name: r.name, status: "delivered", at: r.deliveredAt ?? "" };
}

// ─── Realtime (the real WS gateway takes over the fixture bus) ───────────────────────────────

const wsListeners = new Set<EventListener>();
const reconnectedListeners = new Set<() => void>();
// Connection-state sink: realtime.ts registers the app store setter. A direct chat-state import
// here would close fixtures/chat → live-chat → chat-state → fixtures/chat (DEMO_ME crash).
let connectionSink: ((state: "connecting" | "online" | "offline") => void) | null = null;

/** realtime.ts registers its store setter so socket state lands in the app store. */
export function setChatConnectionSink(
  cb: (state: "connecting" | "online" | "offline") => void,
): void {
  connectionSink = cb;
}

let socket: ReturnType<typeof createChatSocket> | null = null;
let cachedToken: string | null = null;

/** REST catch-up signal: fires after every successful (re)connect of the live socket. */
export function onChatReconnected(listener: () => void): () => void {
  reconnectedListeners.add(listener);
  return () => {
    reconnectedListeners.delete(listener);
  };
}

function wsUrl(): string {
  return `${env.EXPO_PUBLIC_API_URL.replace(/^http/, "ws")}/api/v1/ws`;
}

/** Gateway frame → app event (exported for the unit pins). */
export function mapEvent(raw: WsServerEvent): ChatRealtimeEvent | null {
  switch (raw.type) {
    case "message.new":
    case "message.updated":
      // Edits, pins and reactions arrive as the full row; the cache merges by id.
      return typeof raw.message === "object" && raw.message !== null
        ? { type: "message.new", message: normalizeMessage(raw.message as Record<string, unknown>) }
        : null;
    case "group.updated":
      return { type: "group.updated", groupId: str(raw.groupId) };
    case "message.ack":
      return {
        type: "message.ack",
        clientMsgId: str(raw.clientMsgId),
        id: str(raw.id),
        createdAt: str(raw.createdAt, new Date().toISOString()),
      };
    case "receipts.updated":
      return {
        type: "receipts.updated",
        groupId: str(raw.groupId),
        ...(typeof raw.readUpTo === "string" ? { readUpTo: raw.readUpTo } : {}),
        ...(typeof raw.deliveredUpTo === "string" ? { deliveredUpTo: raw.deliveredUpTo } : {}),
      };
    case "message.deleted":
      return {
        type: "message.deleted",
        groupId: str(raw.groupId),
        id: str(raw.id),
        deletedAt: str(raw.deletedAt),
      };
    case "typing":
      return {
        type: "typing",
        groupId: str(raw.groupId),
        userId: str(raw.userId),
        state: raw.state === "stop" ? "stop" : "start",
      };
    case "presence.update":
      return {
        type: "presence.update",
        groupId: str(raw.groupId),
        userId: str(raw.userId),
        online: raw.online === true,
      };
    default:
      return null; // unknown/notice frames are additive-by-contract and not chat's concern here
  }
}

/** The gateway emits the OpenAPI message DTO; the app's seam type adds fixture-only optionals. */
function isPoll(value: unknown): value is NonNullable<ChatMessage["poll"]> {
  const poll = value as ChatMessage["poll"];
  return (
    typeof poll === "object" &&
    typeof poll.question === "string" &&
    Array.isArray(poll.options) &&
    poll.options.every((o) => typeof o.text === "string" && typeof o.votes === "number")
  );
}

function isKlipy(value: unknown): value is NonNullable<ChatMessage["klipy"]> {
  const klipy = value as ChatMessage["klipy"];
  return (
    typeof klipy === "object" &&
    typeof klipy.slug === "string" &&
    typeof klipy.url === "string" &&
    typeof klipy.width === "number" &&
    typeof klipy.height === "number"
  );
}

function normalizeMessage(m: Record<string, unknown>): ChatMessage {
  const media =
    typeof m.media === "object" && m.media !== null ? (m.media as ChatMessage["media"]) : undefined;
  return {
    id: str(m.id),
    groupId: str(m.groupId),
    senderId: str(m.senderId),
    senderName: str(m.senderName),
    ...(typeof m.senderAvatarUrl === "string" ? { senderAvatarUrl: m.senderAvatarUrl } : {}),
    kind: str(m.kind, "text") as ChatMessage["kind"],
    ...(typeof m.body === "string" ? { body: m.body } : {}),
    ...(media ? { media } : {}),
    clientMsgId: str(m.clientMsgId),
    ...(typeof m.replyTo === "string" ? { replyTo: m.replyTo } : {}),
    ...(typeof m.replyPreview === "string" ? { replyPreview: m.replyPreview } : {}),
    ...(typeof m.replySenderName === "string" ? { replySenderName: m.replySenderName } : {}),
    ...(typeof m.replyKind === "string" ? { replyKind: m.replyKind } : {}),
    ...(typeof m.forwardCount === "number" && m.forwardCount > 0
      ? { forwardCount: m.forwardCount }
      : {}),
    ...(typeof m.deletedAt === "string" ? { deletedAt: m.deletedAt } : {}),
    ...(typeof m.editedAt === "string" ? { editedAt: m.editedAt } : {}),
    ...(typeof m.pinnedAt === "string" ? { pinnedAt: m.pinnedAt } : {}),
    ...(isPoll(m.poll) ? { poll: m.poll } : {}),
    ...(isKlipy(m.klipy) ? { klipy: m.klipy } : {}),
    // @mentions are the same for every member and ride every frame (absent ⇒ none). `starred` is
    // per-viewer and never trusted from a frame — it is not copied; the cache keeps its own.
    ...(Array.isArray(m.mentions) && m.mentions.length > 0
      ? { mentions: m.mentions.filter((id): id is string => typeof id === "string") }
      : {}),
    // Reactions on a WS frame carry the actor's `mine` — drop it; the next REST read restores it.
    ...(Array.isArray(m.reactions)
      ? {
          reactions: (m.reactions as { emoji: string; count: number }[]).map((r) => ({
            emoji: r.emoji,
            count: r.count,
          })),
        }
      : {}),
    createdAt: str(m.createdAt, new Date().toISOString()),
  };
}

function dispatch(event: ChatRealtimeEvent): void {
  for (const listener of wsListeners) listener(event);
}

/**
 * The access token for the next upgrade. The gateway checks the bearer only at the handshake, so
 * a token past its 15-minute life would fail every reconnect (network change, background, api
 * restart) until some REST call happened to rotate it: rotate first when it is due.
 */
async function socketAccessToken(): Promise<string | null> {
  const tokens = await tokenStore.get();
  if (!tokens || !accessTokenNeedsRefresh(tokens.accessToken, Date.now())) {
    return tokens?.accessToken ?? null;
  }
  try {
    await liveAuth().rotate();
  } catch {
    // Rejected: the store is cleared and the client waits for a sign-in. Transport error: the
    // stored pair stays and the backoff tries again.
  }
  return (await tokenStore.get())?.accessToken ?? null;
}

// Set while the first token read is in flight, so concurrent subscribers never open two sockets.
let socketStarting = false;

function ensureSocket(): void {
  if (socket || socketStarting) return;
  socketStarting = true;
  void (async () => {
    try {
      cachedToken = await socketAccessToken();
    } finally {
      socketStarting = false;
    }
    socket = createChatSocket({
      url: wsUrl(),
      getToken: () => cachedToken,
      rooms: () => [], // server-resolved at the handshake (gateway RoomsForUser)
      onEvent: (event: WsServerEvent) => {
        const mapped = mapEvent(event);
        if (mapped) dispatch(mapped);
      },
      onStateChange: (state) => {
        connectionSink?.(state);
        if (state === "offline") {
          // Rotate (when due) before the backoff timer re-dials, so the upgrade is never refused
          // for an expired token.
          void socketAccessToken().then((token) => {
            cachedToken = token;
          });
        }
      },
      onReconnect: () => {
        for (const listener of reconnectedListeners) listener();
      },
      // React Native's WebSocket takes per-socket headers (the upgrade needs the bearer); the
      // DOM lib types only know the 1-2 arg form, so the constructor goes through a local view.
      makeSocket: (url) => {
        type RnWebSocketCtor = new (
          url: string,
          protocols?: string | null,
          options?: { headers?: Record<string, string> },
        ) => WebSocket;
        const ws = new (WebSocket as unknown as RnWebSocketCtor)(url, undefined, {
          headers: { Authorization: `Bearer ${cachedToken ?? ""}` },
        });
        return ws;
      },
    });
    socket.connect();
  })();
}

/**
 * Delivery ack (grey double ticks) for another member's message: a `message.delivered` frame on
 * the open socket, else the REST twin. Best effort — the next inbox fetch delivers anyway.
 */
export function ackDelivered(groupId: string, messageId: string): void {
  try {
    if (socket) {
      socket.send("message.delivered", { groupId, lastDeliveredMessageId: messageId });
      return;
    }
  } catch {
    // still connecting — fall through to REST
  }
  void liveChat.markChatDelivered(groupId, messageId).catch(() => undefined);
}

/**
 * Typing state frame ("start" | "stop") on the open socket (COM-US-007).
 */
export function sendLiveTyping(groupId: string, state: "start" | "stop"): void {
  try {
    socket?.send("typing", { groupId, state });
  } catch {
    // socket not open or best-effort
  }
}

/**
 * Read ack (blue double ticks) on the open socket for fast real-time receipt delivery.
 */
export function sendLiveRead(groupId: string, messageId: string): void {
  try {
    socket?.send("message.read", { groupId, lastReadMessageId: messageId });
  } catch {
    // socket not open
  }
}

/** Live-mode subscription: fixture listeners keep the bus; this attaches the gateway socket. */
export function subscribeLiveChatEvents(listener: EventListener): () => void {
  wsListeners.add(listener);
  void chatLiveActive().then((live) => {
    if (live) ensureSocket();
  });
  return () => {
    wsListeners.delete(listener);
  };
}

// ─── Media (upload through the api; download URL for the viewer) ─────────────────────────────

type UploadQuery = {
  kind: "image" | "pdf" | "voice" | "doc" | "slides" | "sheet" | "csv";
  fileName?: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

/** Query of `POST /media/upload` for one pick (pure — unit-pinned). */
export function uploadQuery(pick: MediaPick): UploadQuery {
  return {
    kind: pick.kind,
    ...(pick.fileName ? { fileName: pick.fileName } : {}),
    ...(pick.width ? { width: pick.width } : {}),
    ...(pick.height ? { height: pick.height } : {}),
    ...(pick.durationMs ? { durationMs: pick.durationMs } : {}),
  };
}

/** Maps a non-2xx upload answer onto the fixture codes (same table as every other call). */
function uploadFailure(status: number, body: string): ChatFixtureError {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // not JSON — fall through to the status mapping
  }
  if (isProblem(parsed)) {
    return new ChatFixtureError(codeFor(parsed.code, "VALIDATION_FAILED"), problemDetail(parsed));
  }
  return new ChatFixtureError(status >= 500 ? "OFFLINE" : "SEND_FAILED", "upload");
}

/**
 * A device file streams from disk to the api (React Native's Blob cannot be built from bytes).
 * uploadAsync is outside the generated client, so it carries the bearer itself: a token about to
 * expire is rotated first, and a 401 rotates once and retries — the same single flight liveAuth
 * uses.
 */
async function uploadFileToApi(uri: string, query: UploadQuery): Promise<Schemas["MediaAsset"]> {
  const auth = liveAuth();
  const params = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  );
  const url = `${env.EXPO_PUBLIC_API_URL}/api/v1/media/upload?${params.toString()}`;
  const send = async () => {
    const tokens = await tokenStore.get();
    return uploadAsync(url, uri, {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${tokens?.accessToken ?? ""}`,
        "Content-Type": "application/octet-stream",
        "X-Kushol-Client": "mobile",
      },
    });
  };
  const current = await tokenStore.get();
  if (current && accessTokenNeedsRefresh(current.accessToken, Date.now())) await auth.rotate();
  let result = await send();
  if (result.status === 401) {
    await auth.rotate();
    result = await send();
  }
  if (result.status < 200 || result.status >= 300) throw uploadFailure(result.status, result.body);
  return JSON.parse(result.body) as Schemas["MediaAsset"];
}

/** Real upload: the bytes go to the api, which checks the cap, sniffs the magic bytes, streams
 * them to R2 and answers with the confirmed asset. */
export async function uploadMediaLive(pick: MediaPick & { mime?: string }): Promise<ChatMediaRef> {
  if (!pick.uri && !pick.bytes) {
    throw new ChatFixtureError("VALIDATION_FAILED", "real_file_required");
  }
  const query = uploadQuery(pick);
  let asset: Schemas["MediaAsset"];
  if (pick.uri) {
    const uri = pick.uri;
    asset = await uploadFileToApi(uri, query).catch((cause: unknown) => {
      if (cause instanceof ChatFixtureError) throw cause;
      throw new ChatFixtureError("OFFLINE"); // transport failure — the retry paths apply
    });
  } else {
    const bytes = pick.bytes;
    asset = await call(
      () =>
        liveAuth().POST("/api/v1/media/upload", {
          params: { query },
          body: bytes as unknown as string,
          bodySerializer: (body: unknown) =>
            new Blob([body as BlobPart], { type: "application/octet-stream" }),
          headers: { "Content-Type": "application/octet-stream" },
        }),
      "VALIDATION_FAILED",
    );
  }
  return {
    assetId: asset.id,
    kind: asset.kind,
    mime: asset.mime,
    sizeBytes: asset.sizeBytes,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    durationMs: asset.durationMs ?? undefined,
    fileName: asset.fileName ?? pick.fileName,
    status: asset.status,
  };
}

/** Short-lived viewer URL; archived assets rehydrate server-side first (CONFLICT while moving). */
export async function openMediaUrlLive(assetId: string): Promise<string> {
  const result = await call(
    () =>
      liveAuth().POST("/api/v1/media/{assetId}/download-url", { params: { path: { assetId } } }),
    "NOT_FOUND",
  );
  if (result.data.rehydrated) throw new ChatFixtureError("CONFLICT", "recovering");
  return result.data.downloadUrl;
}
