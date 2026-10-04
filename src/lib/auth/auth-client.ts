// Authenticated api plumbing (IDT-AP-009): wraps the generated openapi-fetch client with a
// bearer token and a single-flight refresh. On a 401 it rotates once (POST /auth/refresh) and
// retries the original call; concurrent 401s share that promise. A rejected refresh (401, reuse,
// revoked) clears the session. A transport error keeps the stored pair so the next foreground
// can try again. `refresh` is injected so tests never touch the network.
import { createApiClient, type ApiClient, type Locale } from "@/api/client";
import type { TokenStore } from "@/lib/auth/token-store";

export type RefreshFn = (refreshToken: string) => Promise<{
  accessToken: string;
  refreshToken: string;
}>;

/** The refresh token was rejected (expired, reused, revoked, or the account is suspended). */
export class RefreshRejectedError extends Error {
  constructor() {
    super("refresh rejected");
    this.name = "RefreshRejectedError";
  }
}

type AuthClientOptions = {
  baseUrl?: string;
  locale?: Locale;
  store: TokenStore;
  refresh: RefreshFn;
  /** Injected transport (tests); integration passes the platform fetch. */
  fetchImpl: (input: Request) => Promise<Response>;
};

export type AuthApiClient = ApiClient & {
  /** Single-flight rotation. Shares its promise with every 401 retry. */
  rotate(): Promise<void>;
};

function withBearer(request: Request, accessToken: string | undefined): Request {
  if (!accessToken) return request;
  // Request(request, { headers }) REPLACES all headers — start from the originals.
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return new Request(request, { headers });
}

export function createAuthClient(options: AuthClientOptions): AuthApiClient {
  const { store, refresh } = options;
  // Single flight: every 401 and every proactive renew awaits this one promise.
  let refreshPromise: Promise<void> | null = null;

  const rotate = (): Promise<void> => {
    refreshPromise ??= runRotation().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  };

  async function runRotation(): Promise<void> {
    const generation = store.generation();
    const current = await store.get();
    if (store.generation() !== generation) throw new Error("signed out");
    if (!current?.refreshToken) throw new RefreshRejectedError();
    try {
      const next = await refresh(current.refreshToken);
      if (store.generation() !== generation) throw new Error("signed out");
      await store.setIfGeneration(generation, next);
      if (store.generation() !== generation) throw new Error("signed out");
    } catch (error) {
      // Sign-out won the race — do not clear a session that is already gone, and do not
      // wipe a newer sign-in.
      if (store.generation() !== generation) {
        throw error instanceof Error ? error : new Error("signed out");
      }
      if (error instanceof RefreshRejectedError) await store.clear();
      throw error instanceof Error ? error : new Error("token refresh failed");
    }
  }

  const authedFetch = async (input: Request): Promise<Response> => {
    const tokens = await store.get();
    // Keep a pristine copy for the single retry — the first send consumes the body.
    const replay = input.clone();
    const response = await options.fetchImpl(withBearer(input, tokens?.accessToken));
    if (response.status !== 401 || !tokens) return response;

    // A proactive renew may have rotated while this request was in flight. Refreshing again
    // with the already-rotated token is reuse detection and kills the family.
    const latest = await store.get();
    if (latest && latest.accessToken !== tokens.accessToken) {
      return options.fetchImpl(withBearer(replay, latest.accessToken));
    }

    try {
      await rotate();
    } catch {
      // Rejected rotations have already cleared the store. Transport errors have not.
      return response;
    }
    const next = await store.get();
    return options.fetchImpl(withBearer(replay, next?.accessToken));
  };

  const client = createApiClient({
    baseUrl: options.baseUrl,
    locale: options.locale,
    fetch: authedFetch,
  });
  return Object.assign(client, { rotate });
}
