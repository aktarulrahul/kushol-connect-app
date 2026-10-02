// Launch restore and the "is this access token still usable?" decision. No I/O of its own:
// the caller supplies the single-flight rotate and GET /me so tests stay off the network.
import type { User } from "@/fixtures/auth";
import { RefreshRejectedError } from "@/lib/auth/auth-client";
import type { AuthTokens, TokenStore } from "@/lib/auth/token-store";

/** Demo phone login (`issueTokens` in the fixture seam). Real API access tokens are JWTs. */
export const FIXTURE_ACCESS_PREFIX = "access_demo_";

/** Refresh this long before `exp` so an in-flight request does not race the clock. */
export const REFRESH_SKEW_MS = 60_000;

const ROLES = new Set(["super_admin", "school_admin", "teacher", "student", "guardian", "vendor"]);
const STATUSES = new Set(["PENDING", "VERIFIED", "SUSPENDED"]);

export type LoadMeResult =
  { ok: true; user: User } | { ok: false; reason: "unauthenticated" | "offline" };

export type RestoredSession =
  { status: "anon" } | { status: "authed"; user: User | null; stale: boolean };

export function isFixtureAccessToken(accessToken: string): boolean {
  return accessToken.startsWith(FIXTURE_ACCESS_PREFIX);
}

export function isStoredUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.fullName === "string" &&
    typeof record.role === "string" &&
    ROLES.has(record.role) &&
    typeof record.status === "string" &&
    STATUSES.has(record.status) &&
    (record.locale === "bn" || record.locale === "en") &&
    typeof record.isAmbassador === "boolean" &&
    (record.plan === "free" || record.plan === "pro")
  );
}

/** JWT `exp` in milliseconds, or null when the token is not a JWT (fixture tokens, garbage). */
export function accessTokenExpiresAt(accessToken: string): number | null {
  const segment = accessToken.split(".")[1];
  if (!segment) return null;
  try {
    const payload: unknown = JSON.parse(decodeBase64Url(segment));
    if (typeof payload !== "object" || payload === null) return null;
    const exp = (payload as { exp?: unknown }).exp;
    if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

/** Missing or within the skew window of `exp`. Fixture tokens never expire on device. */
export function accessTokenNeedsRefresh(accessToken: string, nowMs: number): boolean {
  if (isFixtureAccessToken(accessToken)) return false;
  if (accessToken.trim().length === 0) return true;
  const exp = accessTokenExpiresAt(accessToken);
  if (exp === null) return false;
  return exp <= nowMs + REFRESH_SKEW_MS;
}

/** Milliseconds until a proactive renew, 0 when it is already due, null when it should not be scheduled. */
export function msUntilRefresh(accessToken: string, nowMs: number): number | null {
  if (isFixtureAccessToken(accessToken)) return null;
  const exp = accessTokenExpiresAt(accessToken);
  if (exp === null) return null;
  return Math.max(0, exp - nowMs - REFRESH_SKEW_MS);
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return globalThis.atob(padded);
}

type RestoreDeps = {
  store: TokenStore;
  now: number;
  rotate: () => Promise<void>;
  loadMe: () => Promise<LoadMeResult>;
  adoptFixture: (user: User, tokens: AuthTokens) => void;
};

/**
 * Reads the persisted pair and decides whether the user stays signed in.
 * Expired or missing access tokens rotate once. A rejected refresh clears the pair.
 * A transport error keeps it and returns the cached account as stale.
 */
export async function restorePersistedSession(deps: RestoreDeps): Promise<RestoredSession> {
  const tokens = await deps.store.get();
  if (!tokens) return { status: "anon" };

  const refreshToken = tokens.refreshToken.trim();
  const accessToken = tokens.accessToken.trim();
  if (!refreshToken) {
    await deps.store.clear();
    return { status: "anon" };
  }

  if (isFixtureAccessToken(accessToken)) {
    const account = await deps.store.getAccount();
    if (!isStoredUser(account)) {
      await deps.store.clear();
      return { status: "anon" };
    }
    deps.adoptFixture(account, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return { status: "authed", user: account, stale: false };
  }

  if (accessTokenNeedsRefresh(accessToken, deps.now)) {
    try {
      await deps.rotate();
    } catch (error) {
      if (error instanceof RefreshRejectedError) return { status: "anon" };
      return keepCached(deps.store);
    }
  }

  try {
    const loaded = await deps.loadMe();
    if (loaded.ok) {
      await deps.store.setAccount(loaded.user);
      return { status: "authed", user: loaded.user, stale: false };
    }
    if (loaded.reason === "unauthenticated") {
      await deps.store.clear();
      return { status: "anon" };
    }
    return await keepCached(deps.store);
  } catch {
    return keepCached(deps.store);
  }
}

async function keepCached(store: TokenStore): Promise<RestoredSession> {
  const account = await store.getAccount();
  if (isStoredUser(account)) return { status: "authed", user: account, stale: true };
  return { status: "authed", user: null, stale: true };
}
