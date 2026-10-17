// Live chat backend (05 Stage 5): the `@/fixtures/chat` seam delegates here when the session is
// live (real access token — fixtures keep serving demo sessions and tests). REST runs through the
// generated client via `liveAuth()` (bearer + single-flight 401 rotate); realtime through the
// plain WS gateway (`ws-client`) — the server subscribes every room at connect. Every error maps
// onto the shared fixture codes so screens keep their exact states. Attachments stream from the
// device file straight to the presigned Cloudflare R2 URL (owner 2026-10-17).
import { FileSystemUploadType, getInfoAsync, uploadAsync } from "expo-file-system/legacy";

import { isProblem, type Schemas } from "@/api/client";
import { platformFetch } from "@/api/platform-fetch";
import { env } from "@/env";
import { isFixtureAccessToken } from "@/lib/auth/session-restore";
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
  MessageInfo,
  MessageReceipt,
  MessageRequest,
  MessageRequestDecision,
  MessageRequestInput,
} from "@/fixtures/chat";
import type { ChatMediaRef } from "@/fixtures/media";
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
  // Stickers are a Stage-2 UI affordance the spec does not carry (G-7) — live sends the emoji
  // as text so the picker keeps working without an OpenAPI change.
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
    // Polls are composed on the web console; the app seam cannot carry the payload.
    throw new ChatFixtureError("VALIDATION_FAILED", "polls are composed on the web console");
  }
  return {
    groupId: input.groupId,
    kind: input.kind,
    ...(input.body ? { body: input.body } : {}),
    ...(input.mediaAssetId ? { mediaAssetId: input.mediaAssetId } : {}),
    clientMsgId: input.clientMsgId,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
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

  /** G-7 (`TODO: Confirm`): no OpenAPI path — the action stays disabled in live sessions. */
  async editChatMessage(messageId: string, body: string): Promise<ChatMessage> {
    const res = await liveAuth().PATCH("/api/v1/chat/messages/{messageId}", {
      params: { path: { messageId } },
      body: { body },
    });
    return res.data as unknown as ChatMessage;
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

  /** WhatsApp reaction toggle (server-side; the bubble renders the returned aggregate). */
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
function normalizeMessage(m: Record<string, unknown>): ChatMessage {
  const media =
    typeof m.media === "object" && m.media !== null ? (m.media as ChatMessage["media"]) : undefined;
  return {
    id: str(m.id),
    groupId: str(m.groupId),
    senderId: str(m.senderId),
    senderName: str(m.senderName),
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

function ensureSocket(): void {
  if (socket) return;
  void (async () => {
    const tokens = await tokenStore.get();
    cachedToken = tokens?.accessToken ?? null;
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
          // Refresh before the backoff timer re-dials so a rotated token is used.
          void tokenStore.get().then((t) => {
            cachedToken = t?.accessToken ?? null;
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

// ─── Media (presign → client PUT → confirm; download URL for the viewer) ─────────────────────

/** PUT one file to the presigned R2 URL: a device file streams from disk (React Native's Blob
 * cannot be built from bytes); raw bytes (tests) go through fetch. */
async function putToR2(url: string, pick: MediaPick, mime: string): Promise<boolean> {
  if (pick.uri) {
    const result = await uploadAsync(url, pick.uri, {
      httpMethod: "PUT",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": mime },
    });
    return result.status >= 200 && result.status < 300;
  }
  if (!pick.bytes) return false;
  const blob = new Blob([pick.bytes as BlobPart], { type: mime });
  const put = await platformFetch(
    new Request(url, { method: "PUT", body: blob, headers: { "Content-Type": mime } }),
  );
  return put.ok;
}

/** Real upload flow: presign → PUT (file URI or bytes) → confirm (the server sniff decides). */
export async function uploadMediaLive(pick: MediaPick & { mime?: string }): Promise<ChatMediaRef> {
  if (!pick.uri && !pick.bytes) {
    throw new ChatFixtureError("VALIDATION_FAILED", "real_file_required");
  }
  const client = liveAuth();
  const mime = pick.mime ?? "application/octet-stream";
  // Pickers/recorders do not always report a size — measure the file the PUT will stream.
  let sizeBytes = pick.sizeBytes;
  if (pick.uri) {
    const info = await getInfoAsync(pick.uri).catch(() => null);
    if (info?.exists && info.size > 0) sizeBytes = info.size;
  }
  const presign = await call(
    () =>
      client.POST("/api/v1/media/upload-url", {
        body: {
          kind: pick.kind,
          sizeBytes,
          mime,
          ...(pick.fileName ? { fileName: pick.fileName } : {}),
        },
      }),
    "VALIDATION_FAILED",
  );

  const uploaded = await putToR2(presign.data.uploadUrl, pick, mime).catch(() => false);
  if (!uploaded) throw new ChatFixtureError("SEND_FAILED", "upload_put");

  const asset = await call(
    () =>
      client.POST("/api/v1/media/{assetId}/confirm", {
        params: { path: { assetId: presign.data.assetId } },
        body: {
          ...(pick.width ? { width: pick.width } : {}),
          ...(pick.height ? { height: pick.height } : {}),
          ...(pick.durationMs ? { durationMs: pick.durationMs } : {}),
        },
      }),
    "VALIDATION_FAILED",
  );
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
