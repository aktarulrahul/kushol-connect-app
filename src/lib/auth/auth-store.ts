// Session store (IDT-AP-008/-009): who is signed in. Tokens live in the secure token store.
// Cold start restores them; an expired access token rotates once through the single-flight
// client. A rejected refresh clears the session. A network error keeps the pair and retries
// on the next foreground (and on the renew timer).
import { create } from "zustand";

import {
  FixtureError,
  adoptFixtureSession,
  getMe,
  logout,
  patchMe,
  type User,
} from "@/fixtures/auth";
import { RefreshRejectedError } from "@/lib/auth/auth-client";
import { loadCurrentUser, liveAuth, revokeLiveSession } from "@/lib/auth/live-session";
import {
  accessTokenNeedsRefresh,
  isFixtureAccessToken,
  msUntilRefresh,
  restorePersistedSession,
} from "@/lib/auth/session-restore";
import { tokenStore, type AuthTokens } from "@/lib/auth/token-store";

export type AuthStatus = "idle" | "checking" | "anon" | "authed";

/** When the access token is already due and the last rotate failed offline, try again shortly. */
const RETRY_WHEN_DUE_MS = 30_000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer(): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function scheduleRefresh(accessToken: string): void {
  clearRefreshTimer();
  const delay = msUntilRefresh(accessToken, Date.now());
  if (delay === null) return;
  const wait = delay === 0 ? RETRY_WHEN_DUE_MS : delay;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void useAuthStore.getState().renewIfNeeded();
  }, wait);
}

type AuthState = {
  me: User | null;
  status: AuthStatus;
  /** Last account read failed for connectivity — the cached status may be stale (05 §2.4). */
  stale: boolean;
  /** Cold-start check; runs once. Offline with a cached account stays signed in. */
  hydrate: () => Promise<void>;
  /** Rotate before expiry, or retry a restore that failed because the network was down. */
  renewIfNeeded: () => Promise<void>;
  signIn: (user: User, tokens: AuthTokens) => void;
  /** Local clear always works; a live session also revokes the refresh token when it can. */
  signOut: () => Promise<void>;
  /** Poll/foreground refetch of the verification status. */
  refreshMe: () => Promise<void>;
  /** Language switch (IDT-AP-010): PATCH /me, then instant re-render. */
  changeLocale: (locale: "bn" | "en") => Promise<void>;
};

async function applyLoadedUser(set: (partial: Partial<AuthState>) => void): Promise<void> {
  const loaded = await loadCurrentUser();
  if (useAuthStore.getState().status !== "authed") return;
  if (loaded.ok) {
    await tokenStore.setAccount(loaded.user);
    set({ me: loaded.user, stale: false });
    const next = await tokenStore.get();
    if (next) scheduleRefresh(next.accessToken);
    return;
  }
  if (loaded.reason === "unauthenticated") {
    clearRefreshTimer();
    await tokenStore.clear();
    set({ me: null, status: "anon", stale: false });
    return;
  }
  set({ stale: true });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  me: null,
  status: "idle",
  stale: false,
  hydrate: async () => {
    if (get().status !== "idle") return;
    set({ status: "checking" });
    const outcome = await restorePersistedSession({
      store: tokenStore,
      now: Date.now(),
      rotate: () => liveAuth().rotate(),
      loadMe: () => loadCurrentUser(),
      adoptFixture: adoptFixtureSession,
    });
    if (get().status !== "checking") return;
    if (outcome.status === "anon") {
      set({ me: null, status: "anon", stale: false });
      return;
    }
    set({ me: outcome.user, status: "authed", stale: outcome.stale });
    const tokens = await tokenStore.get();
    if (tokens && get().status === "authed") scheduleRefresh(tokens.accessToken);
  },
  renewIfNeeded: async () => {
    if (get().status !== "authed") return;
    const tokens = await tokenStore.get();
    if (!tokens || isFixtureAccessToken(tokens.accessToken)) return;
    const due = accessTokenNeedsRefresh(tokens.accessToken, Date.now());
    if (!due && !get().stale) return;
    try {
      if (due) await liveAuth().rotate();
      if (get().status !== "authed") return;
      await applyLoadedUser(set);
    } catch (error) {
      if (get().status !== "authed") return;
      if (error instanceof RefreshRejectedError) {
        clearRefreshTimer();
        set({ me: null, status: "anon", stale: false });
        return;
      }
      set({ stale: true });
      const next = await tokenStore.get();
      if (next && get().status === "authed") scheduleRefresh(next.accessToken);
    }
  },
  signIn: (user, tokens) => {
    if (isFixtureAccessToken(tokens.accessToken)) adoptFixtureSession(user, tokens);
    set({ me: user, status: "authed", stale: false });
    void tokenStore
      .set(tokens)
      .then(() => tokenStore.setAccount(user))
      .catch(() => false);
    scheduleRefresh(tokens.accessToken);
  },
  signOut: async () => {
    clearRefreshTimer();
    const tokens = await tokenStore.get();
    if (tokens && !isFixtureAccessToken(tokens.accessToken)) {
      try {
        await revokeLiveSession();
      } catch {
        // Local clear still wins when the network is down (05 §8).
      }
    }
    try {
      await logout();
    } catch {
      // Fixture revoke is best-effort offline.
    }
    await tokenStore.clear();
    set({ me: null, status: "anon", stale: false });
  },
  refreshMe: async () => {
    const tokens = await tokenStore.get();
    if (tokens && !isFixtureAccessToken(tokens.accessToken)) {
      if (get().status !== "authed") return;
      if (accessTokenNeedsRefresh(tokens.accessToken, Date.now()) || get().stale) {
        await get().renewIfNeeded();
        return;
      }
      await applyLoadedUser(set);
      return;
    }
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
