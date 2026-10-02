// Live session calls through the generated client. One auth client per process so proactive
// renew and a 401 retry share the single-flight rotate in auth-client.ts.
import { createApiClient, isProblem } from "@/api/client";
import { platformFetch, withAuthorization } from "@/api/platform-fetch";
import { createAuthClient, RefreshRejectedError, type AuthApiClient } from "@/lib/auth/auth-client";
import {
  accessTokenNeedsRefresh,
  isFixtureAccessToken,
  type LoadMeResult,
} from "@/lib/auth/session-restore";
import { tokenStore, type TokenStore } from "@/lib/auth/token-store";

type FetchImpl = (input: Request) => Promise<Response>;

export async function refreshWithApi(
  refreshToken: string,
  fetchImpl: FetchImpl = platformFetch,
): Promise<{ accessToken: string; refreshToken: string }> {
  const api = createApiClient({ fetch: fetchImpl });
  try {
    const { data, error, response } = await api.POST("/api/v1/auth/refresh", {
      body: { refreshToken },
    });
    if (data) {
      return { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken };
    }
    if (
      response.status === 401 ||
      (isProblem(error) && (error.code === "UNAUTHENTICATED" || error.code === "SUSPENDED"))
    ) {
      throw new RefreshRejectedError();
    }
    throw new Error("token refresh failed");
  } catch (cause) {
    if (cause instanceof RefreshRejectedError) throw cause;
    throw new Error("token refresh failed", { cause });
  }
}

let singleton: AuthApiClient | null = null;

/** The process-wide client. Its `rotate` is the one flight every 401 and the renew timer share. */
export function liveAuth(): AuthApiClient {
  singleton ??= createAuthClient({
    store: tokenStore,
    fetchImpl: platformFetch,
    refresh: (refreshToken) => refreshWithApi(refreshToken),
  });
  return singleton;
}

export async function loadCurrentUser(
  client: AuthApiClient = liveAuth(),
  store: TokenStore = tokenStore,
): Promise<LoadMeResult> {
  try {
    const { data, error, response } = await client.GET("/api/v1/me");
    if (data) return { ok: true, user: data.data };
    if (isProblem(error) && error.code === "SUSPENDED") {
      return { ok: false, reason: "unauthenticated" };
    }
    if (response.status === 401 || (isProblem(error) && error.code === "UNAUTHENTICATED")) {
      const still = await store.get();
      if (!still) return { ok: false, reason: "unauthenticated" };
      return { ok: false, reason: "offline" };
    }
    return { ok: false, reason: "offline" };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

/** Best-effort server revoke. Local clear in `signOut` still runs when this throws. */
export async function revokeLiveSession(): Promise<void> {
  let tokens = await tokenStore.get();
  if (!tokens || isFixtureAccessToken(tokens.accessToken)) return;
  if (accessTokenNeedsRefresh(tokens.accessToken, Date.now())) {
    try {
      await liveAuth().rotate();
    } catch (error) {
      if (error instanceof RefreshRejectedError) return;
    }
    tokens = await tokenStore.get();
    if (!tokens) return;
  }
  const api = createApiClient({ fetch: withAuthorization(tokens.accessToken) });
  await api.POST("/api/v1/auth/logout", { body: { refreshToken: tokens.refreshToken } });
}
