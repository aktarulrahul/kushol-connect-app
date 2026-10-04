// ─── THE STAGE-2 CHAT/REQUESTS SEAM ──────────────────────────────────────────────────────────
// Every chat-group, message, DM and Message Request call in the app imports from this file ONLY.
// When the real api + WS gateway land (05 Stage 4/5), this file is rewritten onto the generated
// client (`@/api/client`) and the WS client (`@/lib/chat/ws-client`) — no call-site changes
// (03 `05-app-tasks.md` §4 precedent).
//
// Types come only from the api's OpenAPI spec (src/api/schema.gen.ts) so the swap is
// type-checked. Mock behaviour is clearly fictional ("ডেমো উচ্চ বিদ্যালয় / Demo High School",
// prompt.txt §12) and driven by a flag switcher + simulated latency for demo and tests.
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];
export type ChatGroup = Schemas["ChatGroup"];
export type ChatGroupKind = Schemas["ChatGroupKind"];
export type ChatMemberRole = Schemas["ChatMemberRole"];
/** Schema kinds + Stage-2 fixture-only `sticker` (OpenAPI gains it in Stage 4). */
export type ChatMessageKind = Schemas["ChatMessageKind"] | "sticker";
export type ChatMessage = Omit<Schemas["ChatMessage"], "kind"> & {
  kind: ChatMessageKind;
  /** Present when `kind === "sticker"` — id into `DEMO_STICKERS`. */
  stickerId?: string;
};
export type ChatMessageSendInput = Omit<Schemas["ChatMessageSendInput"], "kind"> & {
  kind: Schemas["ChatMessageSendInput"]["kind"] | "sticker";
  stickerId?: string;
};
export type MessageRequest = Schemas["MessageRequest"];
export type MessageRequestInput = Schemas["MessageRequestInput"];
export type MessageRequestDecision = Schemas["MessageRequestDecision"]["data"];
export type ChatGroupCreateInput = Schemas["ChatGroupCreateInput"];
export type ChatMediaRef = Schemas["ChatMediaRef"];

import { mediaFixtures } from "@/fixtures/media";
import { ChatFixtureError } from "@/fixtures/chat-error";
import { uuidv4 } from "@/lib/chat/uuid";

export type { ChatFixtureErrorCode } from "@/fixtures/chat-error";
export { ChatFixtureError } from "@/fixtures/chat-error";

/** Large emoji stickers for the Stage-2 picker (no WebP pack yet). */
export const DEMO_STICKERS = [
  { id: "sticker_wave", emoji: "👋" },
  { id: "sticker_ok", emoji: "👍" },
  { id: "sticker_heart", emoji: "❤️" },
  { id: "sticker_laugh", emoji: "😂" },
  { id: "sticker_clap", emoji: "👏" },
  { id: "sticker_pray", emoji: "🙏" },
  { id: "sticker_fire", emoji: "🔥" },
  { id: "sticker_star", emoji: "⭐" },
] as const;
export type DemoStickerId = (typeof DEMO_STICKERS)[number]["id"];

export function stickerEmoji(stickerId: string): string {
  return DEMO_STICKERS.find((s) => s.id === stickerId)?.emoji ?? "⭐";
}

/** Quick reactions offered on long-press (WhatsApp-style row). */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

/** Demo peers used for message-info "seen by" (fictional names already in fixtures). */
export const DEMO_GROUP_MEMBERS: ReadonlyArray<{ userId: string; name: string }> = [
  { userId: "user_demo_karim", name: "করিম আহমেদ" },
  { userId: "user_demo_rahima", name: "মিসেস রহিমা (শিক্ষক)" },
  { userId: "user_demo_student1", name: "ডেমো শিক্ষার্থী" },
];

export type MessageReceipt = {
  userId: string;
  name: string;
  status: "delivered" | "seen";
  at: string;
};

// ─── Flag switcher (demo/testing) ────────────────────────────────────────────────────────────

/**
 * One active scenario at a time. `success` is the golden path; the others force the API-side
 * failure states the screens must survive (COM-US-002…015 negative paths, `01` §7).
 */
export const CHAT_FIXTURE_MODES = [
  "success",
  "offline",
  "send_failed",
  "rate_limited",
  "forbidden",
  "not_verified",
] as const;
export type ChatFixtureMode = (typeof CHAT_FIXTURE_MODES)[number];

const listeners = new Set<(mode: ChatFixtureMode) => void>();
let mode: ChatFixtureMode = "success";

export const chatFixtureFlags = {
  get mode(): ChatFixtureMode {
    return mode;
  },
  set(next: ChatFixtureMode): void {
    mode = next;
    for (const listener of listeners) listener(next);
  },
  reset(): void {
    mode = "success";
  },
  subscribe(listener: (mode: ChatFixtureMode) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Simulated network latency — jittered so loading states are real on device. */
const latency = async (base = 300): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, base + Math.random() * base));
};

function requireOnline(): void {
  if (mode === "offline") throw new ChatFixtureError("OFFLINE");
}

// ─── Demo dataset (fictional, marked — prompt.txt §12) ───────────────────────────────────────

/** The signed-in demo identity — a VERIFIED class teacher: moderator of the section group and
 * publisher of section notices, so every guarded surface is reviewable in one session. */
export const DEMO_ME = {
  userId: "user_demo_teacher",
  name: "ডেমো শিক্ষক",
  schoolId: "school_demo_high",
  schoolName: "ডেমো উচ্চ বিদ্যালয়",
};

const iso = (minutesAgo: number, dayOffset = 0): string =>
  new Date(Date.now() - minutesAgo * 60_000 - dayOffset * 86_400_000).toISOString();

let seq = 0;
const id = (prefix: string): string => `${prefix}_demo_${String(++seq).padStart(3, "0")}`;

type DemoGroup = ChatGroup & { lastReadMessageId: string | null };

const GROUPS: DemoGroup[] = [
  {
    id: "grp_official_10a",
    kind: "official",
    schoolId: DEMO_ME.schoolId,
    sectionId: "sec_10_a_demo_high",
    name: "দশম শ্রেণি · বিজ্ঞান (ডেমো)",
    status: "active",
    myRole: "moderator",
    memberCount: 38,
    unreadCount: 3,
    lastMessagePreview: "মিসেস রহিমা: কেউ খাতা জমা দেয়নি?",
    lastMessageAt: iso(9),
    createdAt: iso(60 * 24 * 40),
    lastReadMessageId: "msg_100",
  },
  {
    id: "grp_official_9b",
    kind: "official",
    schoolId: DEMO_ME.schoolId,
    sectionId: "sec_9_b_demo_high",
    name: "নবম শ্রেণি · বি শাখা (ডেমো)",
    status: "active",
    myRole: "moderator",
    memberCount: 41,
    unreadCount: 0,
    lastMessagePreview: "ডেমো শিক্ষক: আগামীকাল টেস্ট আছে",
    lastMessageAt: iso(180),
    createdAt: iso(60 * 24 * 40),
    lastReadMessageId: "msg_200",
  },
  {
    id: "grp_club_science",
    kind: "custom",
    schoolId: DEMO_ME.schoolId,
    name: "বিজ্ঞান ক্লাব (ডেমো)",
    status: "active",
    myRole: "member",
    memberCount: 12,
    unreadCount: 1,
    lastMessagePreview: "ডেমো শিক্ষার্থী: কোয়ান্টাম নিয়ে আলোচনা?",
    lastMessageAt: iso(45),
    createdAt: iso(60 * 24 * 10),
    lastReadMessageId: "msg_300",
  },
  {
    id: "grp_club_debate",
    kind: "custom",
    schoolId: DEMO_ME.schoolId,
    name: "ডিবেট ক্লাব (ডেমো)",
    status: "pending_approval",
    myRole: "owner",
    memberCount: 1,
    unreadCount: 0,
    createdAt: iso(120),
    lastReadMessageId: null,
  },
  {
    id: "grp_dm_karim",
    kind: "dm",
    status: "active",
    myRole: "member",
    memberCount: 2,
    unreadCount: 2,
    peer: { userId: "user_demo_karim", name: "করিম আহমেদ" },
    lastMessagePreview: "করিম আহমেদ: স্যার, খাতাটা কাল দেব",
    lastMessageAt: iso(30),
    createdAt: iso(60 * 24 * 2),
    lastReadMessageId: "msg_400",
  },
  {
    id: "grp_dm_salma_archived",
    kind: "dm",
    status: "archived",
    myRole: "member",
    memberCount: 2,
    unreadCount: 0,
    peer: { userId: "user_demo_salma", name: "সালমা আক্তার" },
    lastMessagePreview: "সালমা আক্তার: ধন্যবাদ স্যার",
    lastMessageAt: iso(60 * 24 * 14),
    createdAt: iso(60 * 24 * 40),
    lastReadMessageId: "msg_500",
  },
];

type DemoMessage = ChatMessage;

/** Newest last — history pagination walks this array backwards. */
const MESSAGES: DemoMessage[] = [
  {
    id: "msg_101",
    groupId: "grp_official_10a",
    senderId: "user_demo_karim",
    senderName: "করিম আহমেদ",
    kind: "text",
    body: "আসসালামু আলাইকুম স্যার, গতকালের ক্লাস টেস্টের নম্বর কখন দেবেন?",
    clientMsgId: "00000000-0000-4000-8000-000000000101",
    createdAt: iso(600, 1),
  },
  {
    id: "msg_102",
    groupId: "grp_official_10a",
    senderId: DEMO_ME.userId,
    senderName: DEMO_ME.name,
    kind: "text",
    body: "ইনশাআল্লাহ আজ বিকেলে দেব। সবাই খাতা জমা দিয়েছ তো?",
    clientMsgId: "00000000-0000-4000-8000-000000000102",
    createdAt: iso(570, 1),
  },
  {
    id: "msg_103",
    groupId: "grp_official_10a",
    senderId: DEMO_ME.userId,
    senderName: DEMO_ME.name,
    kind: "pdf",
    clientMsgId: "00000000-0000-4000-8000-000000000103",
    media: {
      assetId: "asset_demo_syllabus",
      kind: "pdf",
      mime: "application/pdf",
      sizeBytes: 842_133,
      fileName: "অর্ধবার্ষিক-সিলেবাস.pdf",
      status: "confirmed",
    },
    createdAt: iso(540, 1),
  },
  {
    id: "msg_104",
    groupId: "grp_official_10a",
    senderId: "user_demo_rahima",
    senderName: "মিসেস রহিমা (শিক্ষক)",
    kind: "text",
    body: "এই যে গত সপ্তাহের ল্যাবের ছবি —",
    clientMsgId: "00000000-0000-4000-8000-000000000104",
    replyTo: "msg_102",
    replyPreview: "ইনশাআল্লাহ আজ বিকেলে দেব। সবাই খাতা…",
    createdAt: iso(60 * 5),
  },
  {
    id: "msg_105",
    groupId: "grp_official_10a",
    senderId: "user_demo_rahima",
    senderName: "মিসেস রহিমা (শিক্ষক)",
    kind: "image",
    clientMsgId: "00000000-0000-4000-8000-000000000105",
    media: {
      assetId: "asset_demo_lab",
      kind: "image",
      mime: "image/jpeg",
      sizeBytes: 918_233,
      width: 1080,
      height: 1440,
      fileName: "lab-day.jpg",
      status: "confirmed",
    },
    createdAt: iso(60 * 5 - 2),
  },
  {
    id: "msg_106",
    groupId: "grp_official_10a",
    senderId: "user_demo_karim",
    senderName: "করিম আহমেদ",
    kind: "voice",
    clientMsgId: "00000000-0000-4000-8000-000000000106",
    media: {
      assetId: "asset_demo_voice",
      kind: "voice",
      mime: "audio/mp4",
      sizeBytes: 210_433,
      durationMs: 42_000,
      status: "confirmed",
    },
    createdAt: iso(60 * 2),
  },
  {
    id: "msg_107",
    groupId: "grp_official_10a",
    senderId: "user_demo_karim",
    senderName: "করিম আহমেদ",
    kind: "text",
    body: "এই বার্তাটি প্রেরকে মুছে ফেলেছিল (ডেমো)",
    clientMsgId: "00000000-0000-4000-8000-000000000107",
    deletedAt: iso(90),
    createdAt: iso(95),
  },
  {
    id: "msg_109",
    groupId: "grp_official_10a",
    senderId: DEMO_ME.userId,
    senderName: DEMO_ME.name,
    kind: "sticker",
    stickerId: "sticker_wave",
    clientMsgId: "00000000-0000-4000-8000-000000000109",
    createdAt: iso(12),
  },
  {
    id: "msg_108",
    groupId: "grp_official_10a",
    senderId: "user_demo_rahima",
    senderName: "মিসেস রহিমা (শিক্ষক)",
    kind: "text",
    body: "কেউ খাতা জমা দেয়নি?",
    clientMsgId: "00000000-0000-4000-8000-000000000108",
    createdAt: iso(9),
  },
  {
    id: "msg_201",
    groupId: "grp_official_9b",
    senderId: DEMO_ME.userId,
    senderName: DEMO_ME.name,
    kind: "text",
    body: "আগামীকাল ৪ অধ্যায় থেকে টেস্ট হবে।",
    clientMsgId: "00000000-0000-4000-8000-000000000201",
    createdAt: iso(180),
  },
  {
    id: "msg_301",
    groupId: "grp_club_science",
    senderId: "user_demo_student1",
    senderName: "ডেমো শিক্ষার্থী",
    kind: "text",
    body: "পরের সেশনে কোয়ান্টাম সংখ্যা নিয়ে আলোচনা করব?",
    clientMsgId: "00000000-0000-4000-8000-000000000301",
    createdAt: iso(45),
  },
  {
    id: "msg_401",
    groupId: "grp_dm_karim",
    senderId: "user_demo_karim",
    senderName: "করিম আহমেদ",
    kind: "text",
    body: "স্যার, খাতাটা কাল দেব।",
    clientMsgId: "00000000-0000-4000-8000-000000000401",
    createdAt: iso(30),
  },
  {
    id: "msg_402",
    groupId: "grp_dm_karim",
    senderId: "user_demo_karim",
    senderName: "করিম আহমেদ",
    kind: "text",
    body: "অন্য একটা প্রশ্নও আছে…",
    clientMsgId: "00000000-0000-4000-8000-000000000402",
    createdAt: iso(28),
  },
];

/** Per-group last_read_message_id — drives own-tick state and unread counts. */
const READ_STATE = new Map<string, string | null>(
  GROUPS.map((g) => [g.id, g.lastReadMessageId]),
);

/** Messages this demo client has already reported as read (replay dedupe). */
const reportedRead = new Set<string>();

type DemoRequest = MessageRequest;

const REQUESTS: DemoRequest[] = [
  {
    id: "mreq_in_1",
    fromUser: { userId: "user_demo_rahat", name: "রাহাত হোসেন", schoolName: "নমুনা মডেল স্কুল" },
    toUser: { userId: DEMO_ME.userId, name: DEMO_ME.name },
    status: "pending",
    createdAt: iso(240),
    expiresAt: iso(-60 * 24 * 7 + 240),
  },
  {
    id: "mreq_in_2",
    fromUser: { userId: "user_demo_nusrat", name: "নুসরাত জাহান", schoolName: "ডেমো কলেজ" },
    toUser: { userId: DEMO_ME.userId, name: DEMO_ME.name },
    status: "pending",
    createdAt: iso(90),
    expiresAt: iso(-60 * 24 * 7 + 90),
  },
  {
    id: "mreq_out_1",
    fromUser: { userId: DEMO_ME.userId, name: DEMO_ME.name },
    toUser: { userId: "user_demo_tutor", name: "ডেমো টিউটর", schoolName: "ডেমো পাবলিক স্কুল" },
    status: "pending",
    createdAt: iso(400),
    expiresAt: iso(-60 * 24 * 7 + 400),
  },
  {
    id: "mreq_out_2",
    fromUser: { userId: DEMO_ME.userId, name: DEMO_ME.name },
    toUser: { userId: "user_demo_brand", name: "ডেমো ব্র্যান্ড ম্যানেজার", schoolName: "নমুনা মডেল স্কুল" },
    status: "declined",
    createdAt: iso(60 * 30),
    decidedAt: iso(60 * 26),
    expiresAt: iso(-60 * 24 * 7 + 60 * 30),
  },
];

// ─── WS event contract (mirrors 05 `03-backend-tasks.md` §2 — the app parses the same shapes) ─

export type ChatRealtimeEvent =
  | { type: "message.new"; message: ChatMessage }
  | { type: "message.ack"; clientMsgId: string; id: string; createdAt: string }
  | { type: "message.read"; groupId: string; userId: string; lastReadMessageId: string }
  | { type: "message.deleted"; groupId: string; id: string; deletedAt: string }
  | { type: "typing"; groupId: string; userId: string; state: "start" | "stop" }
  | { type: "presence.update"; groupId: string; userId: string; online: boolean };

type EventListener = (event: ChatRealtimeEvent) => void;

const eventListeners = new Set<EventListener>();

/** Emits one realtime event to every subscriber (the fixture's room fan-out). */
function emit(event: ChatRealtimeEvent): void {
  for (const listener of eventListeners) listener(event);
}

/** Subscribe to the fixture's realtime events; returns the unsubscribe fn. */
export function subscribeChatEvents(listener: EventListener): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

// ─── Group + message fixtures (typed from the spec) ──────────────────────────────────────────

/** GET /chat/groups — my groups, last activity first. */
export async function listChatGroups(): Promise<ChatGroup[]> {
  await latency(250);
  requireOnline();
  return GROUPS.map((g) => ({
    ...g,
    unreadCount:
      mode === "not_verified"
        ? 0
        : countUnread(g),
  }));
}

function countUnread(group: DemoGroup): number {
  if (group.status === "pending_approval") return 0;
  const msgs = MESSAGES.filter((m) => m.groupId === group.id && !m.deletedAt);
  const lastRead = READ_STATE.get(group.id);
  if (!lastRead) return Math.min(msgs.length, group.unreadCount || msgs.length);
  const idx = msgs.findIndex((m) => m.id === lastRead);
  if (idx === -1) return group.unreadCount;
  return msgs.length - 1 - idx;
}

/** GET /chat/groups/{id}/messages — 50/page, `before` cursor, newest-first page. */
export async function listChatMessages(
  groupId: string,
  before?: string,
  limit = 50,
): Promise<{ data: ChatMessage[]; nextBefore?: string }> {
  await latency(280);
  requireOnline();
  assertMember(groupId);
  const all = MESSAGES.filter((m) => m.groupId === groupId);
  // Server order is newest-first per page; the app reverses for an inverted list.
  const cutoff = before ? all.findIndex((m) => m.id === before) : all.length;
  const start = cutoff === -1 ? 0 : Math.max(0, cutoff - limit);
  const page = all.slice(start, cutoff === -1 ? 0 : cutoff).slice(-limit);
  const nextBefore = start > 0 ? (page[0]?.id ?? undefined) : undefined;
  return { data: [...page].reverse().map((m) => ({ ...m })), nextBefore };
}

function assertMember(groupId: string): void {
  if (mode === "forbidden" && groupId === "grp_official_9b") {
    throw new ChatFixtureError("FORBIDDEN");
  }
  if (!GROUPS.some((g) => g.id === groupId)) throw new ChatFixtureError("NOT_FOUND");
}

/**
 * POST /chat/messages (same service path as WS `message.send`) — idempotent by `clientMsgId`
 * (BR-008): a replay returns the original row. Emits `message.ack` + `message.new` like the
 * gateway would, then a demo peer reply so the room feels alive.
 */
export async function sendChatMessage(input: ChatMessageSendInput): Promise<ChatMessage> {
  await latency(220);
  requireOnline();
  assertMember(input.groupId);
  const group = GROUPS.find((g) => g.id === input.groupId);
  if (!group) throw new ChatFixtureError("NOT_FOUND");
  if (group.status === "archived" || group.status === "pending_approval") {
    throw new ChatFixtureError("CONFLICT");
  }
  if (input.kind === "text" && (!input.body || !input.body.trim())) {
    throw new ChatFixtureError("VALIDATION_FAILED");
  }
  if (input.kind === "sticker" && !input.stickerId) {
    throw new ChatFixtureError("VALIDATION_FAILED");
  }
  if (input.kind !== "text" && input.kind !== "sticker" && !input.mediaAssetId) {
    throw new ChatFixtureError("VALIDATION_FAILED");
  }
  if (mode === "not_verified") throw new ChatFixtureError("NOT_VERIFIED");
  if (mode === "rate_limited") throw new ChatFixtureError("RATE_LIMITED");

  const existing = MESSAGES.find(
    (m) => m.senderId === DEMO_ME.userId && m.clientMsgId === input.clientMsgId,
  );
  if (existing) return { ...existing }; // replay — no duplicate (INV-3)

  if (mode === "send_failed") throw new ChatFixtureError("SEND_FAILED");

  const media = input.mediaAssetId ? mediaFixtures.confirmedRef(input.mediaAssetId) : undefined;
  const replied = input.replyTo ? MESSAGES.find((m) => m.id === input.replyTo) : undefined;
  const message: ChatMessage = {
    id: id("msg"),
    groupId: input.groupId,
    senderId: DEMO_ME.userId,
    senderName: DEMO_ME.name,
    kind: input.kind,
    ...(input.kind === "text" ? { body: input.body } : {}),
    ...(input.kind === "sticker" && input.stickerId ? { stickerId: input.stickerId } : {}),
    ...(media ? { media } : {}),
    clientMsgId: input.clientMsgId,
    ...(input.replyTo ? { replyTo: input.replyTo, replyPreview: preview(replied) } : {}),
    createdAt: new Date().toISOString(),
  };
  MESSAGES.push(message);
  group.lastMessagePreview = previewFor(message);
  group.lastMessageAt = message.createdAt;

  emit({ type: "message.ack", clientMsgId: input.clientMsgId, id: message.id, createdAt: message.createdAt });
  emit({ type: "message.new", message: { ...message } });
  simulatePeerReply(group.id);
  return { ...message };
}

function preview(m?: ChatMessage | null): string {
  if (!m) return "";
  if (m.deletedAt) return "";
  switch (m.kind) {
    case "image": return "🖼";
    case "pdf": return m.media?.fileName ?? "📄";
    case "voice": return "🎤";
    case "sticker": return stickerEmoji(m.stickerId ?? "");
    default: return m.body ?? "";
  }
}

/**
 * Message info (WhatsApp seen-by) — fixture peers only. Own messages show delivered/seen rows
 * from the demo section roster; incoming messages return an empty list (info is sender-side).
 */
export function listMessageSeenBy(messageId: string): MessageReceipt[] {
  const message = MESSAGES.find((m) => m.id === messageId);
  if (!message || message.senderId !== DEMO_ME.userId) return [];
  const peers =
    message.groupId === "grp_dm_karim"
      ? DEMO_GROUP_MEMBERS.filter((p) => p.userId === "user_demo_karim")
      : DEMO_GROUP_MEMBERS;
  const ageMs = Date.now() - new Date(message.createdAt).getTime();
  return peers.map((peer, i) => {
    const seen = ageMs > 60_000 || i === 0;
    return {
      ...peer,
      status: seen ? ("seen" as const) : ("delivered" as const),
      at: new Date(Date.now() - Math.max(5_000, ageMs - i * 20_000)).toISOString(),
    };
  });
}

function previewFor(m: ChatMessage): string {
  const p = preview(m);
  return m.senderId === DEMO_ME.userId ? p : `${m.senderName}: ${p}`;
}

/** Demo life: a peer replies + types, so typing indicator and arrival states are reviewable. */
function simulatePeerReply(groupId: string): void {
  const peers: Record<string, { userId: string; name: string }> = {
    grp_official_10a: { userId: "user_demo_karim", name: "করিম আহমেদ" },
    grp_dm_karim: { userId: "user_demo_karim", name: "করিম আহমেদ" },
    grp_club_science: { userId: "user_demo_student1", name: "ডেমো শিক্ষার্থী" },
  };
  const peer = peers[groupId];
  if (!peer) return;
  setTimeout(() => { emit({ type: "typing", groupId, userId: peer.userId, state: "start" }); }, 900);
  setTimeout(() => { emit({ type: "typing", groupId, userId: peer.userId, state: "stop" }); }, 3_800);
  setTimeout(() => {
    const message: ChatMessage = {
      id: id("msg"),
      groupId,
      senderId: peer.userId,
      senderName: peer.name,
      kind: "text",
      body: groupId === "grp_dm_karim" ? "ঠিক আছে স্যার, ধন্যবাদ।" : "জি স্যার, বুঝেছি।",
      clientMsgId: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    MESSAGES.push(message);
    const group = GROUPS.find((g) => g.id === groupId);
    if (group) {
      group.lastMessagePreview = previewFor(message);
      group.lastMessageAt = message.createdAt;
    }
    emit({ type: "message.new", message: { ...message } });
  }, 4_500);
}

/** PATCH /chat/groups/{id}/read — idempotent read report; WS `message.read` fans out. */
export async function markChatRead(groupId: string, lastReadMessageId: string): Promise<void> {
  await Promise.resolve();
  requireOnline();
  assertMember(groupId);
  if (reportedRead.has(lastReadMessageId)) return;
  reportedRead.add(lastReadMessageId);
  READ_STATE.set(groupId, lastReadMessageId);
  emit({ type: "message.read", groupId, userId: DEMO_ME.userId, lastReadMessageId });
}

/**
 * DELETE /chat/messages/{id} — tombstone (BR-007): the demo identity is the section moderator,
 * so any message deletes; a non-moderator attempt outside the window would be CONFLICT.
 */
export async function deleteChatMessage(messageId: string): Promise<{ id: string; deletedAt: string }> {
  await latency(200);
  requireOnline();
  assertMemberOfMessage(messageId);
  const message = MESSAGES.find((m) => m.id === messageId);
  if (!message) throw new ChatFixtureError("NOT_FOUND");
  if (message.deletedAt) return { id: message.id, deletedAt: message.deletedAt };
  const author = message.senderId === DEMO_ME.userId;
  const withinWindow = Date.now() - new Date(message.createdAt).getTime() < 15 * 60_000;
  const moderator = message.groupId === "grp_official_10a" || message.groupId === "grp_official_9b";
  if (!author && !(moderator && withinWindow)) {
    // Authors have 15 minutes; moderators anytime — outside both, the api refuses.
    if (!moderator) throw new ChatFixtureError("FORBIDDEN");
    throw new ChatFixtureError("CONFLICT");
  }
  message.deletedAt = new Date().toISOString();
  emit({ type: "message.deleted", groupId: message.groupId, id: message.id, deletedAt: message.deletedAt });
  return { id: message.id, deletedAt: message.deletedAt };
}

function assertMemberOfMessage(messageId: string): void {
  const message = MESSAGES.find((m) => m.id === messageId);
  if (!message) throw new ChatFixtureError("NOT_FOUND");
  assertMember(message.groupId);
}

// ─── DM + Message Request fixtures (BR-004) ──────────────────────────────────────────────────

/** Peers reachable for DM demos. `sameSchool` peers open instantly; others need a request. */
export const DM_PEERS = [
  { userId: "user_demo_karim", name: "করিম আহমেদ", sameSchool: true, hasRoom: true },
  { userId: "user_demo_rina", name: "রিনা আক্তার", sameSchool: true, hasRoom: false },
  { userId: "user_demo_rahat", name: "রাহাত হোসেন", sameSchool: false, hasRoom: false },
] as const;

/** GET /chat/dm/{peerId} — same-school instant; cross-school needs an accepted request. */
export async function openDm(peerId: string): Promise<ChatGroup> {
  await latency(220);
  requireOnline();
  const existing = REQUESTS.find(
    (r) =>
      r.status === "accepted" &&
      (r.fromUser.userId === peerId || r.toUser.userId === peerId),
  );
  if (existing?.dmGroupId) {
    const room = GROUPS.find((g) => g.id === existing.dmGroupId);
    if (room) return { ...room };
  }
  const peer = DM_PEERS.find((p) => p.userId === peerId);
  if (!peer) throw new ChatFixtureError("NOT_FOUND");
  const room = GROUPS.find(
    (g) => g.kind === "dm" && g.peer?.userId === peerId,
  );
  if (room) return { ...room }; // idempotent open (US-008)
  if (!peer.sameSchool) {
    throw new ChatFixtureError("NOT_FOUND", "message_request_hint");
  }
  const created: DemoGroup = {
    id: id("grp_dm"),
    kind: "dm",
    status: "active",
    myRole: "member",
    memberCount: 2,
    unreadCount: 0,
    peer: { userId: peer.userId, name: peer.name },
    createdAt: new Date().toISOString(),
    lastReadMessageId: null,
  };
  GROUPS.push(created);
  return { ...created };
}

/** GET /chat/message-requests — inbox (received) + sent. */
export async function listMessageRequests(): Promise<MessageRequestPage> {
  await latency(250);
  requireOnline();
  return {
    received: REQUESTS.filter((r) => r.toUser.userId === DEMO_ME.userId).map((r) => ({ ...r })),
    sent: REQUESTS.filter((r) => r.fromUser.userId === DEMO_ME.userId).map((r) => ({ ...r })),
  };
}

export type MessageRequestPage = { received: MessageRequest[]; sent: MessageRequest[] };

/** POST /chat/message-requests — no self, no dup-pending (CONFLICT), rate-limited retries. */
export async function createMessageRequest(input: MessageRequestInput): Promise<MessageRequest> {
  await latency(300);
  requireOnline();
  if (mode === "rate_limited") throw new ChatFixtureError("RATE_LIMITED");
  if (input.toUserId === DEMO_ME.userId) throw new ChatFixtureError("VALIDATION_FAILED");
  const peer = DM_PEERS.find((p) => p.userId === input.toUserId);
  if (!peer) throw new ChatFixtureError("NOT_FOUND");
  const dup = REQUESTS.find(
    (r) =>
      r.fromUser.userId === DEMO_ME.userId &&
      r.toUser.userId === input.toUserId &&
      r.status === "pending",
  );
  if (dup) throw new ChatFixtureError("CONFLICT");
  const request: DemoRequest = {
    id: id("mreq"),
    fromUser: { userId: DEMO_ME.userId, name: DEMO_ME.name, schoolName: DEMO_ME.schoolName },
    toUser: { userId: peer.userId, name: peer.name, schoolName: peer.sameSchool ? DEMO_ME.schoolName : "নমুনা মডেল স্কুল" },
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  };
  REQUESTS.push(request);
  return { ...request };
}

/** POST /chat/message-requests/{id}/accept — recipient only; creates + links the DM room. */
export async function acceptMessageRequest(requestId: string): Promise<MessageRequestDecision> {
  await latency(260);
  requireOnline();
  const request = REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new ChatFixtureError("NOT_FOUND");
  if (request.status !== "pending") throw new ChatFixtureError("CONFLICT");
  let room = GROUPS.find(
    (g) =>
      g.kind === "dm" &&
      ((g.peer?.userId === request.fromUser.userId) || g.id === request.dmGroupId),
  );
  if (!room) {
    room = {
      id: id("grp_dm"),
      kind: "dm",
      status: "active",
      myRole: "member",
      memberCount: 2,
      unreadCount: 0,
      peer: {
        userId: request.fromUser.userId,
        name: request.fromUser.name,
      },
      createdAt: new Date().toISOString(),
      lastReadMessageId: null,
    };
    GROUPS.push(room);
  }
  request.status = "accepted";
  request.decidedAt = new Date().toISOString();
  request.dmGroupId = room.id;
  return { id: request.id, status: request.status, dmGroupId: room.id };
}

/** POST /chat/message-requests/{id}/decline — the sender stays politely blocked. */
export async function declineMessageRequest(requestId: string): Promise<MessageRequestDecision> {
  await latency(260);
  requireOnline();
  const request = REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new ChatFixtureError("NOT_FOUND");
  if (request.status !== "pending") throw new ChatFixtureError("CONFLICT");
  request.status = "declined";
  request.decidedAt = new Date().toISOString();
  return { id: request.id, status: request.status };
}

// ─── Custom club fixtures (BR-010, OQ-2 default: approval required) ──────────────────────────

/** POST /chat/groups — verified users only; lands `pending_approval`, creator is owner. */
export async function createChatGroup(input: ChatGroupCreateInput): Promise<ChatGroup> {
  await latency(400);
  requireOnline();
  const name = input.name.trim();
  if (name.length < 3 || name.length > 60) throw new ChatFixtureError("VALIDATION_FAILED");
  const clash = GROUPS.some(
    (g) => g.kind === "custom" && g.status === "active" && g.name === name,
  );
  if (clash) throw new ChatFixtureError("CONFLICT");
  const group: DemoGroup = {
    id: id("grp_club"),
    kind: "custom",
    schoolId: DEMO_ME.schoolId,
    name,
    status: "pending_approval",
    myRole: "owner",
    memberCount: 1,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    lastReadMessageId: null,
  };
  GROUPS.push(group);
  return { ...group };
}

// ─── Reset (tests) ────────────────────────────────────────────────────────────────────────────

/** Clears mutable seam state (tests only). */
export function resetChatFixtures(): void {
  chatFixtureFlags.reset();
  eventListeners.clear();
  reportedRead.clear();
  mediaFixtures.reset();
}

// mediaFixtures lives in `@/fixtures/media` — do not re-export from here (breaks chat↔media cycle).
