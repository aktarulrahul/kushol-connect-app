import {
  emptyDraft,
  canVisitStep,
  furthestReachableStep,
  isStepComplete,
  useOnboardingStore,
  type OnboardingDraft,
} from "./onboarding-store";

// IDT-AP-001 — onboarding draft + back-guard: steps complete in order, forward skipping is
// refused, going back is always allowed, and a patch that invalidates a later step pulls the
// current step back. The module-level store survives unmount/remount within the session
// (memory only until AsyncStorage arrives at integration).

const completeThroughContact = (overrides: Partial<OnboardingDraft> = {}): OnboardingDraft => ({
  ...emptyDraft,
  cityId: "city_dhaka",
  schoolId: "school_demo_high",
  classLevel: 10,
  sectionId: "sec_10_a_demo_high",
  fullName: "ডেমো শিক্ষার্থী",
  phone: "01712345678",
  ...overrides,
});

describe("step completeness", () => {
  it("language and role are always complete (bn default, student default)", () => {
    expect(isStepComplete("language", emptyDraft)).toBe(true);
    expect(isStepComplete("role", emptyDraft)).toBe(true);
  });

  it("hierarchy needs city, school, class and section", () => {
    expect(
      isStepComplete("hierarchy", { ...emptyDraft, cityId: "c", schoolId: "s", sectionId: null }),
    ).toBe(false);
    expect(
      isStepComplete("hierarchy", {
        ...emptyDraft,
        cityId: "c",
        schoolId: "s",
        sectionId: "x",
      }),
    ).toBe(false); // classLevel is part of the step — section alone does not imply it
    expect(
      isStepComplete("hierarchy", {
        ...emptyDraft,
        cityId: "c",
        schoolId: "s",
        classLevel: 9,
        sectionId: "x",
      }),
    ).toBe(true);
  });

  it("contact validates name and BD phone", () => {
    expect(isStepComplete("contact", completeThroughContact())).toBe(true);
    expect(isStepComplete("contact", completeThroughContact({ fullName: "ক" }))).toBe(false);
    expect(isStepComplete("contact", completeThroughContact({ phone: "12345" }))).toBe(false);
  });

  it("a guardian additionally needs the student code and relation", () => {
    const guardian = completeThroughContact({ role: "guardian" });
    expect(isStepComplete("contact", guardian)).toBe(false);
    expect(
      isStepComplete("contact", { ...guardian, studentCode: "STU-42", relation: "father" }),
    ).toBe(true);
    expect(
      isStepComplete("contact", { ...guardian, studentCode: "STU-42", relation: "father" }),
    ).toBe(true);
  });
});

describe("back-guard", () => {
  it("stands at the first incomplete step", () => {
    expect(furthestReachableStep(emptyDraft)).toBe("hierarchy"); // language+role default complete
    expect(furthestReachableStep(completeThroughContact())).toBe("otp");
  });

  it("allows any earlier step but refuses skipping forward", () => {
    const draft = completeThroughContact({ cityId: null, schoolId: null, sectionId: null });
    expect(furthestReachableStep(draft)).toBe("hierarchy");
    expect(canVisitStep(draft, "language")).toBe(true);
    expect(canVisitStep(draft, "role")).toBe(true);
    expect(canVisitStep(draft, "hierarchy")).toBe(true);
    expect(canVisitStep(draft, "contact")).toBe(false);
    expect(canVisitStep(draft, "otp")).toBe(false);
  });

  it("refuses the terminal step until everything is complete", () => {
    expect(canVisitStep(completeThroughContact(), "otp")).toBe(true);
    expect(canVisitStep(emptyDraft, "otp")).toBe(false);
  });
});

describe("store", () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it("guards goTo against forward skips", () => {
    const store = useOnboardingStore.getState();
    expect(store.goTo("contact")).toBe(false);
    expect(useOnboardingStore.getState().step).toBe("language");
    expect(store.goTo("role")).toBe(true);
    expect(useOnboardingStore.getState().step).toBe("role");
  });

  it("pulls the step back when a patch invalidates later steps", () => {
    const store = useOnboardingStore.getState();
    store.patch({
      cityId: "city_dhaka",
      schoolId: "school_demo_high",
      sectionId: "sec_9_k_demo_high",
    });
    store.patch({ fullName: "ডেমো", phone: "01712345678" });
    // Draft still misses nothing at hierarchy… jump the guard by patching everything legal:
    store.patch({ role: "student" });
    expect(useOnboardingStore.getState().step).toBe("language"); // never moved unguarded

    // Simulate the legal walk, then break hierarchy from the contact step:
    store.goTo("hierarchy");
    store.patch({ schoolId: "school_demo_high", classLevel: 9, sectionId: "sec_9_a_demo_high" });
    store.patch({ fullName: "ডেমো শিক্ষার্থী", phone: "01712345678" });
    store.goTo("contact");
    expect(useOnboardingStore.getState().step).toBe("contact");
    store.patch({ cityId: "city_chattogram", schoolId: null, sectionId: null });
    expect(useOnboardingStore.getState().step).toBe("hierarchy");
  });

  it("keeps the draft across remounts within the session (resume-safe, memory only)", () => {
    const first = useOnboardingStore.getState();
    first.patch({ fullName: "ডেমো শিক্ষার্থী", phone: "01712345678" });
    first.goTo("hierarchy");
    // A remount reads the same module-level store — no provider, no persistence layer yet.
    const remounted = useOnboardingStore.getState();
    expect(remounted.draft.fullName).toBe("ডেমো শিক্ষার্থী");
    expect(remounted.step).toBe("hierarchy");
  });

  it("reset returns the empty bn/student draft", () => {
    const store = useOnboardingStore.getState();
    store.patch({ locale: "en", role: "guardian", fullName: "x" });
    store.reset();
    const state = useOnboardingStore.getState();
    expect(state.draft).toEqual(emptyDraft);
    expect(state.step).toBe("language");
  });
});
