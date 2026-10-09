// Small chat chrome in the Spartens channel language (owner 2026-10-09): typing pill with the
// typers' avatars (COM-AP-011), offline banner (COM-AP-017), date and unread pills, the
// jump-to-latest button and the empty-room card.
import { ChevronDown, MessagesSquare } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOutDown, ReduceMotion } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useT } from "@/i18n/locale-provider";
import { toBnDigits } from "@/components/chat/group-row";
import { motion } from "@/theme/tokens";

const enter = FadeInDown.duration(motion.duration.base).reduceMotion(ReduceMotion.System);
const exit = FadeOutDown.duration(motion.duration.fast).reduceMotion(ReduceMotion.System);

/** Typers' avatars (groups) + "typing…" pill above the composer (Spartens). */
export function TypingIndicator({
  typers,
  showAvatars,
}: {
  typers: readonly { userId: string; name: string }[];
  showAvatars: boolean;
}) {
  const t = useT();
  if (typers.length === 0) return null;
  return (
    <Animated.View
      entering={enter}
      exiting={exit}
      className="mb-1.5 ml-4 flex-row items-center gap-2.5"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t("chat.group.typing")}
    >
      {showAvatars ? (
        <View className="flex-row items-center">
          {typers.slice(0, 3).map((typer, index) => (
            <View key={typer.userId} className={index > 0 ? "-ml-2" : undefined}>
              <UserAvatar name={typer.name} id={typer.userId} size="sm" placeholder="person" />
            </View>
          ))}
        </View>
      ) : null}
      <View className="rounded-xl rounded-tl-none bg-card px-2.5 py-1 shadow-sm">
        <Text className="text-xs font-medium text-primary">{t("chat.group.typing")}</Text>
      </View>
    </Animated.View>
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

/** Day break — Spartens centred card pill (05 §7 a11y: exposed as a heading). */
export function DateSeparator({ iso }: { iso: string }) {
  const t = useT();
  const d = new Date(iso);
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  const dayMonth = `${toBnDigits(d.getDate())}/${toBnDigits(d.getMonth() + 1)}`;
  const label =
    days === 0
      ? t("chat.date.today")
      : days === 1
        ? t("chat.date.yesterday")
        : d.getFullYear() === now.getFullYear()
          ? dayMonth
          : `${dayMonth}/${toBnDigits(d.getFullYear())}`;
  return (
    <View className="items-center justify-center py-1" accessibilityRole="header">
      <View className="rounded-full bg-card px-2.5 py-1 shadow-sm">
        <Text className="text-xs text-muted-foreground">{label}</Text>
      </View>
    </View>
  );
}

/** "N new unread messages" above the first unread message on open (Spartens UnreadText). */
export function UnreadPill({ count }: { count: number }) {
  const t = useT();
  if (count <= 0) return null;
  return (
    <View className="items-center py-1">
      <View className="rounded-full bg-primary-soft px-3 py-1">
        <Text className="text-xs text-primary">{t("chat.unread.count", { count })}</Text>
      </View>
    </View>
  );
}

/** Floating jump-to-latest button, shown once the reader scrolls away from the newest message. */
export function ScrollToBottomButton({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  const t = useT();
  if (!visible) return null;
  return (
    <Animated.View entering={enter} exiting={exit} className="absolute bottom-2 right-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("chat.scroll_bottom")}
        onPress={onPress}
        hitSlop={6}
        className="size-9 items-center justify-center rounded-full bg-primary shadow-md active:opacity-80"
      >
        <Icon as={ChevronDown} size={18} className="text-primary-foreground" />
      </Pressable>
    </Animated.View>
  );
}

/** Empty room — Spartens "No Conversation" card: icon, title, respectful-tone note, CTA pill. */
export function EmptyConversation() {
  const t = useT();
  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.System)}
      className="flex-1 items-center justify-center gap-3 px-8 py-16"
    >
      <View className="size-20 items-center justify-center rounded-full bg-primary-soft">
        <Icon as={MessagesSquare} size={36} className="text-primary" />
      </View>
      <Text className="text-center text-xl font-medium text-foreground">
        {t("chat.empty.title")}
      </Text>
      <Text className="text-center text-xs text-muted-foreground">{t("chat.empty.body")}</Text>
      <View className="rounded-full bg-card px-2.5 py-1 shadow-sm">
        <Text className="text-xs text-muted-foreground">{t("chat.empty.cta")}</Text>
      </View>
    </Animated.View>
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
