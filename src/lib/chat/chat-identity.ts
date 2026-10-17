// Who "me" is inside chat (05 · 2026-10-17). Live sessions are the signed-in account — own
// bubbles, ticks, typing and reactions key off the real user id; demo/fixture sessions keep the
// demo teacher so the Stage-2 fixtures, tests and Maestro flows stay byte-for-byte the same.
import { DEMO_ME } from "@/fixtures/chat";
import { useAuthStore } from "@/lib/auth/auth-store";
import { chatLiveModeSync } from "@/lib/chat/live-chat";

export type ChatIdentity = { userId: string; name: string };

/** Pure resolver (unit-pinned). */
export function chatIdentityFrom(
  me: { id: string; fullName: string } | null,
  live: boolean,
): ChatIdentity {
  if (live && me) return { userId: me.id, name: me.fullName };
  return { userId: DEMO_ME.userId, name: DEMO_ME.name };
}

/** React hook — re-renders when the signed-in account changes. */
export function useChatMe(): ChatIdentity {
  const me = useAuthStore((s) => s.me);
  return chatIdentityFrom(me, chatLiveModeSync());
}

/** Non-React read for event handlers (realtime binding). */
export function chatMeNow(): ChatIdentity {
  return chatIdentityFrom(useAuthStore.getState().me, chatLiveModeSync());
}
