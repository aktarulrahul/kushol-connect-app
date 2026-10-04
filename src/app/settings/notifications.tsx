// Notification settings (NTF-AP-005): three class switches (optimistic PATCH + channel-aligned),
// device registration row, pilot test-push button (admins), notification history.
import { Pressable, ScrollView, Switch, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { ntfFixtureFlags, type NotificationClass } from "@/lib/notifications/backend";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  useNotificationDeliveries,
  useNotificationPreferences,
  usePatchPreference,
  useSendTestPush,
} from "@/lib/notifications/use-notifications";
import { useT } from "@/i18n/locale-provider";

const CLASS_HINTS: Record<NotificationClass, string> = {
  notices: "notifications.class.notices_hint",
  chat: "notifications.class.chat_hint",
  campaigns: "notifications.class.campaigns_hint",
};

export default function NotificationSettingsScreen() {
  const t = useT();
  const toast = useToast();
  const prefs = useNotificationPreferences();
  const patch = usePatchPreference();
  const deliveries = useNotificationDeliveries(1);
  const testPush = useSendTestPush();
  const me = useAuthStore((s) => s.me);
  const isAdmin = me?.role === "school_admin";

  return (
    <Screen header={<ScreenHeader title={t("notifications.settings.title")} />} className="flex-1">
      <ScrollView contentContainerClassName="gap-3 px-4 pb-10 pt-2">
        <Text variant="muted">{t("notifications.settings.hint")}</Text>

        {prefs.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </View>
        ) : (
          prefs.data?.map((row) => (
            <Pressable
              key={row.class}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-background p-3"
              accessibilityRole="switch"
              accessibilityState={{ checked: !row.muted }}
              accessibilityLabel={`${t(`notifications.class.${row.class}`)} — ${row.muted ? t("notifications.state.off") : t("notifications.state.on")}`}
              onPress={() => {
                patch.mutate({ classId: row.class, muted: !row.muted });
              }}
            >
              <View className="flex-1 pr-3">
                <Text className="font-semibold text-foreground">{t(`notifications.class.${row.class}`)}</Text>
                <Text className="text-xs text-muted-foreground">{t(CLASS_HINTS[row.class] as Parameters<typeof t>[0])}</Text>
              </View>
              <Switch
                pointerEvents="none"
                value={!row.muted}
              />
            </Pressable>
          ))
        )}

        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-muted/30 p-3">
          <View className="flex-1 pr-3">
            <Text className="font-semibold text-foreground">{t("notifications.settings.devices")}</Text>
            <Text className="text-xs text-muted-foreground">
              {t("notifications.settings.registered")}
            </Text>
          </View>
          <Badge>
            <Text>✓</Text>
          </Badge>
        </View>

        {isAdmin ? (
          <Button
            variant="outline"
            disabled={testPush.isPending || ntfFixtureFlags.mode === "offline"}
            onPress={() => {
              testPush.mutate(
                { class: "notices", target: "self" },
                {
                  onSuccess: () => {
                    toast({ title: t("notifications.settings.test_sent"), variant: "success" });
                  },
                  onError: () => {
                    toast({ title: t("errors.rate_limited"), variant: "error" });
                  },
                },
              );
            }}
          >
            <Text>{t("notifications.settings.test_push")}</Text>
          </Button>
        ) : null}

        <View className="pt-2">
          <Text className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("notifications.history.title")}
          </Text>
          {deliveries.isLoading ? (
            <Skeleton className="h-20 rounded-2xl" />
          ) : (deliveries.data?.data.length ?? 0) === 0 ? (
            <EmptyState title={t("notifications.history.empty")} />
          ) : (
            <View className="gap-2">
              {deliveries.data?.data.map((delivery) => (
                <View key={delivery.id} className="rounded-xl border border-border bg-background p-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="flex-1 font-medium text-foreground">
                      {t(`notifications.banner.${delivery.payloadKey.replace("notifications.", "")}` as Parameters<typeof t>[0])}
                    </Text>
                    <Badge variant={delivery.status === "opened" ? "secondary" : "outline"}>
                      <Text className="text-xs">
                        {t(`notifications.status.${delivery.status}` as Parameters<typeof t>[0])}
                      </Text>
                    </Badge>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
