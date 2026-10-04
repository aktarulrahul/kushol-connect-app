// Live client + backend selector (Stage 5): problem-code mapping, idempotent-delete and
// opened-CONFLICT seams, and the fixture/live routing on the session token. No network — the
// client is a fake and `liveAuth` is mocked.
import type { ApiClient } from "@/api/client";
import { tokenStore } from "@/lib/auth/token-store";
import { isLiveSession, markOpened, registerDevice } from "@/lib/notifications/backend";
import {
  deleteDeviceLive,
  getPreferencesLive,
  listDeliveriesLive,
  markOpenedLive,
  NotificationsApiError,
  patchPreferenceLive,
  registerDeviceLive,
  sendTestPushLive,
} from "@/lib/notifications/live";

const ok = (status = 200) => new Response(null, { status });

type Result<T> = { data?: T; error?: unknown; response: Response };

function clientWith(result: Result<unknown> | ((init?: unknown) => Result<unknown>)) {
  const resolve = typeof result === "function" ? result : () => result;
  const calls: Array<{ method: string; path: string; init?: unknown }> = [];
  const record =
    (method: string) =>
    (path: string, init?: unknown) => {
      calls.push({ method, path, init });
      return Promise.resolve(resolve(init));
    };
  const client = {
    GET: record("GET"),
    POST: record("POST"),
    PATCH: record("PATCH"),
    DELETE: record("DELETE"),
  };
  return { client: client as unknown as ApiClient, calls };
}

const problem = (code: string, status = 400) => ({
  type: "about:blank",
  title: code,
  status,
  code,
  message: code,
});

describe("live notifications client", () => {
  it("registers a device and unwraps the data envelope", async () => {
    const registered = { id: "dev1", platform: "android", appVersion: "1.0.0", lastSeenAt: "t", topics: [] };
    const { client, calls } = clientWith({
      data: { data: registered },
      response: ok(201),
    });
    await expect(
      registerDeviceLive({ token: "fcm_native", platform: "android", appVersion: "1.0.0" }, client),
    ).resolves.toEqual(registered);
    expect(calls[0]?.path).toBe("/api/v1/notifications/devices");
    expect(calls[0]?.init).toMatchObject({ body: { token: "fcm_native", platform: "android" } });
  });

  it("maps a problem to the same code vocabulary as the fixture seam", async () => {
    const { client } = clientWith({ error: problem("VALIDATION_FAILED"), response: ok(400) });
    await expect(
      registerDeviceLive({ token: "bad token", platform: "android" }, client),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("treats 404/TENANT_MISMATCH delete as success (idempotent logout cleanup)", async () => {
    const gone = clientWith({ error: problem("NOT_FOUND", 404), response: ok(404) });
    await expect(deleteDeviceLive("dev1", gone.client)).resolves.toBeUndefined();
    const other = clientWith({ error: problem("TENANT_MISMATCH", 404), response: ok(404) });
    await expect(deleteDeviceLive("dev1", other.client)).resolves.toBeUndefined();
    const forbidden = clientWith({ error: problem("FORBIDDEN", 403), response: ok(403) });
    await expect(deleteDeviceLive("dev1", forbidden.client)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reads and patches preferences through the envelope", async () => {
    const rows = [
      { class: "notices", muted: false },
      { class: "chat", muted: false },
      { class: "campaigns", muted: true },
    ];
    const got = clientWith({ data: { data: rows }, response: ok() });
    await expect(getPreferencesLive(got.client)).resolves.toEqual(rows);
    const patched = clientWith({ data: { data: rows }, response: ok() });
    await expect(patchPreferenceLive("campaigns", true, patched.client)).resolves.toEqual(rows);
    expect(patched.calls[0]?.init).toMatchObject({ body: { class: "campaigns", muted: true } });
  });

  it("lists deliveries with paging query", async () => {
    const page = { data: [], page: { number: 2, size: 20, total: 0 } };
    const { client, calls } = clientWith({ data: page, response: ok() });
    await expect(listDeliveriesLive(2, 20, client)).resolves.toEqual(page);
    expect(calls[0]?.init).toMatchObject({ params: { query: { page: 2, pageSize: 20 } } });
  });

  it("resolves CONFLICT silently on opened (topic rows) but surfaces other problems", async () => {
    const conflict = clientWith({ error: problem("CONFLICT", 409), response: ok(409) });
    await expect(markOpenedLive("dlv1", conflict.client)).resolves.toBeUndefined();
    const missing = clientWith({ error: problem("NOT_FOUND", 404), response: ok(404) });
    await expect(markOpenedLive("dlv1", missing.client)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(markOpenedLive("dlv1", clientWith({ response: ok(204) }).client)).resolves.toBeUndefined();
  });

  it("sends the test push and unwraps delivery ids", async () => {
    const { client, calls } = clientWith({
      data: { data: { deliveryIds: ["d1", "d2"], devices: 1 } },
      response: ok(),
    });
    await expect(sendTestPushLive({ class: "notices", target: "self" }, client)).resolves.toEqual({
      deliveryIds: ["d1", "d2"],
      devices: 1,
    });
    expect(calls[0]?.path).toBe("/api/v1/admin/notifications/test");
  });

  it("maps a transport failure to OFFLINE (degraded, never fatal)", async () => {
    const client = {
      GET: () => Promise.reject(new TypeError("network down")),
      POST: () => Promise.reject(new TypeError("network down")),
      PATCH: () => Promise.reject(new TypeError("network down")),
      DELETE: () => Promise.reject(new TypeError("network down")),
    };
    await expect(getPreferencesLive(client)).rejects.toBeInstanceOf(NotificationsApiError);
    await expect(getPreferencesLive(client)).rejects.toMatchObject({ code: "OFFLINE" });
  });
});

jest.mock("@/lib/auth/live-session", () => {
  const state: { client?: unknown } = { client: undefined };
  return {
    __setLiveClient: (client: unknown) => {
      state.client = client;
    },
    liveAuth: () => state.client,
  };
});

describe("backend selector", () => {
  const { __setLiveClient } = jest.requireMock<{
    __setLiveClient: (client: unknown) => void;
  }>("@/lib/auth/live-session");

  it("routes a fixture session to the fixture seam", async () => {
    await expect(isLiveSession()).resolves.toBe(false);
    await expect(registerDevice({ token: "fcm_demo_u1", platform: "android" }, false)).resolves.toMatchObject({
      topics: [],
    });
  });

  it("routes a live session to the generated client", async () => {
    await tokenStore.set({ accessToken: "eyJhbGciOi.eyJzdWI.kK", refreshToken: "r" });
    await expect(isLiveSession()).resolves.toBe(true);
    const { client, calls } = clientWith({
      data: { data: { id: "dev1", platform: "ios", appVersion: "", lastSeenAt: "t", topics: ["school-x"] } },
      response: ok(201),
    });
    __setLiveClient(client);
    await expect(registerDevice({ token: "fcm_native", platform: "ios" }, true)).resolves.toMatchObject({
      topics: ["school-x"],
    });
    expect(calls[0]?.path).toBe("/api/v1/notifications/devices");
    __setLiveClient(undefined);
    await tokenStore.clear();
  });

  it("routes markOpened through the live CONFLICT seam", async () => {
    // markOpened reads the process-wide store (expo-secure-store is an in-memory mock here).
    await tokenStore.set({ accessToken: "eyJhbGciOi.eyJzdWI.kK", refreshToken: "r" });
    const { client } = clientWith({ error: problem("CONFLICT", 409), response: ok(409) });
    __setLiveClient(client);
    await expect(markOpened("dlv_topic")).resolves.toBeUndefined();
    __setLiveClient(undefined);
    await tokenStore.clear();
  });
});
