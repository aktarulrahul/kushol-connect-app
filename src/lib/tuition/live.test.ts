import type { ApiClient } from "@/api/client";
import { acceptMatchLive, createRequirementLive, getMyTutorProfileLive, TuitionApiError } from "./live";

const ok = (status = 200) => new Response(null, { status });

type Result<T> = { data?: T; error?: unknown; response: Response };

function clientWith(result: Result<unknown>) {
  const record = () => () => Promise.resolve(result);
  return {
    GET: record(),
    POST: record(),
    PATCH: record(),
  } as unknown as ApiClient;
}

const problem = (code: string, status = 400) => ({
  type: "about:blank", title: code, status, code, message: code,
});

const requirementInput = {
  subjects: ["math"] as ("math" | "physics")[],
  classLevel: "class_9" as const,
  budgetMin: 2000,
  budgetMax: 4000,
  genderPref: "any" as const,
  locationArea: "মিরপুর, ঢাকা",
  lat: 23.8,
  lng: 90.4,
};

describe("live tuition client", () => {
  it("creates a requirement and unwraps the envelope", async () => {
    const row = { id: "req1", status: "open", expiresAt: "t", createdAt: "t" };
    const client = clientWith({ data: { data: row }, response: ok(201) });
    await expect(createRequirementLive(requirementInput, client)).resolves.toMatchObject({ id: "req1" });
  });

  it("maps problems to the seam code vocabulary (CONFLICT on a second accept)", async () => {
    const client = clientWith({ error: problem("CONFLICT", 409), response: ok(409) });
    await expect(acceptMatchLive("mtc1", client)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(acceptMatchLive("mtc1", client)).rejects.toBeInstanceOf(TuitionApiError);
  });

  it("maps a transport failure to OFFLINE (degraded, never fatal)", async () => {
    const client = {
      GET: () => Promise.reject(new TypeError("network down")),
      POST: () => Promise.reject(new TypeError("network down")),
      PATCH: () => Promise.reject(new TypeError("network down")),
    } as unknown as ApiClient;
    await expect(getMyTutorProfileLive(client)).rejects.toMatchObject({ code: "OFFLINE" });
  });

  it("reads the verification tracker through GET /tuition/tutor-profile", async () => {
    const profile = { id: "p1", status: "pending_review", hasPendingReview: true };
    const client = clientWith({ data: { data: profile }, response: ok() });
    await expect(getMyTutorProfileLive(client)).resolves.toMatchObject({ status: "pending_review" });
  });
});
