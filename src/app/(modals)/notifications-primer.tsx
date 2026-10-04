// Permission primer (NTF-AP-002): value-first bn/en explainer, in-context OS ask, then the
// denied/permanently-denied explainer. Shown once after sign-in for users who haven't chosen.
// Each class row announces as one unit; permanent denial opens the OS app settings (no dead end).
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Megaphone, MessageCircle, Target } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { registerCurrentDevice } from "@/lib/notifications/notifications";
import { useLocale, useT } from "@/i18n/locale-provider";
import type { NotificationClass } from "@/lib/notifications/backend";

const PRIMER_ROWS: Array<{ class: NotificationClass; Icon: typeof Megaphone }> = [
  { class: "notices", Icon: Megaphone },
  { class: "chat", Icon: MessageCircle },
  { class: "campaigns", Icon: Target },
];

export default function NotificationsPrimerModal() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [denied, setDenied] = useState(false);
  const [permanent, setPermanent] = useState(false);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    try {
      const settings = await Notifications.requestPermissionsAsync();
      if (!settings.granted) {
        setDenied(true);
        // Permanently denied → the only path is the OS app settings (06 §2.1, no dead end).
        setPermanent(!settings.canAskAgain);
        return;
      }
      await registerCurrentDevice(locale);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t("notifications.tab")} />}>
      <View className="flex-1 justify-center gap-4 px-6">
        <Text variant="h3" className="text-center">
          {t("notifications.primer.title")}
        </Text>
        <Text variant="muted" className="text-center">
          {t("notifications.primer.body")}
        </Text>
        <View className="gap-2 rounded-2xl border border-border bg-card p-3">
          {PRIMER_ROWS.map(({ class: classId, Icon }) => (
            <Pressable
              key={classId}
              className="flex-row items-center gap-3 py-2"
              accessible
              accessibilityRole="text"
              accessibilityLanguage={locale}
              accessibilityLabel={`${t(`notifications.class.${classId}`)} — ${t(`notifications.class.${classId}_hint` as Parameters<typeof t>[0])}`}
            >
              <Icon size={20} className="text-primary" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  {t(`notifications.class.${classId}`)}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {t(`notifications.class.${classId}_hint` as Parameters<typeof t>[0])}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        {permanent ? (
          <Button variant="outline" onPress={() => void Linking.openSettings()}>
            <Text>{t("notifications.primer.settings")}</Text>
          </Button>
        ) : null}
        {denied && !permanent ? (
          <Text className="text-center text-sm text-warning">{t("notifications.primer.denied")}</Text>
        ) : null}
        <View className="gap-2 pt-2">
          <Button onPress={() => void ask()} disabled={busy}>
            <Text>{t("notifications.primer.allow")}</Text>
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              router.back();
            }}
          >
            <Text>{t("notifications.primer.later")}</Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
}
