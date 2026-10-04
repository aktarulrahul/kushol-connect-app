import { deepLinkFor } from "@/lib/notifications/notifications";
import { requirementForm } from "@/schemas/tuition";
import { TUITION_SUBJECTS } from "@/schemas/tuition";

describe("tuition deep links (TUT-AP-012, additive per 06 §7)", () => {
  it("maps the three tuition payload targets", () => {
    expect(deepLinkFor({ deepLink: "/marketplace/matches" })).toEqual({
      pathname: "/marketplace/matches",
      params: {},
    });
    expect(deepLinkFor({ deepLink: "/marketplace/tutor-setup/evidence" })).toEqual({
      pathname: "/marketplace/tutor-setup/evidence",
      params: {},
    });
    expect(deepLinkFor({ deepLink: "/marketplace/requirements/req_1?x=1" })).toEqual({
      pathname: "/marketplace/requirements/[id]",
      params: { id: "req_1" },
    });
    expect(deepLinkFor({ deepLink: "/marketplace/tutors/tut_9" })).toEqual({
      pathname: "/marketplace/tutors/[id]",
      params: { id: "tut_9" },
    });
  });

  it("unknown targets keep falling back home (edge #10)", () => {
    expect(deepLinkFor({ deepLink: "/marketplace" })).toBeNull();
    expect(deepLinkFor({ deepLink: "/somewhere/else" })).toBeNull();
    expect(deepLinkFor({})).toBeNull();
  });
});

describe("tuition schemas mirror the contract (TUT §6)", () => {
  it("catalogs match the shared subject/class keys", () => {
    expect(TUITION_SUBJECTS).toContain("math");
    expect(TUITION_SUBJECTS).toHaveLength(8);
  });

  it("rejects budgets with min > max and out-of-bounds geo", () => {
    const base = {
      subjects: ["math"],
      classLevel: "class_9",
      genderPref: "any",
      locationArea: "Mirpur",
      lat: 23.8,
      lng: 90.4,
    } as const;
    expect(
      requirementForm.safeParse({ ...base, budgetMin: 4000, budgetMax: 2000 }).success,
    ).toBe(false);
    expect(requirementForm.safeParse({ ...base, budgetMin: 1000, budgetMax: 2000 }).success).toBe(
      true,
    );
    expect(
      requirementForm.safeParse({ ...base, budgetMin: 1000, budgetMax: 2000, lat: 5 }).success,
    ).toBe(false);
  });
});
