import { createApiClient, isProblem } from "./client";

function fakeFetch(status: number, body: unknown) {
  return jest.fn<Promise<Response>, [Request]>(() =>
    Promise.resolve(
      Response.json(body, {
        status,
        headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
      }),
    ),
  );
}

describe("generated api client", () => {
  it("calls the typed /healthz route with the bn locale by default", async () => {
    const fetch = fakeFetch(200, { status: "ok" });
    const api = createApiClient({ baseUrl: "http://api.test", fetch });
    const { data, error } = await api.GET("/healthz");
    expect(error).toBeUndefined();
    expect(data?.status).toBe("ok");
    const req = fetch.mock.calls[0]?.[0];
    expect(req?.url).toBe("http://api.test/healthz");
    expect(req?.headers.get("Accept-Language")).toBe("bn");
  });

  it("surfaces the problem envelope on a 503 from /readyz", async () => {
    const problem = {
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Service is temporarily unavailable.",
      requestId: "r-1",
      dependencies: [{ name: "postgres", ok: false, latencyMs: 1000 }],
    };
    const api = createApiClient({
      baseUrl: "http://api.test",
      locale: "en",
      fetch: fakeFetch(503, problem),
    });
    const { data, error, response } = await api.GET("/readyz");
    expect(data).toBeUndefined();
    expect(response.status).toBe(503);
    expect(isProblem(error)).toBe(true);
  });

  it("isProblem rejects non-problem bodies", () => {
    expect(isProblem(null)).toBe(false);
    expect(isProblem({ status: "ok" })).toBe(false);
  });
});
