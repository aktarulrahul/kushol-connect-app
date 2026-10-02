import type { User } from "@/fixtures/auth";
import { adoptFixtureSession, fixtureSession, resetFixtureAuth } from "@/fixtures/auth";

import { createAuthClient, RefreshRejectedError } from "./auth-client";
import { loadCurrentUser, refreshWithApi } from "./live-session";
import { restorePersistedSession } from "./session-restore";
import { MemoryTokenStore } from "./token-store";

// Session restore and silent renew. Fetch is mocked — nothing leaves the process.

const NOW = Date.parse("2026-10-02T06:00:00.000Z");

const user: User = {
  id: "user_1",
  role: "student",
  status: "VERIFIED",
  locale: "bn",
  fullName: "ডেমো শিক্ষার্থী",
  schoolId: null,
  isAmbassador: false,
  plan: "free",
};

function jwt(expSeconds: number): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none", typ: "JWT" })}.${part({ exp: expSeconds })}.sig`;
}

const PROBLEM = {
  type: "about:blank",
  title: "Unauthorized",
  status: 401,
  code: "UNAUTHENTICATED",
  message: "Please sign in again.",
  requestId: "r-1",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function clientFor(store: MemoryTokenStore, fetchImpl: (input: Request) => Promise<Response>) {
  return createAuthClient({
    baseUrl: "http://api.test",
    store,
    fetchImpl,
    refresh: (refreshToken) => refreshWithApi(refreshToken, fetchImpl),
  });
}

function restore(
  store: MemoryTokenStore,
  fetchImpl: (input: Request) => Promise<Response>,
  now = NOW,
) {
  const client = clientFor(store, fetchImpl);
  return restorePersistedSession({
    store,
    now,
    rotate: () => client.rotate(),
    loadMe: () => loadCurrentUser(client, store),
    adoptFixture: adoptFixtureSession,
  });
}

beforeEach(() => {
  resetFixtureAuth();
});

describe("restorePersistedSession", () => {
  it("stays signed in by rotating an expired access token once", async () => {
    const store = new MemoryTokenStore();
    const expired = jwt(Math.floor(NOW / 1000) - 120);
    const fresh = jwt(Math.floor(NOW / 1000) + 15 * 60);
    await store.set({ accessToken: expired, refreshToken: "r1" });
    await store.setAccount(user);
    const fetchImpl = jest.fn(async (request: Request) => {
      if (request.url.endsWith("/api/v1/auth/refresh")) {
        expect(await request.json()).toEqual({ refreshToken: "r1" });
        return json(200, { data: { accessToken: fresh, refreshToken: "r2" } });
      }
      expect(request.headers.get("Authorization")).toBe(`Bearer ${fresh}`);
      return json(200, { data: user });
    });

    const outcome = await restore(store, fetchImpl);

    expect(outcome).toEqual({ status: "authed", user, stale: false });
    expect(await store.get()).toEqual({ accessToken: fresh, refreshToken: "r2" });
    const refreshCalls = fetchImpl.mock.calls.filter((call) =>
      call[0].url.endsWith("/api/v1/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("replaces both tokens when the refresh token rotates", async () => {
    const store = new MemoryTokenStore();
    const expired = jwt(Math.floor(NOW / 1000) - 10);
    await store.set({ accessToken: expired, refreshToken: "old-refresh" });
    await store.setAccount(user);
    const fetchImpl = jest.fn((request: Request) => {
      if (request.url.endsWith("/api/v1/auth/refresh")) {
        return Promise.resolve(
          json(200, { data: { accessToken: "access-new", refreshToken: "refresh-new" } }),
        );
      }
      return Promise.resolve(json(200, { data: user }));
    });

    await restore(store, fetchImpl);

    expect(await store.get()).toEqual({
      accessToken: "access-new",
      refreshToken: "refresh-new",
    });
  });

  it("clears the session when the refresh token is rejected", async () => {
    const store = new MemoryTokenStore();
    const expired = jwt(Math.floor(NOW / 1000) - 10);
    await store.set({ accessToken: expired, refreshToken: "revoked" });
    await store.setAccount(user);
    const fetchImpl = jest.fn((request: Request) => {
      if (request.url.endsWith("/api/v1/auth/refresh")) return Promise.resolve(json(401, PROBLEM));
      return Promise.resolve(json(200, { data: user }));
    });

    const outcome = await restore(store, fetchImpl);

    expect(outcome).toEqual({ status: "anon" });
    expect(await store.get()).toBeNull();
    expect(await store.getAccount()).toBeNull();
    expect(fetchImpl.mock.calls.some((call) => call[0].url.endsWith("/api/v1/me"))).toBe(false);
  });

  it("keeps the refresh token when the network fails and stays signed in", async () => {
    const store = new MemoryTokenStore();
    const expired = jwt(Math.floor(NOW / 1000) - 10);
    await store.set({ accessToken: expired, refreshToken: "r1" });
    await store.setAccount(user);
    const fetchImpl = jest.fn(() => Promise.reject(new Error("Network request failed")));

    const outcome = await restore(store, fetchImpl);

    expect(outcome).toEqual({ status: "authed", user, stale: true });
    expect(await store.get()).toEqual({ accessToken: expired, refreshToken: "r1" });
  });

  it("sends the user to login when no tokens are stored", async () => {
    const store = new MemoryTokenStore();
    const rotate = jest.fn();
    const loadMe = jest.fn();

    const outcome = await restorePersistedSession({
      store,
      now: NOW,
      rotate,
      loadMe,
      adoptFixture: jest.fn(),
    });

    expect(outcome).toEqual({ status: "anon" });
    expect(rotate).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
  });

  it("clears an invalid pair and does not call the api", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "not-a-session", refreshToken: "" });
    const loadMe = jest.fn();

    const outcome = await restorePersistedSession({
      store,
      now: NOW,
      rotate: jest.fn(),
      loadMe,
      adoptFixture: jest.fn(),
    });

    expect(outcome).toEqual({ status: "anon" });
    expect(await store.get()).toBeNull();
    expect(loadMe).not.toHaveBeenCalled();
  });

  it("restores a fixture phone session without calling the api", async () => {
    const store = new MemoryTokenStore();
    const tokens = { accessToken: "access_demo_4", refreshToken: "refresh_demo_4" };
    await store.set(tokens);
    await store.setAccount({ ...user, status: "PENDING" });
    const fetchImpl = jest.fn();

    const outcome = await restore(store, fetchImpl);

    expect(outcome).toEqual({
      status: "authed",
      user: { ...user, status: "PENDING" },
      stale: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(fixtureSession()).toEqual({
      user: { ...user, status: "PENDING" },
      tokens,
    });
  });

  it("does not rotate a still-valid access token", async () => {
    const store = new MemoryTokenStore();
    const fresh = jwt(Math.floor(NOW / 1000) + 10 * 60);
    await store.set({ accessToken: fresh, refreshToken: "r1" });
    const fetchImpl = jest.fn((request: Request) => {
      expect(request.url.endsWith("/api/v1/auth/refresh")).toBe(false);
      expect(request.headers.get("Authorization")).toBe(`Bearer ${fresh}`);
      return Promise.resolve(json(200, { data: user }));
    });

    const outcome = await restore(store, fetchImpl);

    expect(outcome).toEqual({ status: "authed", user, stale: false });
    expect(await store.get()).toEqual({ accessToken: fresh, refreshToken: "r1" });
  });
});

describe("single-flight refresh", () => {
  it("shares one refresh across two parallel 401s", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    let calls = 0;
    const fetchImpl = jest.fn((request: Request) => {
      calls += 1;
      if (request.headers.get("Authorization") === "Bearer a1") {
        return Promise.resolve(json(401, PROBLEM));
      }
      return Promise.resolve(json(200, { data: user }));
    });
    const refresh = jest.fn().mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });
    const client = createAuthClient({ baseUrl: "http://api.test", store, refresh, fetchImpl });

    const [first, second] = await Promise.all([client.GET("/api/v1/me"), client.GET("/api/v1/me")]);

    expect(first.data?.data.id).toBe("user_1");
    expect(second.data?.data.id).toBe("user_1");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("r1");
    expect(calls).toBe(4);
    expect(await store.get()).toEqual({ accessToken: "a2", refreshToken: "r2" });
  });

  it("clears the session when that shared refresh is rejected", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    await store.setAccount(user);
    const fetchImpl = jest.fn(() => Promise.resolve(json(401, PROBLEM)));
    const refresh = jest.fn().mockRejectedValue(new RefreshRejectedError());
    const client = createAuthClient({ baseUrl: "http://api.test", store, refresh, fetchImpl });

    const [first, second] = await Promise.all([client.GET("/api/v1/me"), client.GET("/api/v1/me")]);

    expect(first.response.status).toBe(401);
    expect(second.response.status).toBe(401);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await store.get()).toBeNull();
    expect(await store.getAccount()).toBeNull();
  });
});
