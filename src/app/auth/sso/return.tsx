import { useRouter } from "expo-router";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";

// SSO return (IDT-AP-007). The api callback sets a web session cookie and redirects to the web
// route `/auth/sso/return?sso=`. The OpenAPI spec has no mobile exchange that turns that marker
// into a refresh token, so this screen cannot complete a session. Phone and email OTP stay
// available on the login screen. See 08-gaps.
export default function SsoReturnScreen() {
  const router = useRouter();
  const t = useT();

  return (
    <Screen className="justify-center gap-4">
      <ErrorState description={t("auth.sso_return.failed")} />
      <Button
        variant="outline"
        onPress={() => {
          router.replace("/login");
        }}
      >
        <Text>{t("auth.login.title")}</Text>
      </Button>
    </Screen>
  );
}
