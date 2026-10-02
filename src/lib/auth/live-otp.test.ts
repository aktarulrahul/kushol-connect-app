import { createApiClient } from "@/api/client";
import { FixtureError } from "@/fixtures/auth";

import { requestOtpLive, verifyOtpLive } from "./live-otp";

function jsonFetch(status: number, body: unknown, extra?: Record<string, string>) {
  const headers = new Headers({
    "Content-Type": status < 400 ? "application/json" : "application/problem+json",
  });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  }
  return jest.fn<Promise<Response>, [Request]>(() =>
    Promise.resolve(Response.json(body, { status, headers })),
  );
}

const sent = {
  data: {
    sentAt: "2026-10-02T06:00:00.000Z",
    cooldownSeconds: 60,
    channel: "email" as const,
  },
};

describe("live email otp", () => {
  it("posts the address to /auth/otp/request and returns the cooldown", async () => {
    const fetch = jsonFetch(202, sent);
    const api = createApiClient({ baseUrl: "http://api.test", locale: "en", fetch });
    const result = await requestOtpLive({ email: "person@school.test", purpose: "login" }, "en", api);
    expect(result).toEqual(sent.data);
    const req = fetch.mock.calls[0]?.[0];
    expect(req?.url).toBe("http://api.test/api/v1/auth/otp/request");
    expect(req?.headers.get("Accept-Language")).toBe("en");
    expect(await req?.json()).toEqual({ email: "person@school.test", purpose: "login" });
  });

  it("maps a verify VALIDATION_FAILED to an invalid code", async () => {
    const api = createApiClient({
      baseUrl: "http://api.test",
      fetch: jsonFetch(400, {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        code: "VALIDATION_FAILED",
        message: "Invalid.",
        requestId: "r-1",
      }),
    });
    await expect(
      verifyOtpLive(
        { email: "person@school.test", otpCode: "000000", purpose: "login" },
        "bn",
        api,
      ),
    ).rejects.toMatchObject({ code: "INVALID_OTP" });
  });

  it("reads Retry-After on a rate limit", async () => {
    const api = createApiClient({
      baseUrl: "http://api.test",
      fetch: jsonFetch(
        429,
        {
          type: "about:blank",
          title: "Too Many Requests",
          status: 429,
          code: "RATE_LIMITED",
          message: "Slow down.",
          requestId: "r-2",
        },
        { "Retry-After": "42" },
      ),
    });
    await expect(
      requestOtpLive({ email: "person@school.test", purpose: "login" }, "bn", api),
    ).rejects.toEqual(new FixtureError("RATE_LIMITED", 42));
  });

  it("reports offline when the network throws", async () => {
    const api = createApiClient({
      baseUrl: "http://api.test",
      fetch: () => Promise.reject(new TypeError("Network request failed")),
    });
    await expect(
      requestOtpLive({ email: "person@school.test", purpose: "login" }, "bn", api),
    ).rejects.toMatchObject({ code: "OFFLINE" });
  });
});
