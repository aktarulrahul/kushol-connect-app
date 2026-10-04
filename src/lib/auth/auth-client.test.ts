import { createAuthClient, RefreshRejectedError } from "./auth-client";
import { MemoryTokenStore } from "./token-store";

// IDT-AP-009 — single-flight refresh interceptor: one 401 rotates the refresh token and retries
// once; concurrent 401s share the same rotation promise; a failed rotation clears the session.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PROBLEM = {
  type: "about:blank",
  title: "Unauthorized",
  status: 401,
  code: "UNAUTHENTICATED",
  message: "Please sign in again.",
  requestId: "r-1",
};

function seqFetch(responses: Array<(request: Request) => Response>) {
  let call = 0;
  const seen: Request[] = [];
  const fn = jest.fn((request: Request): Promise<Response> => {
    seen.push(request);
    const respond = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve(respond ? respond(request) : jsonResponse(404, {}));
  });
  return { fn, seen };
}

describe("createAuthClient", () => {
  it("rotates the refresh token once on a 401 and retries with the new access token", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    const { fn, seen } = seqFetch([
      () => jsonResponse(401, PROBLEM),
      () => jsonResponse(200, { status: "ok" }),
    ]);
    const refresh = jest.fn().mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });
    const client = createAuthClient({ baseUrl: "http://api.test", store, refresh, fetchImpl: fn });

    const { data, error } = await client.GET("/healthz");

    expect(error).toBeUndefined();
    expect(data?.status).toBe("ok");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("r1");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(seen[0]?.headers.get("Authorization")).toBe("Bearer a1");
    expect(seen[1]?.headers.get("Authorization")).toBe("Bearer a2");
    expect((await store.get())?.refreshToken).toBe("r2");
  });

  it("shares one refresh promise across concurrent 401s", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    const { fn } = seqFetch([
      () => jsonResponse(401, PROBLEM),
      () => jsonResponse(401, PROBLEM),
      () => jsonResponse(200, { status: "ok" }),
      () => jsonResponse(200, { status: "ok" }),
    ]);
    const refresh = jest.fn().mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });
    const client = createAuthClient({ baseUrl: "http://api.test", store, refresh, fetchImpl: fn });

    const [first, second] = await Promise.all([client.GET("/healthz"), client.GET("/healthz")]);

    expect(first.data?.status).toBe("ok");
    expect(second.data?.status).toBe("ok");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(4); // two 401s + two single retries, no more
  });

  it("clears the session and surfaces the original 401 when rotation is rejected", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "revoked" });
    const { fn } = seqFetch([() => jsonResponse(401, PROBLEM)]);
    const refresh = jest.fn().mockRejectedValue(new RefreshRejectedError());
    const client = createAuthClient({ baseUrl: "http://api.test", store, refresh, fetchImpl: fn });

    const { data, response } = await client.GET("/healthz");

    expect(data).toBeUndefined();
    expect(response.status).toBe(401);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1); // no retry after a rejected rotation
    expect(await store.get()).toBeNull();
  });

  it("keeps the stored pair when refresh fails because the network is down", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    const { fn } = seqFetch([() => jsonResponse(401, PROBLEM)]);
    const refresh = jest.fn().mockRejectedValue(new Error("Network request failed"));
    const client = createAuthClient({ baseUrl: "http://api.test", store, refresh, fetchImpl: fn });

    const { response } = await client.GET("/healthz");

    expect(response.status).toBe(401);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await store.get()).toEqual({ accessToken: "a1", refreshToken: "r1" });
  });

  it("does not rotate again when a refresh already replaced the access token", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    const { fn, seen } = seqFetch([
      () => jsonResponse(401, PROBLEM),
      () => jsonResponse(200, { status: "ok" }),
    ]);
    const wrapped = jest.fn(async (request: Request) => {
      if (request.headers.get("Authorization") === "Bearer a1") {
        await store.set({ accessToken: "a2", refreshToken: "r2" });
      }
      return fn(request);
    });
    const refresh = jest.fn();
    const client = createAuthClient({
      baseUrl: "http://api.test",
      store,
      refresh,
      fetchImpl: wrapped,
    });

    const { data } = await client.GET("/healthz");

    expect(data?.status).toBe("ok");
    expect(refresh).not.toHaveBeenCalled();
    expect(seen[1]?.headers.get("Authorization")).toBe("Bearer a2");
  });

  it("keeps the middleware headers (Accept-Language) on the retried request", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    const { fn, seen } = seqFetch([
      () => jsonResponse(401, PROBLEM),
      () => jsonResponse(200, { status: "ok" }),
    ]);
    const refresh = jest.fn().mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });
    const client = createAuthClient({
      baseUrl: "http://api.test",
      locale: "en",
      store,
      refresh,
      fetchImpl: fn,
    });

    await client.GET("/healthz");

    expect(seen[1]?.headers.get("Accept-Language")).toBe("en");
    expect(seen[1]?.url).toBe("http://api.test/healthz");
  });
});
