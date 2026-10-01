// Session store (IDT-AP-008/-009): who is signed in, backed by the token store and the fixture
// seam. The /(tabs) gate and /verification-pending read `me` from here; a single `refreshMe()`
// poll (≤ 30 s, on foreground) opens the gate mid-session without re-login (IDT-US-006).
import { create } from "zustand";

import { FixtureError, getMe, logout, patchMe, type User } from "@/fixtures/auth";
import { tokenStore, type AuthTokens } from "@/lib/auth/token-store";

export type AuthStatus = "idle" | "checking" | "anon" | "authed";

type AuthState = {
  me: User | null;
  status: AuthStatus;
  /** Last getMe failed for connectivity reasons — the cached status may be stale (05 §2.4). */
  stale: boolean;
  /** Cold-start check; runs once. Offline with no cached session resolves to anon. */
  hydrate: () => Promise<void>;
  signIn: (user: User, tokens: AuthTokens) => void;
  /** Local clear always works; the fixture performs the server revoke (retried on reconnect). */
  signOut: () => Promise<void>;
  /** Poll/foreground refetch of the verification status. */
  refreshMe: () => Promise<void>;
  /** Language switch (IDT-AP-010): PATCH /me, then instant re-render. */
  changeLocale: (locale: "bn" | "en") => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  me: null,
  status: "idle",
  stale: false,
  hydrate: async () => {
    if (get().status !== "idle") return;
    set({ status: "checking" });
    try {
      const me = await getMe();
      set({ me, status: "authed", stale: false });
    } catch {
      set({ me: null, status: "anon", stale: false });
    }
  },
  signIn: (user, tokens) => {
    void tokenStore.set(tokens);
    set({ me: user, status: "authed", stale: false });
  },
  signOut: async () => {
    await logout();
    await tokenStore.clear();
    set({ me: null, status: "anon", stale: false });
  },
  refreshMe: async () => {
    if (!get().me) return;
    try {
      const me = await getMe();
      set({ me, stale: false });
    } catch (error) {
      if (error instanceof FixtureError && error.code === "UNAUTHENTICATED") {
        await tokenStore.clear();
        set({ me: null, status: "anon", stale: false });
        return;
      }
      // Offline: keep the cached account and flag staleness (05 §2.4 "cached status" banner).
      set({ stale: true });
    }
  },
  changeLocale: async (locale) => {
    const me = await patchMe({ locale });
    set({ me });
  },
}));

/** Problem `code` from a thrown seam error, for screens that map codes to copy. */
export function fixtureErrorCode(error: unknown): string | undefined {
  return error instanceof FixtureError ? error.code : undefined;
}
