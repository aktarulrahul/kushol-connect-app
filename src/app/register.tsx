import { useRouter } from "expo-router";
import { View } from "react-native";

import { AuthIllustration } from "@/components/auth/auth-illustration";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";

// Sign-up landing (owner requirement 2026-10-01): the entry into the onboarding wizard —
// "Create account" continues at the language step, "Sign in" crosses to /login. The wizard's
// own step guard (draft-resume) and the tabs/pending gates take over after that; this screen
// itself is public.

export default function RegisterScreen() {
  const router = useRouter();
  const t = useT();
  return (
    <Screen className="justify-center gap-10 py-10">
      <View className="items-center gap-3">
        <AuthIllustration variant="hero" />
        <Logo size="xl" decorative />
        <Text variant="h1" className="text-center">
          {t("auth.register.title")}
        </Text>
        <Text variant="muted" className="text-center">
          {t("auth.register.subtitle")}
        </Text>
      </View>
      <View className="gap-3">
        <Button
          size="lg"
          className="self-stretch"
          onPress={() => {
            router.push("/(onboarding)/language");
          }}
          testID="register-cta"
        >
          <Text>{t("auth.register.cta")}</Text>
        </Button>
        <View className="flex-row items-center justify-center gap-1">
          <Text variant="muted">{t("auth.register.have_account")}</Text>
          <Button
            variant="link"
            onPress={() => {
              router.push("/login");
            }}
            testID="register-signin-link"
          >
            <Text>{t("auth.register.signin")}</Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
}
