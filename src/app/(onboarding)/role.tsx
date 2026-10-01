import { useRouter } from "expo-router";
import { Earth } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { AuthIllustration } from "@/components/auth/auth-illustration";
import { OnboardingHeader, stepHref } from "@/components/onboarding/onboarding-header";
import { useStepGuard } from "@/components/onboarding/step-guard";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";

// Step 2 — role (IDT-AP-003): student / guardian / teacher as radio cards; admins are pointed at
// the web portal (no admin surfaces in the app — 05 §1). Picking guardian switches on the link
// fields shown later at the contact step.
const ROLES = [
  { value: "student", label: "auth.role.student", hint: "auth.role.student_hint" },
  { value: "guardian", label: "auth.role.guardian", hint: "auth.role.guardian_hint" },
  { value: "teacher", label: "auth.role.teacher", hint: "auth.role.teacher_hint" },
] as const;

export default function RoleScreen() {
  const guard = useStepGuard("role");
  const router = useRouter();
  const t = useT();
  const draft = useOnboardingStore((s) => s.draft);
  const patch = useOnboardingStore((s) => s.patch);
  const goTo = useOnboardingStore((s) => s.goTo);
  if (guard) return guard;

  const next = () => {
    if (goTo("hierarchy")) router.push(stepHref("hierarchy"));
  };
  return (
    <Screen className="justify-center gap-6 pt-1">
      <OnboardingHeader title={t("auth.role.title")} />
      <AuthIllustration variant="compact" />
      <View role="radiogroup" accessibilityLabel={t("auth.role.title")} className="gap-3">
        {ROLES.map((role) => {
          const selected = draft.role === role.value;
          return (
            <Pressable
              key={role.value}
              role="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(role.label)}
              onPress={() => {
                patch({ role: role.value });
              }}
              className={`min-h-16 flex-row items-center gap-3 rounded-lg border bg-card p-4 ${
                selected ? "border-primary" : "border-border"
              }`}
            >
              <View
                className={`size-5 items-center justify-center rounded-full border ${
                  selected ? "border-primary" : "border-input"
                }`}
              >
                {selected ? <View className="size-2.5 rounded-full bg-primary" /> : null}
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-semibold">{t(role.label)}</Text>
                <Text variant="muted">{t(role.hint)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row items-center gap-2 rounded-lg bg-muted p-3">
        <Icon as={Earth} size={18} className="text-muted-foreground" />
        <Text variant="muted" className="flex-1">
          {t("auth.role.admin_hint")}
        </Text>
      </View>
      <Button size="lg" className="self-stretch" onPress={next}>
        <Text>{t("common.actions.next")}</Text>
      </Button>
    </Screen>
  );
}
