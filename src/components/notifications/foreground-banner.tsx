// Foreground banner (NTF-AP-006): in-app only (no tray duplicate), auto-dismiss 5 s, tap =
// deep link + opened report, announced via accessibility live region. Reduced motion skips the
// indicator animation (05 §5).
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import {
  deepLinkFor,
  useForegroundBanner,
} from "@/lib/notifications/notifications";
import { reportOpened } from "@/lib/notifications/use-notifications";

const AUTO_DISMISS_MS = 5_000;

export function ForegroundNotificationBanner() {
  const t = useT();
  const { payload, dismiss } = useForegroundBanner();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!payload) {
      return;
    }
    const timer = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [payload, dismiss]);

  if (!payload) return null;
  const link = deepLinkFor(payload);
  const titleKey = payload.payloadKey.replace(
    "notifications.",
    "notifications.banner.",
  ) as Parameters<typeof t>[0];

  return (
    <Pressable
      accessibilityLiveRegion="polite"
      accessibilityLabel={t(titleKey)}
      className="absolute inset-x-3 top-12 z-50 rounded-2xl border border-border bg-card p-3 shadow-lg"
      onPress={() => {
        // Directed rows only (topic pushes carry no deliveryId — fire-and-forget).
        if (payload.deliveryId) reportOpened(payload.deliveryId);
        dismiss();
        if (link) {
          router.push({ pathname: link.pathname as never, params: link.params });
        } else {
          // Unknown type / deleted target → home fallback (US-004 edge).
          router.replace("/");
        }
      }}
    >
      <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
        {t(titleKey)}
      </Text>
      {!reducedMotion ? <View className="mt-1 h-0.5 w-2/3 rounded-full bg-primary/60" /> : null}
    </Pressable>
  );
}
