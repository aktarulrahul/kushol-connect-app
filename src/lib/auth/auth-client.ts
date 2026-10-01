// Authenticated api plumbing (IDT-AP-009): wraps the generated openapi-fetch client with a
// bearer token and a single-flight refresh interceptor. On a 401 it rotates the refresh token
// (POST /auth/refresh — through the fixture seam today) and retries the original call ONCE;
// concurrent 401s share one rotation promise; a failed rotation clears the session (re-login).
// `refresh` is injected so the call stays inside the seam (src/fixtures/auth.ts) until
// integration swaps it for the real client.
import { createApiClient, type ApiClient, type Locale } from "@/api/client";
import type { TokenStore } from "@/lib/auth/token-store";

export type RefreshFn = (refreshToken: string) => Promise<{
  accessToken: string;
  refreshToken: string;
}>;

type AuthClientOptions = {
  baseUrl?: string;
  locale?: Locale;
  store: TokenStore;
  refresh: RefreshFn;
  /** Injected transport (tests); integration passes the platform fetch. */
  fetchImpl: (input: Request) => Promise<Response>;
};

function withBearer(request: Request, accessToken: string | undefined): Request {
  if (!accessToken) return request;
  // Request(request, { headers }) REPLACES all headers — start from the originals.
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return new Request(request, { headers });
}

export function createAuthClient(options: AuthClientOptions): ApiClient {
  const { store, refresh } = options;
  // Single flight: every 401 awaiting rotation awaits this one promise (03 `05` §4).
  let refreshPromise: Promise<void> | null = null;

  const authedFetch = async (input: Request): Promise<Response> => {
    const tokens = await store.get();
    // Keep a pristine copy for the single retry — the first send consumes the body.
    const replay = input.clone();
    const response = await options.fetchImpl(withBearer(input, tokens?.accessToken));
    if (response.status !== 401 || !tokens) return response;

    refreshPromise ??= refresh(tokens.refreshToken)
      .then((next) => store.set(next))
      .catch(async (error: unknown) => {
        await store.clear();
        throw error instanceof Error ? error : new Error("token refresh failed");
      })
      .finally(() => {
        refreshPromise = null;
      });

    try {
      await refreshPromise;
    } catch {
      // Rotation failed (reuse detection revokes the family) — surface the original 401.
      return response;
    }
    const next = await store.get();
    return options.fetchImpl(withBearer(replay, next?.accessToken));
  };

  return createApiClient({
    baseUrl: options.baseUrl,
    locale: options.locale,
    fetch: authedFetch,
  });
}
