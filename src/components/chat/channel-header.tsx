// Conversation chrome in the Spartens ChannelHeader language (owner 2026-10-09): back circle ·
// centred avatar + name (tap → chat info) · info circle; the pinned-message bar under it; the
// chat-info sheet.
import { ArrowLeft, Info, Pin } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatAvatar, type ChatAvatarKind } from "@/components/chat/chat-avatar";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Icon } from "@/components/ui/icon";
import { CircleAction } from "@/components/ui/screen-header";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function ChannelHeader({
  title,
  subtitle,
  subtitleActive = false,
  avatarKind,
  avatarId,
  onBack,
  onOpenInfo,
}: {
  title: string;
  subtitle?: string;
  /** Teal subtitle (typing… / online) instead of muted. */
  subtitleActive?: boolean;
  avatarKind: ChatAvatarKind;
  avatarId: string;
  onBack: () => void;
  onOpenInfo: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <GlassSurface
      variant="light"
      className="border-b border-border"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-1">
        <CircleAction
          icon={ArrowLeft}
          accessibilityLabel={t("common.actions.back")}
          onPress={onBack}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${t("chat.header.info")}`}
          onPress={onOpenInfo}
          className="min-w-0 flex-1 flex-row items-center justify-center gap-2"
        >
          <ChatAvatar kind={avatarKind} id={avatarId} name={title} size="md" />
          <View className="min-w-0 shrink">
            <Text numberOfLines={1} className="text-base font-medium leading-6 text-foreground">
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                className={cn(
                  "text-xs leading-4",
                  subtitleActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <CircleAction icon={Info} accessibilityLabel={t("chat.header.info")} onPress={onOpenInfo} />
      </View>
    </GlassSurface>
  );
}

/** Pinned-message strip (Spartens PinnedMessage): tap jumps to the pin and advances to the next. */
export function PinnedBar({
  previews,
  activeIndex,
  onPress,
}: {
  previews: readonly string[];
  activeIndex: number;
  onPress: () => void;
}) {
  const t = useT();
  if (previews.length === 0) return null;
  const index = activeIndex % previews.length;
  const preview = previews[index] ?? "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("chat.pinned.label")}: ${preview}`}
      onPress={onPress}
      className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-1.5 active:bg-muted"
    >
      {previews.length > 1 ? (
        <View className="items-center justify-center gap-0.5" accessibilityElementsHidden>
          {previews.map((_, i) => (
            <View
              key={i}
              className={cn("size-1 rounded-full", i === index ? "bg-primary" : "bg-border")}
            />
          ))}
        </View>
      ) : null}
      <View className="size-8 items-center justify-center rounded-full bg-muted">
        <Icon as={Pin} size={16} className="text-muted-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-medium leading-4 text-primary">{t("chat.pinned.label")}</Text>
        <Text numberOfLines={1} className="text-sm leading-5 text-foreground">
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

export function ChatInfoSheet({
  open,
  onOpenChange,
  title,
  avatarKind,
  avatarId,
  details,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  avatarKind: ChatAvatarKind;
  avatarId: string;
  /** Lines under the name — kind, member count, presence. */
  details: readonly string[];
}) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.header.info")}>
      <View className="items-center gap-2 pb-2">
        <ChatAvatar kind={avatarKind} id={avatarId} name={title} size="xl" />
        <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
        {details.map((line) => (
          <Text key={line} className="text-center text-sm text-muted-foreground">
            {line}
          </Text>
        ))}
      </View>
    </Sheet>
  );
}
