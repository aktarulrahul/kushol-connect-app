import { View } from "react-native";

import { Logo } from "@/components/ui/logo";
import { Screen } from "@/components/ui/screen";
import { LanguageToggle } from "@/components/ui/segmented-pill";
import { Text } from "@/components/ui/text";
import { DevStatus } from "@/dev/dev-status";
import { useT } from "@/i18n/locale-provider";

// Holding screen until 03-identity-access builds onboarding — built only from 02 parts: the logo
// through <Logo/>, copy through the catalogs, colours and type from the tokens.
export default function Index() {
  const t = useT();
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
      {__DEV__ && <DevStatus />}
    </Screen>
  );
}
