import { createApiClient } from "@/api/client";

import { logoutAllLive, patchMeLive } from "./live-session";

function jsonFetch(status: number, body: unknown) {
  const headers = new Headers({
    "Content-Type": status < 400 ? "application/json" : "application/problem+json",
  });
  return jest.fn<Promise<Response>, [Request]>(() =>
    Promise.resolve(status === 204 ? new Response(null, { status }) : Response.json(body, { status, headers })),
  );
}

const user = {
  id: "u1",
  role: "student" as const,
  status: "PENDING" as const,
  locale: "en" as const,
  fullName: "ডেমো",
  isAmbassador: false,
  plan: "free" as const,
};

describe("live session mutations", () => {
  it("patches /me and returns the updated user", async () => {
    const fetch = jsonFetch(200, { data: user });
    const api = createApiClient({ baseUrl: "http://api.test", fetch });
    const result = await patchMeLive({ locale: "en" }, api);
    expect(result.locale).toBe("en");
    const req = fetch.mock.calls[0]?.[0];
    expect(req?.url).toBe("http://api.test/api/v1/me");
    expect(req?.method).toBe("PATCH");
    expect(await req?.json()).toEqual({ locale: "en" });
  });

  it("treats logout-all 204 as success", async () => {
    const fetch = jsonFetch(204, null);
    const api = createApiClient({ baseUrl: "http://api.test", fetch });
    await expect(logoutAllLive(api)).resolves.toBeUndefined();
    expect(fetch.mock.calls[0]?.[0]?.url).toBe("http://api.test/api/v1/auth/logout-all");
  });
});
