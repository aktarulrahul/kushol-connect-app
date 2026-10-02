// Small chat chrome: typing dots (COM-AP-011), offline banner (COM-AP-017), date separators.
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { toBnDigits } from "@/components/chat/group-row";

/** "টাইপ করছেন…" with 3-dot loop; reduced motion renders the static text only (05 §5). */
export function TypingIndicator({ names, reducedMotion }: { names: string[]; reducedMotion: boolean }) {
  const t = useT();
  if (names.length === 0) return null;
  return (
    <View className="px-4 pb-1" accessibilityLiveRegion="polite" accessibilityLabel={t("chat.group.typing")}>
      <View className="flex-row items-center gap-1 self-start rounded-full bg-muted px-3 py-1">
        {reducedMotion ? null : (
          <View className="flex-row gap-0.5">
            {[0, 1, 2].map((i) => (
              <View key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" style={{ opacity: 1 - i * 0.3 }} />
            ))}
          </View>
        )}
        <Text className="text-xs text-muted-foreground">{t("chat.group.typing")}</Text>
      </View>
    </View>
  );
}

/** Offline banner — queued sends show the clock state until replay (US-015). */
export function OfflineBanner({ visible }: { visible: boolean }) {
  const t = useT();
  if (!visible) return null;
  return (
    <View className="bg-warning-soft px-4 py-1.5" accessibilityLiveRegion="polite">
      <Text className="text-center text-xs text-warning">{t("chat.offline.banner")}</Text>
    </View>
  );
}

/** bn date separator — a heading for screen readers (05 §7 a11y). */
export function DateSeparator({ iso }: { iso: string }) {
  const t = useT();
  const d = new Date(iso);
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  const label =
    days === 0
      ? t("chat.date.today")
      : days === 1
        ? t("chat.date.yesterday")
        : `${toBnDigits(d.getDate())}/${toBnDigits(d.getMonth() + 1)}`;
  return (
    <View className="items-center py-1" accessibilityRole="header">
      <Text className="text-[11px] font-medium text-muted-foreground">{`── ${label} ──`}</Text>
    </View>
  );
}

/** Section header for the chat list segments' groupings, reused by notices. */
export function ListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-1">
      <Text className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}
