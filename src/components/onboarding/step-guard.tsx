import { Redirect } from "expo-router";

import { stepHref } from "@/components/onboarding/onboarding-header";
import {
  furthestReachableStep,
  ONBOARDING_STEPS,
  useOnboardingStore,
  type OnboardingStep,
} from "@/lib/onboarding/onboarding-store";

/**
 * Back-guard (IDT-AP-001): render-time check that the screen being entered is not past the
 * first incomplete step. Returns a <Redirect> to bounce illegal deep links to the furthest
 * legal step, or null when entry is allowed. Call it after other hooks, before any JSX.
 */
function useStepGuard(step: OnboardingStep) {
  const draft = useOnboardingStore((s) => s.draft);
  const target = furthestReachableStep(draft);
  if (ONBOARDING_STEPS.indexOf(target) < ONBOARDING_STEPS.indexOf(step)) {
    return <Redirect href={stepHref(target)} />;
  }
  return null;
}

export { useStepGuard };
