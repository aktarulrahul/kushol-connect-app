import {
  initialWizardState,
  requirementInputFrom,
  wizardReducer,
  type WizardState,
} from "./wizard";

function state(values: WizardState["values"], step: WizardState["step"] = "review"): WizardState {
  return { ...initialWizardState(values), step };
}

const valid = {
  subjects: ["math", "physics"] as unknown as WizardState["values"]["subjects"],
  classLevel: "class_9" as unknown as WizardState["values"]["classLevel"],
  budgetMin: 2000,
  budgetMax: 4000,
  genderPref: "female" as unknown as WizardState["values"]["genderPref"],
  locationArea: "মিরপুর, ঢাকা",
  lat: 23.8068,
  lng: 90.3667,
};

describe("requirement wizard reducer", () => {
  it("gates each step on its schema and advances with a valid state", () => {
    let s = initialWizardState();
    // step 1 blocked without subjects
    s = wizardReducer(s, { type: "next" });
    expect(s.step).toBe("subjects");
    expect(s.errorKey).toBe("validation.tuition.subjects_required");
    s = wizardReducer(s, { type: "set", patch: { subjects: ["math"], classLevel: "ssc" } });
    s = wizardReducer(s, { type: "next" });
    expect(s.step).toBe("budget");
    // step 2 blocked by min > max
    s = wizardReducer(s, { type: "set", patch: { budgetMin: 5000, budgetMax: 2000, genderPref: "any" } });
    s = wizardReducer(s, { type: "next" });
    expect(s.step).toBe("budget");
    expect(s.errorKey).toBe("validation.tuition.budget_range");
    s = wizardReducer(s, { type: "set", patch: { budgetMin: 2000, budgetMax: 4000 } });
    s = wizardReducer(s, { type: "next" });
    expect(s.step).toBe("location");
    // step 3 blocked outside Bangladesh bounds
    s = wizardReducer(s, { type: "set", patch: { locationArea: "Mirpur", lat: 10, lng: 90 } });
    s = wizardReducer(s, { type: "next" });
    expect(s.errorKey).toBe("validation.tuition.geo_bounds");
    s = wizardReducer(s, { type: "set", patch: { lat: 23.8, lng: 90.4 } });
    s = wizardReducer(s, { type: "next" });
    expect(s.step).toBe("review");
  });

  it("final gate re-checks the merged form and back steps never lose input", () => {
    let s = state(valid, "review");
    expect(s.errorKey).toBeNull();
    s = wizardReducer(s, { type: "back" });
    expect(s.step).toBe("location");
    expect(s.values.budgetMin).toBe(2000); // input preserved
    s = wizardReducer(s, { type: "set", patch: { budgetMax: 1000 } });
    s = wizardReducer(s, { type: "next" });
    // merged gate on review: budget cross-field fails
    s = wizardReducer(s, { type: "next" });
    expect(s.errorKey).toBe("validation.tuition.budget_range");
  });

  it("assembles the contract payload and drops an empty schedule note", () => {
    const input = requirementInputFrom({ ...valid, scheduleNote: "   " });
    expect(input.scheduleNote).toBeUndefined();
    expect(input.subjects).toEqual(["math", "physics"]);
    expect(input.budgetMin).toBeLessThanOrEqual(input.budgetMax);
  });
});
