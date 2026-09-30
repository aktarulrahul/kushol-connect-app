import { render, screen } from "@testing-library/react-native";

import { checkApi, DevStatus } from "@/dev/dev-status";

function fakeFetch(status: number, body: unknown) {
  return jest.fn<Promise<Response>, [Request]>(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
      }),
    ),
  );
}

const ready = {
  status: "ready",
  dependencies: [
    { name: "postgres", ok: true, latencyMs: 1 },
    { name: "redis", ok: true, latencyMs: 0 },
  ],
};

describe("dev status card", () => {
  it("reports ready and asks /readyz in English", async () => {
    const fetch = fakeFetch(200, ready);
    await expect(checkApi({ fetch })).resolves.toEqual({
      state: "ready",
      dependencies: ready.dependencies,
    });
    const req = fetch.mock.calls[0]?.[0];
    expect(req?.url).toBe("http://api.test/readyz");
    expect(req?.headers.get("Accept-Language")).toBe("en");
  });

  it("reports degraded with the failing dependency from a 503 problem", async () => {
    const fetch = fakeFetch(503, {
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      code: "INTERNAL",
      message: "Service is temporarily unavailable.",
      requestId: "r-1",
      dependencies: [{ name: "redis", ok: false, latencyMs: 1000 }],
    });
    await expect(checkApi({ fetch })).resolves.toEqual({
      state: "degraded",
      dependencies: [{ name: "redis", ok: false, latencyMs: 1000 }],
    });
  });

  it("reports unreachable when the request fails", async () => {
    const fetch = jest.fn<Promise<Response>, [Request]>(() =>
      Promise.reject(new TypeError("Network request failed")),
    );
    await expect(checkApi({ fetch })).resolves.toEqual({ state: "unreachable" });
  });

  it("shows the api URL, then the result", async () => {
    await render(<DevStatus fetch={fakeFetch(200, ready)} />);
    expect(screen.getByText("http://api.test")).toBeOnTheScreen();
    expect(await screen.findByText("ready")).toBeOnTheScreen();
    expect(screen.getByText("postgres ok · redis ok")).toBeOnTheScreen();
  });
});
