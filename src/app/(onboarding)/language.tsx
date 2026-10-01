import { useRouter } from "expo-router";
import { View } from "react-native";

import { AuthIllustration } from "@/components/auth/auth-illustration";
import { OnboardingHeader, stepHref } from "@/components/onboarding/onboarding-header";
import { useStepGuard } from "@/components/onboarding/step-guard";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { LOCALES } from "@/i18n";
import { useLocale, useT } from "@/i18n/locale-provider";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";

// Step 1 — language (IDT-AP-002, BR-008): Bengali preselected regardless of the device locale
// (the LocaleProvider itself boots on bn; nothing reads the OS locale). One tap switches, and
// the whole screen tree re-renders immediately.
export default function LanguageScreen() {
  const guard = useStepGuard("language");
  const router = useRouter();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const draft = useOnboardingStore((s) => s.draft);
  const patch = useOnboardingStore((s) => s.patch);
  const goTo = useOnboardingStore((s) => s.goTo);
  if (guard) return guard;

  const choose = (next: "bn" | "en") => {
    setLocale(next);
    patch({ locale: next });
  };
  const next = () => {
    patch({ locale });
    if (goTo("role")) router.push(stepHref("role"));
  };
  return (
    <Screen className="justify-center gap-8 pt-1">
      <OnboardingHeader title={t("auth.language.title")} />
      <AuthIllustration variant="compact" />
      <View className="items-center gap-4 pt-8">
        <SegmentedPill
          accessibilityLabel={t("common.language.label")}
          value={draft.locale}
          onChange={choose}
          segments={LOCALES.map((l) => ({
            value: l,
            label: t(l === "bn" ? "common.language.bn" : "common.language.en"),
          }))}
        />
        <Text variant="muted" className="text-center">
          {t("auth.language.hint")}
        </Text>
      </View>
      <View className="gap-2">
        <Button size="lg" className="self-stretch" onPress={next}>
          <Text>{t("common.actions.next")}</Text>
        </Button>
        <View className="flex-row items-center justify-center gap-1">
          <Text variant="muted">{t("auth.register.have_account")}</Text>
          <Button
            variant="link"
            onPress={() => {
              router.push("/login");
            }}
            testID="language-signin-link"
          >
            <Text>{t("auth.register.signin")}</Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
}
