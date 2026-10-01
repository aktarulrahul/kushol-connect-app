import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/empty-state";
import { Screen, Spinner } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";
import { completeSsoReturn } from "@/fixtures/auth";

// SSO deep-link return (IDT-AP-007): the provider callback redirects here through the app scheme
// (`kusholconnect://auth/sso/return`; Expo Go names the scheme `exp+kushol-connect://`). Stage 2
// drives it directly from the SSO buttons; the fixture seam simulates the token exchange. The
// outcomes route per BR-006: existing account → session (pending gate if PENDING); new account →
// the hierarchy step of onboarding; link intent (settings) → toast + back to settings.
export default function SsoReturnScreen() {
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { provider: providerParam, intent: intentParam } = useLocalSearchParams<{
    provider?: string;
    intent?: string;
  }>();
  const signIn = useAuthStore((s) => s.signIn);
  const reset = useOnboardingStore((s) => s.reset);
  const markFromSso = useOnboardingStore((s) => s.markFromSso);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const provider = providerParam === "github" ? "github" : "google";
    const intent = intentParam === "link" ? "link" : "login";
    completeSsoReturn({ provider, intent })
      .then((outcome) => {
        if (cancelled) return;
        if (outcome.outcome === "signed_in") {
          signIn(outcome.user, outcome.tokens);
          router.replace(outcome.user.status === "PENDING" ? "/verification-pending" : "/chat");
          return;
        }
        if (outcome.outcome === "needs_registration") {
          reset();
          markFromSso(true);
          router.replace("/(onboarding)/hierarchy");
          return;
        }
        toast({ title: t("auth.link.done"), variant: "success" });
        router.replace("/settings");
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [providerParam, intentParam, attempt, signIn, reset, markFromSso, router, toast, t]);

  if (failed) {
    return (
      <Screen className="justify-center gap-4">
        <ErrorState
          description={t("auth.sso_return.failed")}
          onRetry={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
        />
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
  return (
    <Screen className="justify-center gap-4">
      <Spinner label={t("auth.sso_return.title")} />
    </Screen>
  );
}
