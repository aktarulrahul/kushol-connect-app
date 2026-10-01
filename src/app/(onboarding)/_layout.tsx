import { Stack, usePathname } from "expo-router";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StepProgress } from "@/components/onboarding/step-progress";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding/onboarding-store";

// Onboarding stack (IDT-AP-001): language → role → hierarchy → contact → otp. 160 ms horizontal
// slide between steps, instant swap under reduced motion (05 §5). The step progress sits above
// the stack so the user always knows where they are; each screen re-checks the back-guard on
// entry and bounces an illegal deep link to the furthest legal step. The SSO screen is part of
// the flow but not a numbered step — the progress bar hides there.
function stepFromPath(pathname: string): OnboardingStep | null {
  const last = pathname.split("/").pop() ?? "";
  return (ONBOARDING_STEPS as readonly string[]).includes(last) ? (last as OnboardingStep) : null;
}

export default function OnboardingLayout() {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const step = stepFromPath(pathname);
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {step ? (
        <View className="gap-2 px-4 pb-0 pt-2">
          <StepProgress step={step} />
        </View>
      ) : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: reduceMotion ? "none" : "slide_from_right",
          animationDuration: reduceMotion ? 0 : 160,
        }}
      />
    </View>
  );
}
