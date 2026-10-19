// Starred messages (05 · owner 2026-10-19): the pure cache rules for the per-viewer `starred`
// flag. Stars are private — the api sets `starred` only on REST reads (history pages and the
// starred list) and never on WS frames or mutation responses, so the app keeps its own value
// when a frame merges in, patches the flag optimistically on star/unstar, and refetches the
// starred list afterwards.
import type { InfiniteData } from "@tanstack/react-query";

import type { ChatMessage, StarredPage } from "@/fixtures/chat";

/** The long-press row for a message: Star, Unstar, or none (tombstones, unsent bubbles). */
export function starActionFor(
  message: Pick<ChatMessage, "deletedAt" | "starred">,
  optimistic: boolean,
): "star" | "unstar" | null {
  if (optimistic || message.deletedAt) return null;
  return message.starred === true ? "unstar" : "star";
}

/** Sets one message's `starred` in a cached history page; the same page when it is absent. */
export function setStarredInPage<P extends { data: ChatMessage[] }>(
  page: P | undefined,
  messageId: string,
  starred: boolean,
): P | undefined {
  if (!page?.data.some((m) => m.id === messageId)) return page;
  return {
    ...page,
    data: page.data.map((m) => (m.id === messageId ? { ...m, starred } : m)),
  };
}

/** Drops an unstarred message from the cached starred pages (optimistic; refetch follows). */
export function dropStarredEntry(
  data: InfiniteData<StarredPage> | undefined,
  messageId: string,
): InfiniteData<StarredPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.filter((entry) => entry.message.id !== messageId),
    })),
  };
}

/** Every loaded starred entry, newest star first (the pages are already in that order). */
export function starredEntries(
  data: InfiniteData<StarredPage> | undefined,
): StarredPage["data"] {
  return data ? data.pages.flatMap((page) => page.data) : [];
}

/**
 * Merges a WS `message.new`/`message.updated` row into the cached one (pure — unit-pinned).
 * `mentions` is the same for every member and rides every frame, so an absent field means the
 * edit removed them; `starred` never rides a frame, so the viewer's cached value is kept.
 */
export function mergeRealtimeMessage(old: ChatMessage, incoming: ChatMessage): ChatMessage {
  const merged: ChatMessage = { ...old, ...incoming };
  if (incoming.mentions && incoming.mentions.length > 0) merged.mentions = [...incoming.mentions];
  else delete merged.mentions;
  if (old.starred !== undefined) merged.starred = old.starred;
  else delete merged.starred;
  return merged;
}
