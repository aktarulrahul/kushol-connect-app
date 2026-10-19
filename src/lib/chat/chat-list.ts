// Chat list filtering (COM-AP-001, Spartens chat list parity — owner 2026-10-09): filter chips,
// search over title + preview, pinned chats first, then last activity. Pure so it is unit-tested.
import type { ChatGroup } from "@/fixtures/chat";

export const CHAT_FILTERS = ["all", "unread", "official", "custom", "dm"] as const;
export type ChatFilter = (typeof CHAT_FILTERS)[number];

export function chatTitle(group: ChatGroup): string {
  return group.kind === "dm" ? (group.peer?.name ?? "") : (group.name ?? "");
}

function matchesFilter(group: ChatGroup, filter: ChatFilter, archived: boolean): boolean {
  if (archived) return group.kind === "dm" && group.status === "archived";
  if (group.status === "archived") return false;
  switch (filter) {
    case "all":
      return true;
    case "unread":
      return group.unreadCount > 0;
    default:
      return group.kind === filter;
  }
}

export function filterChatList(
  groups: readonly ChatGroup[],
  {
    filter,
    query,
    pinned = [],
    archived = false,
  }: { filter: ChatFilter; query: string; pinned?: readonly string[]; archived?: boolean },
): ChatGroup[] {
  const q = query.trim().toLowerCase();
  const visible = groups.filter((group) => {
    if (!matchesFilter(group, filter, archived)) return false;
    if (!q) return true;
    return (
      chatTitle(group).toLowerCase().includes(q) ||
      (group.lastMessagePreview ?? "").toLowerCase().includes(q)
    );
  });
  const pinRank = (group: ChatGroup) => {
    const index = pinned.indexOf(group.id);
    return index === -1 ? Number.POSITIVE_INFINITY : index;
  };
  const activity = (group: ChatGroup) =>
    group.lastMessageAt ? Date.parse(group.lastMessageAt) : 0;
  return [...visible].sort((a, b) => pinRank(a) - pinRank(b) || activity(b) - activity(a));
}

/** Archived DMs behind the "Archived" entry row. */
export function archivedDmCount(groups: readonly ChatGroup[]): number {
  return groups.filter((g) => g.kind === "dm" && g.status === "archived").length;
}

export type PreviewLabels = {
  image: string;
  pdf: string;
  document: string;
  voice: string;
  deleted: string;
  you: string;
  gif?: string;
  sticker?: string;
};

/**
 * The list row's one-line preview (WhatsApp): attachments show their kind (+ caption), a
 * tombstone reads "Message deleted", and group rows prefix the sender ("You: …" / "Karim: …").
 * Fixture rows carry only `lastMessagePreview` and render it as before.
 */
export function listPreview(
  group: ChatGroup,
  labels: PreviewLabels,
  myUserId: string,
): string | undefined {
  const kind = group.lastMessageKind;
  const text = group.lastMessagePreview ?? "";
  if (!kind) return text || undefined;
  let body: string;
  switch (kind) {
    case "deleted":
      return labels.deleted;
    case "image":
      body = text ? `📷 ${text}` : `📷 ${labels.image}`;
      break;
    case "pdf":
      body = text ? `📄 ${text}` : `📄 ${labels.pdf}`;
      break;
    case "doc":
    case "sheet":
    case "csv":
      body = text ? `📎 ${text}` : `📎 ${labels.document}`;
      break;
    case "voice":
      body = `🎤 ${labels.voice}`;
      break;
    case "poll":
      body = `📊 ${text}`;
      break;
    case "gif":
      body = `🎞️ ${labels.gif ?? "GIF"}`;
      break;
    case "sticker":
      body = `💟 ${labels.sticker ?? "Sticker"}`;
      break;
    default:
      body = text;
  }
  if (!body) return undefined;
  if (group.kind === "dm") return body;
  if (group.lastMessageSenderId && group.lastMessageSenderId === myUserId) {
    return `${labels.you}: ${body}`;
  }
  const first = group.lastMessageSenderName?.trim().split(/\s+/)[0];
  return first ? `${first}: ${body}` : body;
}
