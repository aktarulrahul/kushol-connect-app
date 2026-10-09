// Message helpers for the conversation screen (COM-AP-003/004): ordering, day breaks, the
// "N new unread" marker and emoji-only bubbles (Spartens channel parity — owner 2026-10-09).
import type { ChatMessage } from "@/fixtures/chat";

/** Oldest → newest, whatever order the page arrived in (history is newest-first, realtime
 * appends at the end). Ties break on id so the order is stable. */
export function sortMessagesAsc(messages: readonly ChatMessage[]): ChatMessage[] {
  return [...messages].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
  );
}

export function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/**
 * The message the "N new unread messages" pill sits above: the first of the last `unreadCount`
 * messages from other people, captured when the room opened (later arrivals don't move it).
 */
export function firstUnreadId(
  messages: readonly ChatMessage[],
  unreadCount: number,
  myUserId: string,
): string | null {
  if (unreadCount <= 0) return null;
  const incoming = messages.filter((m) => m.senderId !== myUserId && !m.deletedAt);
  return incoming[Math.max(0, incoming.length - unreadCount)]?.id ?? null;
}

// Emoji units by UTF-16 range (no `\p{…}` escapes: not every Hermes build parses them): a flag
// (two regional indicators), BMP symbols (☀ ❤ ⭐ …) and astral pictographs (😀 👍 🔥 …).
const EMOJI_UNIT =
  /(?:\uD83C[\uDDE6-\uDDFF]){2}|[\u2300-\u23FF\u2600-\u27BF\u2B00-\u2BFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]/g;
// Joiners and modifiers that glue units into one glyph (ZWJ, variation selector, keycap).
const EMOJI_GLUE = /\u200d|\ufe0f|\u20e3|\s/g;

/** 1–3 emoji and nothing else → rendered large without a bubble (Spartens `isEmojiOnly`). */
export function isEmojiOnly(text: string | undefined): boolean {
  const value = text?.trim() ?? "";
  if (!value) return false;
  const units = value.match(EMOJI_UNIT)?.length ?? 0;
  const rest = value.replace(EMOJI_UNIT, "").replace(EMOJI_GLUE, "");
  return units > 0 && units <= 3 && rest === "";
}

/** One-line preview of a message for reply quotes and the pinned bar. */
export function messagePreview(
  message: ChatMessage,
  labels: { image: string; pdf: string; voice: string; sticker: string },
): string {
  switch (message.kind) {
    case "image":
      return message.body?.trim() || labels.image;
    case "pdf":
      return message.media?.fileName ?? labels.pdf;
    case "voice":
      return labels.voice;
    case "sticker":
      return labels.sticker;
    default:
      return message.body ?? "";
  }
}
