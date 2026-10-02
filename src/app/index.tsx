import { Redirect, useRouter } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Screen } from "@/components/ui/screen";
import { LanguageToggle } from "@/components/ui/segmented-pill";
import { Text } from "@/components/ui/text";
import { DevStatus } from "@/dev/dev-status";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";

// Entry screen. After a cold start / reload the root splash waits for restore; this route then
// sends a signed-in user to chat (or verification-pending). Only a finished anon restore sees
// the register / login CTAs — never flash login while status is still idle/checking.
export default function Index() {
  const t = useT();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const me = useAuthStore((s) => s.me);

  if (status === "idle" || status === "checking") return null;

  if (status === "authed") {
    return (
      <Redirect href={me?.status === "PENDING" ? "/verification-pending" : "/chat"} />
    );
  }

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
