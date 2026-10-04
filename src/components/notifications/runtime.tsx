// Notifications runtime mount (Stage 5): attaches the one-time push runtime (foreground handler,
// live listener, heartbeat — NTF-AP-003/006) and renders the foreground banner. Channels are
// re-ensured when the locale changes so their bn/en names match the active language (OQ-2).
import { useEffect } from "react";

import { ForegroundNotificationBanner } from "@/components/notifications/foreground-banner";
import { useLocale } from "@/i18n/locale-provider";
import {
  attachNotificationsRuntime,
  ensureNotificationChannels,
} from "@/lib/notifications/notifications";

export function NotificationsRuntime() {
  const { locale } = useLocale();

  useEffect(() => {
    attachNotificationsRuntime(locale);
    void ensureNotificationChannels(locale).catch(() => undefined);
  }, [locale]);

  return <ForegroundNotificationBanner />;
}
