import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Screen } from "@/components/ui/screen";
import { LanguageToggle } from "@/components/ui/segmented-pill";
import { Text } from "@/components/ui/text";
import { DevStatus } from "@/dev/dev-status";
import { useT } from "@/i18n/locale-provider";

// Entry screen. With 03-identity-access the flows behind the buttons are real: registration
// (onboarding) and login. A signed-in user lands here only by deep link; the tabs gate and the
// pending gate take over from there.
export default function Index() {
  const t = useT();
  const router = useRouter();
  return (
    <Screen className="min-h-full justify-center gap-8 py-16">
      <View className="items-center gap-4">
        <Logo size="hero" decorative />
        <Text variant="h1" className="sr-only">
          {t("common.app_name")}
        </Text>
        <Text variant="lead" className="text-center">
          {t("common.coming_soon")}
        </Text>
        <LanguageToggle className="self-center" />
      </View>
      <View className="gap-3">
        <Button
          size="lg"
          onPress={() => {
            router.push("/(onboarding)/language");
          }}
        >
          <Text>{t("auth.onboarding.start")}</Text>
        </Button>
        <Button
          variant="outline"
          size="lg"
          onPress={() => {
            router.push("/login");
          }}
        >
          <Text>{t("auth.login.title")}</Text>
        </Button>
      </View>
      {__DEV__ && <DevStatus />}
    </Screen>
  );
}
