// Header notification bell (owner 2026-10-09: Spartens-style — the bell lives in every main
// screen's header, never on the tab bar). Badge = notice-board row count; tap opens /notifications.
// Spread onto ScreenHeader: `<ScreenHeader action={notificationBellAction()} />`.
import { Bell } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";

import { listNotices } from "@/fixtures/notices";
import { useT } from "@/i18n/locale-provider";

export function useNotificationBellAction() {
  const t = useT();
  const notices = useQuery({ queryKey: ["notices", "board"], queryFn: () => listNotices() });
  return {
    icon: Bell,
    accessibilityLabel: t("notifications.tab"),
    badge: notices.data?.length ?? 0,
    onPress: () => {
      router.push("/notifications");
    },
  };
}
