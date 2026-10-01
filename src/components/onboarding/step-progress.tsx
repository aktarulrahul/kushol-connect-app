import { View } from "react-native";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding/onboarding-store";

// Onboarding step progress (05 §2.1 StepProgress): one segment per completed step in brand teal,
// the rest in muted track. Announced as "ধাপ ২/৫" for screen readers; purely decorative otherwise.
function StepProgress({ step }: { step: OnboardingStep }) {
  const t = useT();
  const index = ONBOARDING_STEPS.indexOf(step);
  return (
    <View
      role="progressbar"
      accessibilityLabel={t("auth.onboarding.step", {
        step: index + 1,
        total: ONBOARDING_STEPS.length,
      })}
      className="flex-row gap-1.5"
    >
      {ONBOARDING_STEPS.map((s, i) => (
        <View
          key={s}
          className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-primary" : "bg-muted")}
        />
      ))}
    </View>
  );
}

export { StepProgress };
