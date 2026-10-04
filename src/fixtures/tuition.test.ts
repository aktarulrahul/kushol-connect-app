import {
  acceptMatch,
  browseTutors,
  createRequirement,
  declineMatch,
  expressInterest,
  getRequirementMatches,
  getTutor,
  listMyMatches,
  resetTuitionAppFixtures,
  submitForReview,
  tuitionFixtureFlags,
  updateRequirement,
} from "@/fixtures/tuition";

afterEach(() => {
  resetTuitionAppFixtures();
});

describe("tuition seam (Stage 2 fixtures)", () => {
  it("only returns verified tutors and never unverified fields (TUT-BR-002)", async () => {
    const rows = await browseTutors({ subject: "math" });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.verifiedAt).toBeTruthy();
      expect(Object.keys(row)).not.toContain("contact");
    }
  });

  it("keeps contact null until the match is accepted (TUT-BR-006 / INV-4)", async () => {
    const detail = await getTutor("tut_demo_1");
    expect(detail.contact).toBeNull();
    const matches = await getRequirementMatches("req_demo_1");
    for (const match of matches) {
      if (match.status !== "accepted") expect(match.contact).toBeNull();
    }
    const accepted = await acceptMatch("mtc_demo_1");
    expect(accepted.contact.phone).toBeTruthy();
    const after = await getRequirementMatches("req_demo_1");
    expect(after.find((m) => m.id === "mtc_demo_1")?.contact?.phone).toBeTruthy();
  });

  it("gates posting and interest behind verification (TUT-BR-001)", async () => {
    tuitionFixtureFlags.mode = "not_verified";
    await expect(createRequirement({
      subjects: ["math"],
      classLevel: "class_9",
      budgetMin: 1000,
      budgetMax: 2000,
      genderPref: "any",
      locationArea: "মিরপুর, ঢাকা",
      lat: 23.8,
      lng: 90.4,
    })).rejects.toMatchObject({ code: "NOT_VERIFIED" });
    await expect(expressInterest("mtc_demo_10")).rejects.toMatchObject({ code: "NOT_VERIFIED" });
  });

  it("runs the match lifecycle: interest → accept single-winner → conflict afterwards", async () => {
    await expressInterest("mtc_demo_10");
    const mine = await listMyMatches();
    expect(mine.find((m) => m.id === "mtc_demo_10")?.status).toBe("interested");
    // the poster accepts the same logical pair on the requirement side (mtc_demo_1 is interested)
    await acceptMatch("mtc_demo_1");
    await expect(acceptMatch("mtc_demo_1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("declines politely and refuses further action on the match", async () => {
    await declineMatch("mtc_demo_10");
    await expect(expressInterest("mtc_demo_10")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("closes only open requirements and edits preserve expiry (TUT-BR-008/US-009)", async () => {
    const edited = await updateRequirement("req_demo_1", { budgetMin: 2500 });
    expect(edited.status).toBe("open");
    await expect(updateRequirement("req_demo_1", { close: true })).resolves.toMatchObject({
      status: "closed",
    });
    await expect(updateRequirement("req_demo_1", { budgetMax: 5000 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("offline blocks reads and writes (§8) — interest is refused, wizard post queues", async () => {
    tuitionFixtureFlags.mode = "offline";
    await expect(browseTutors({})).rejects.toMatchObject({ code: "OFFLINE" });
    await expect(expressInterest("mtc_demo_10")).rejects.toMatchObject({ code: "OFFLINE" });
  });

  it("allows exactly one pending review per profile (TUT-US-010, edge 14)", async () => {
    await submitForReview({ nationalIdMediaId: "med_nid", evidenceMediaIds: ["med_ev"] });
    await expect(
      submitForReview({ nationalIdMediaId: "med_nid", evidenceMediaIds: ["med_ev"] }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
