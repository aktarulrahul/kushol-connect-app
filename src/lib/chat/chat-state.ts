// Chat client state (COM-AP-002/004/011/017): typing, connection, offline queue, optimistic sends,
// reactions, and DM presence. Memory-only in Stage 2 (05 `05-app-tasks.md` §4).
import { create } from "zustand";

import type { ChatMessageSendInput } from "@/fixtures/chat";
import { DEMO_ME } from "@/fixtures/chat";

/** One optimistic send — the temp bubble's source of truth until the ack swaps it out. */
export type OutgoingMessage = {
  clientMsgId: string;
  groupId: string;
  input: Omit<ChatMessageSendInput, "clientMsgId" | "groupId">;
  /** SENDING (clock) → SENT (✓) → SEEN (✓✓) · FAILED (red, tap-to-retry) · QUEUED (offline). */
  state: "sending" | "sent" | "seen" | "failed" | "queued";
  /** When the input text/media must survive a failed send (US-002: input never lost). */
  errorAt?: string;
};

export type ConnectionState = "connecting" | "online" | "offline";

/** messageId → emoji → userIds who reacted. */
export type ReactionMap = Record<string, Record<string, string[]>>;

type ChatState = {
  /** groupId → { userId → last "start" timestamp } — UI drops entries after 4 s. */
  typing: Record<string, Record<string, number>>;
  connection: ConnectionState;
  /** Per-group FIFO offline queue (US-015: replayed in order on reconnect). */
  queue: OutgoingMessage[];
  /** Live optimistic sends (not yet acked or failed). */
  outgoing: OutgoingMessage[];
  /** groupId → the last message id this device has marked read (read-receipt replay dedupe). */
  pendingReads: Record<string, string>;
  /** Fixture-backed reactions (Stage-2; server reactions land Stage 5). */
  reactions: ReactionMap;
  /** userId → online for DM presence dots. */
  presence: Record<string, boolean>;
  /** groupId → unsent composer text; the chat list shows it as "Draft: …" (Spartens). */
  drafts: Record<string, string>;
  /** Chats pinned to the top of the list, most recent pin first (max MAX_PINNED_CHATS). */
  pinnedChats: string[];
  /** groupId → per-chat notification level; absent = "all". */
  chatNotify: Record<string, ChatNotifyLevel>;

  setConnection: (state: ConnectionState) => void;
  markTyping: (groupId: string, userId: string, state: "start" | "stop") => void;
  sweepTyping: () => void;
  trackSend: (message: OutgoingMessage) => void;
  setSendState: (clientMsgId: string, state: OutgoingMessage["state"]) => void;
  dropSend: (clientMsgId: string) => void;
  enqueue: (message: OutgoingMessage) => void;
  dequeueAll: (groupId?: string) => OutgoingMessage[];
  trackRead: (groupId: string, lastReadMessageId: string) => void;
  clearReads: (groupId: string) => void;
  toggleReaction: (messageId: string, emoji: string, userId?: string) => void;
  setPresence: (userId: string, online: boolean) => void;
  setDraft: (groupId: string, text: string) => void;
  /** false when pinning would exceed MAX_PINNED_CHATS (nothing changes). */
  togglePinChat: (groupId: string) => boolean;
  setChatNotify: (groupId: string, level: ChatNotifyLevel) => void;
};

/** Per-chat notification level — memory-only like reactions until the 06 preferences contract
 * carries it (05 `08-gaps.md` G-7). */
export type ChatNotifyLevel = "all" | "none";

/** Spartens rule: up to five pinned chats. */
export const MAX_PINNED_CHATS = 5;

const TYPING_TTL_MS = 4_000;

export const useChatState = create<ChatState>((set, get) => ({
  typing: {},
  connection: "connecting",
  queue: [],
  outgoing: [],
  pendingReads: {},
  reactions: {
    // Seeded demo reactions on fixture messages (fictional peers).
    msg_104: { "👍": ["user_demo_karim"], "❤️": [DEMO_ME.userId] },
    msg_102: { "😂": ["user_demo_rahima"] },
  },
  presence: {
    user_demo_karim: true,
  },
  drafts: {},
  pinnedChats: [],
  chatNotify: {},

  setConnection: (connection) => {
    set({ connection });
  },

  markTyping: (groupId, userId, state) => {
    set((s) => {
      const group = { ...(s.typing[groupId] ?? {}) };
      if (state === "start") group[userId] = Date.now();
      else {
        const rest: Record<string, number> = {};
        for (const [key, at] of Object.entries(group)) {
          if (key !== userId) rest[key] = at;
        }
        return { typing: { ...s.typing, [groupId]: rest } };
      }
      return { typing: { ...s.typing, [groupId]: group } };
    });
  },

  sweepTyping: () => {
    set((s) => {
      const now = Date.now();
      let changed = false;
      const typing: ChatState["typing"] = {};
      for (const [groupId, users] of Object.entries(s.typing)) {
        const kept: Record<string, number> = {};
        for (const [userId, at] of Object.entries(users)) {
          if (now - at < TYPING_TTL_MS) kept[userId] = at;
          else changed = true;
        }
        if (Object.keys(kept).length > 0) typing[groupId] = kept;
      }
      return changed ? { typing } : s;
    });
  },

  trackSend: (message) => {
    set((s) => ({ outgoing: [...s.outgoing, message] }));
  },

  setSendState: (clientMsgId, state) => {
    set((s) => ({
      outgoing: s.outgoing.map((m) =>
        m.clientMsgId === clientMsgId
          ? { ...m, state, errorAt: state === "failed" ? new Date().toISOString() : m.errorAt }
          : m,
      ),
      queue: s.queue.map((m) => (m.clientMsgId === clientMsgId ? { ...m, state } : m)),
    }));
  },

  dropSend: (clientMsgId) => {
    set((s) => ({
      outgoing: s.outgoing.filter((m) => m.clientMsgId !== clientMsgId),
      queue: s.queue.filter((m) => m.clientMsgId !== clientMsgId),
    }));
  },

  enqueue: (message) => {
    set((s) => ({ queue: [...s.queue, message] }));
  },

  dequeueAll: (groupId) => {
    const all = get().queue;
    const rest = groupId ? all.filter((m) => m.groupId !== groupId) : [];
    set({ queue: rest });
    return groupId ? all.filter((m) => m.groupId === groupId) : all;
  },

  trackRead: (groupId, lastReadMessageId) => {
    set((s) => ({ pendingReads: { ...s.pendingReads, [groupId]: lastReadMessageId } }));
  },

  clearReads: (groupId) => {
    set((s) => {
      const pendingReads: ChatState["pendingReads"] = {};
      for (const [key, value] of Object.entries(s.pendingReads)) {
        if (key !== groupId) pendingReads[key] = value;
      }
      return { pendingReads };
    });
  },

  toggleReaction: (messageId, emoji, userId = DEMO_ME.userId) => {
    set((s) => {
      const current = s.reactions[messageId] ?? {};
      const users = current[emoji] ?? [];
      const nextUsers = users.includes(userId)
        ? users.filter((u) => u !== userId)
        : [...users, userId];
      const byEmoji = Object.fromEntries(
        Object.entries({ ...current, [emoji]: nextUsers }).filter(([, list]) => list.length > 0),
      );
      const others = Object.entries(s.reactions).filter(([key]) => key !== messageId);
      return {
        reactions: Object.fromEntries(
          Object.keys(byEmoji).length > 0 ? [...others, [messageId, byEmoji]] : others,
        ),
      };
    });
  },

  setPresence: (userId, online) => {
    set((s) => ({ presence: { ...s.presence, [userId]: online } }));
  },

  setDraft: (groupId, text) => {
    set((s) => {
      if ((s.drafts[groupId] ?? "") === text) return s;
      const others = Object.entries(s.drafts).filter(([key]) => key !== groupId);
      return { drafts: Object.fromEntries(text ? [...others, [groupId, text]] : others) };
    });
  },

  togglePinChat: (groupId) => {
    const pinned = get().pinnedChats;
    if (pinned.includes(groupId)) {
      set({ pinnedChats: pinned.filter((id) => id !== groupId) });
      return true;
    }
    if (pinned.length >= MAX_PINNED_CHATS) return false;
    set({ pinnedChats: [groupId, ...pinned] });
    return true;
  },

  setChatNotify: (groupId, level) => {
    set((s) => ({ chatNotify: { ...s.chatNotify, [groupId]: level } }));
  },
}));

/** Stable empty map for selectors that default missing `typing[groupId]` (avoid new `{}` each read). */
export const EMPTY_TYPING: Record<string, number> = {};

/** Stable empty reaction bag (same getSnapshot caching rule as EMPTY_TYPING). */
export const EMPTY_REACTIONS: Record<string, string[]> = {};

/** Typing participants still inside the 4 s TTL for a group (COM-US-007). */
export function typingUsersIn(
  typing: ChatState["typing"],
  groupId: string,
  now = Date.now(),
): string[] {
  const users = typing[groupId] ?? EMPTY_TYPING;
  return Object.entries(users)
    .filter(([, at]) => now - at < TYPING_TTL_MS)
    .map(([userId]) => userId);
}

/** Flatten reaction map into chips for a bubble. */
export function reactionChips(
  reactions: ReactionMap,
  messageId: string,
): { emoji: string; count: number; mine: boolean }[] {
  const bag = reactions[messageId] ?? EMPTY_REACTIONS;
  return Object.entries(bag)
    .filter(([, users]) => users.length > 0)
    .map(([emoji, users]) => ({
      emoji,
      count: users.length,
      mine: users.includes(DEMO_ME.userId),
    }));
}
