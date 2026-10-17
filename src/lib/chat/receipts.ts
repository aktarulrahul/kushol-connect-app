// WhatsApp receipts + forward rules for the app chat (05 · owner 2026-10-17). Pure, so the tick
// and label rules are unit-pinned; the api is the source of truth (horizons, hop counts). Mirrors
// the web's `lib/chat/receipts.ts`.

/** Forward limits (mirror the api): ≤ 5 chats; a message forwarded 5+ times → 1 chat at a time. */
export const FORWARD_MAX_TARGETS = 5;
export const FORWARD_MANY_TIMES = 5;

/**
 * Whether ISO instant `at` is at or before `limit`. The api emits variable-length fractional
 * seconds (Go RFC 3339), so plain string comparison mis-orders ".1234Z" vs ".123456Z" —
 * compare the millisecond instant, then the sub-millisecond digits.
 */
export function isoAtOrBefore(at: string, limit: string): boolean {
  const a = Date.parse(at);
  const b = Date.parse(limit);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  if (a !== b) return a < b;
  return subMillis(at) <= subMillis(limit);
}

function subMillis(iso: string): number {
  const fraction = /\.(\d+)/.exec(iso)?.[1] ?? "";
  return Number(fraction.slice(3, 9).padEnd(6, "0"));
}

/** Own-message receipt from the history page's horizons: ✓ sent · ✓✓ delivered · blue ✓✓ seen. */
export function receiptState(
  createdAt: string,
  readUpTo?: string,
  deliveredUpTo?: string,
): "sent" | "delivered" | "seen" {
  if (readUpTo !== undefined && isoAtOrBefore(createdAt, readUpTo)) return "seen";
  if (deliveredUpTo !== undefined && isoAtOrBefore(createdAt, deliveredUpTo)) return "delivered";
  return "sent";
}

/** i18n key of the bubble's forward label, or null for an original message. */
export function forwardLabelKey(
  forwardCount: number | undefined,
): "chat.forward.label" | "chat.forward.label_many" | null {
  if (!forwardCount || forwardCount < 1) return null;
  return forwardCount >= FORWARD_MANY_TIMES ? "chat.forward.label_many" : "chat.forward.label";
}

/** How many chats one forward of this message may reach. */
export function forwardLimit(forwardCount: number | undefined): number {
  return (forwardCount ?? 0) >= FORWARD_MANY_TIMES ? 1 : FORWARD_MAX_TARGETS;
}
