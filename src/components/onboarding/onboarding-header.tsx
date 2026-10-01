import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import {
  ONBOARDING_STEPS,
  useOnboardingStore,
  type OnboardingStep,
} from "@/lib/onboarding/onboarding-store";

// Shared onboarding chrome: back arrow + title. The back press goes one step back through the
// guarded store move (back is always legal — the guard only blocks skipping forward).
const STEP_HREF = {
  language: "/(onboarding)/language",
  role: "/(onboarding)/role",
  hierarchy: "/(onboarding)/hierarchy",
  contact: "/(onboarding)/contact",
  otp: "/(onboarding)/otp",
} as const satisfies Record<OnboardingStep, string>;

function stepHref(step: OnboardingStep) {
  return STEP_HREF[step];
}

function OnboardingHeader({ title }: { title: string }) {
  const router = useRouter();
  const t = useT();
  const step = useOnboardingStore((s) => s.step);
  const goTo = useOnboardingStore((s) => s.goTo);
  const index = ONBOARDING_STEPS.indexOf(step);
  const back = () => {
    const previous = ONBOARDING_STEPS[Math.max(0, index - 1)];
    if (index > 0 && previous && goTo(previous)) {
      router.replace(stepHref(previous));
    }
  };
  return (
    <View className="flex-row items-center gap-1 py-1">
      {index > 0 ? (
        <Pressable
          role="button"
          accessibilityLabel={t("common.actions.back")}
          onPress={back}
          hitSlop={8}
          className="size-11 items-center justify-center rounded-full active:bg-muted"
        >
          <Icon as={ChevronLeft} size={24} className="text-foreground" />
        </Pressable>
      ) : null}
      <Text variant="h2" className="flex-1">
        {title}
      </Text>
    </View>
  );
}

export { OnboardingHeader, stepHref };
