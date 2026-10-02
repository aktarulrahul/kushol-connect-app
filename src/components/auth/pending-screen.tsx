import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CircleAlert, Clock } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { getMyVerificationRequest } from "@/fixtures/auth";

// The friendly pending screen (IDT-AP-008, 05 §2.4): a plain heading + numbered steps in reading
// order — no motion carries meaning. Shown by /verification-pending and rendered in place of tab
// content by the /(tabs) gate while getMe().status === "PENDING". A ≤ 30 s poll opens the gate
// mid-session without re-login (IDT-US-006); a rejected request shows the reason + resubmit.
const GATE_POLL_MS = 30_000;
const STEP_KEYS = [
  "verification.pending.step_1",
  "verification.pending.step_2",
  "verification.pending.step_3",
] as const;

function PendingScreen() {
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const me = useAuthStore((s) => s.me);
  const stale = useAuthStore((s) => s.stale);
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const signOut = useAuthStore((s) => s.signOut);
  const celebrated = useRef(false);

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  // Status poll ≤ 30 s (BR-007: server cache invalidates on change, so one poll is enough).
  useEffect(() => {
    const timer = setInterval(() => {
      void refreshMe();
    }, GATE_POLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [refreshMe]);

  useEffect(() => {
    if (me?.status === "VERIFIED" && !celebrated.current) {
      celebrated.current = true;
      toast({ title: t("verification.approved_toast"), variant: "success" });
      router.replace("/chat");
    }
  }, [me?.status, router, t, toast]);

  const request = useQuery({
    queryKey: ["auth", "my_request"],
    queryFn: getMyVerificationRequest,
    enabled: me?.status === "PENDING",
    refetchInterval: GATE_POLL_MS,
  });
  const rejected = request.data?.status === "REJECTED" ? request.data : null;

  if (status !== "authed" || !me) {
    return (
      <Screen className="justify-center gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="gap-2">
        <Text variant="h1">{t("verification.pending.title")}</Text>
        <Text variant="p">{t("verification.pending.body")}</Text>
        {stale ? (
          <Text variant="muted" accessibilityLiveRegion="polite">
            {t("verification.pending.stale")}
          </Text>
        ) : null}
      </View>

      {rejected ? (
        <View className="gap-2 rounded-lg border border-destructive bg-destructive-soft p-4">
          <View className="flex-row items-center gap-2">
            <View className="size-10 items-center justify-center rounded-full bg-card">
              <Icon as={CircleAlert} size={20} className="text-destructive" />
            </View>
            <Text variant="label" className="flex-1">
              {t("verification.rejected.title")}
            </Text>
          </View>
          <Text variant="small">
            {t("verification.rejected.reason")}: {rejected.decisionReason}
          </Text>
          <Button
            variant="destructive"
            className="self-start"
            onPress={() => {
              router.push("/(onboarding)/contact");
            }}
          >
            <Text>{t("verification.rejected.resubmit")}</Text>
          </Button>
        </View>
      ) : (
        <View className="gap-3">
          <Text variant="h3">{t("verification.pending.steps_title")}</Text>
          <View className="gap-2">
            {STEP_KEYS.map((key, index) => (
              <View key={key} className="flex-row items-start gap-3">
                <Text tabular className="text-base font-semibold text-primary">
                  {index + 1}.
                </Text>
                <Text className="flex-1 text-base">{t(key)}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row items-center gap-2 rounded-lg bg-muted p-3">
            <Icon as={Clock} size={16} className="text-muted-foreground" />
            <Text variant="muted">{t("verification.pending.sla")}</Text>
          </View>
        </View>
      )}

      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => {
            router.push("/settings");
          }}
        >
          <Text>{t("verification.pending.settings")}</Text>
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onPress={() => {
            void signOut().then(() => {
              router.replace("/login");
            });
          }}
        >
          <Text>{t("verification.pending.logout")}</Text>
        </Button>
      </View>
    </Screen>
  );
}

export { PendingScreen };
