// Onboarding draft + step guard (IDT-AP-001). The registration draft lives in a zustand store so
// a half-finished registration survives screen changes, back navigation and app switches within
// the session. Memory only today — AsyncStorage persistence (and the "resume after cold start"
// behaviour) arrives with integration; noted as acceptable for Stage 2 in the module work order.
import { create } from "zustand";

import type { GuardianRelation } from "@/schemas/register";
import { isBdPhone } from "@/schemas/register";

export const ONBOARDING_STEPS = ["language", "role", "hierarchy", "contact", "otp"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingDraft = {
  locale: "bn" | "en";
  role: "student" | "guardian" | "teacher";
  cityId: string | null;
  schoolId: string | null;
  /** UI filter only — derived from the school's sections; never sent to register(). */
  classLevel: number | null;
  sectionId: string | null;
  fullName: string;
  /** Raw input; normalized to E.164 only at submit. */
  phone: string;
  studentCode: string;
  relation: GuardianRelation | null;
};

export const emptyDraft: OnboardingDraft = {
  locale: "bn", // bn default regardless of device locale (BR-008)
  role: "student",
  cityId: null,
  schoolId: null,
  classLevel: null,
  sectionId: null,
  fullName: "",
  phone: "",
  studentCode: "",
  relation: null,
};

/** Step completeness — the guard's source of truth; you may never stand past the first gap. */
export function isStepComplete(step: OnboardingStep, draft: OnboardingDraft): boolean {
  switch (step) {
    case "language":
      // The draft type pins locale to bn|en; bn is the default (BR-008) — always complete.
      return true;
    case "role":
      // Same typing: student is the default of the app-facing role union.
      return true;
    case "hierarchy":
      return (
        draft.cityId !== null &&
        draft.schoolId !== null &&
        draft.classLevel !== null &&
        draft.sectionId !== null
      );
    case "contact": {
      const nameOk = draft.fullName.trim().length >= 2 && draft.fullName.trim().length <= 80;
      if (!nameOk) return false;
      if (!isBdPhone(draft.phone)) return false;
      if (draft.role === "guardian") {
        const code = draft.studentCode.trim();
        return code.length >= 3 && code.length <= 20 && draft.relation !== null;
      }
      return true;
    }
    case "otp":
      return false; // the terminal step — only leaving it (success) completes onboarding
  }
}

/** The furthest step the draft may legally occupy: the first incomplete one. */
export function furthestReachableStep(draft: OnboardingDraft): OnboardingStep {
  for (const step of ONBOARDING_STEPS) {
    if (!isStepComplete(step, draft)) return step;
  }
  return "otp";
}

/**
 * The back-guard (IDT-AP-001): a step may be visited when it does not sit past the first
 * incomplete step — going back is always allowed, skipping forward never is.
 */
export function canVisitStep(draft: OnboardingDraft, target: OnboardingStep): boolean {
  const allowed = ONBOARDING_STEPS.indexOf(furthestReachableStep(draft));
  return ONBOARDING_STEPS.indexOf(target) <= allowed;
}

type OnboardingState = {
  draft: OnboardingDraft;
  step: OnboardingStep;
  /** True when the user arrived through an SSO round-trip (hierarchy comes next — 05 §2.5). */
  fromSso: boolean;
  /** Screens render this to bounce an illegal deep link back to the furthest legal step. */
  entryTarget: () => OnboardingStep;
  patch: (partial: Partial<OnboardingDraft>) => void;
  /** Guarded move — refuses to jump past the first incomplete step. */
  goTo: (step: OnboardingStep) => boolean;
  markFromSso: (fromSso: boolean) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: { ...emptyDraft },
  step: "language",
  fromSso: false,
  entryTarget: () => furthestReachableStep(get().draft),
  patch: (partial) => {
    const draft = { ...get().draft, ...partial };
    set({
      draft,
      // A patch can invalidate later steps (e.g. a new city) — keep the guard honest.
      step: canVisitStep(draft, get().step) ? get().step : furthestReachableStep(draft),
    });
  },
  goTo: (step) => {
    if (!canVisitStep(get().draft, step)) return false;
    set({ step });
    return true;
  },
  markFromSso: (fromSso) => {
    set({ fromSso });
  },
  reset: () => {
    set({ draft: { ...emptyDraft }, step: "language", fromSso: false });
  },
}));
