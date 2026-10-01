import { useRouter } from "expo-router";
import { View } from "react-native";

import { AuthIllustration } from "@/components/auth/auth-illustration";
import { OnboardingHeader } from "@/components/onboarding/onboarding-header";
import { Button } from "@/components/ui/button";
import { GitHubMark, GoogleMark } from "@/components/ui/brand-marks";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";
import { color } from "@/theme/tokens";

// SSO (IDT-AP-007, CircleUp auth 8–21 SSO row): Google/GitHub buttons. The real round-trip (system
// browser, state + PKCE, `kusholconnect://` return) arrives with integration — tapping a button
// today drives the fixture seam's simulated return through /auth/sso/return. SSO authenticates,
// never verifies (BR-006); new SSO users continue at the hierarchy step.
export default function SsoScreen() {
  const router = useRouter();
  const t = useT();
  const reset = useOnboardingStore((s) => s.reset);
  const markFromSso = useOnboardingStore((s) => s.markFromSso);

  const continueWith = (provider: "google" | "github") => {
    reset();
    markFromSso(true);
    router.push(`/auth/sso/return?provider=${provider}&intent=login`);
  };

  return (
    <Screen className="justify-center gap-6">
      <OnboardingHeader title={t("auth.login.title")} />
      <AuthIllustration variant="compact" />
      <View className="gap-3">
        <Button
          variant="outline"
          size="lg"
          className="self-stretch"
          onPress={() => {
            continueWith("google");
          }}
        >
          <GoogleMark size={18} />
          <Text>{t("auth.sso.google")}</Text>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="self-stretch"
          onPress={() => {
            continueWith("github");
          }}
        >
          <GitHubMark size={18} fill={color.foreground} />
          <Text>{t("auth.sso.github")}</Text>
        </Button>
      </View>
      <Text variant="muted" className="text-center">
        {t("auth.sso.notice")}
      </Text>
    </Screen>
  );
}
