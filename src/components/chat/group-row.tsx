// Chat list row (COM-AP-001): WhatsApp density in CircleUp tokens — 48pt avatar, bold unread
// name, teal unread badge under time, muted read rows. Docs/design-reference §6.2.
import { Pressable, View } from "react-native";

import { ChatAvatar, chatAvatarKind } from "@/components/chat/chat-avatar";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import type { ChatGroup } from "@/fixtures/chat";
import { cn } from "@/lib/utils";

export function GroupRow({
  group,
  onPress,
  online,
}: {
  group: ChatGroup;
  onPress: (group: ChatGroup) => void;
  /** Fixture/WS presence for DM peers when known. */
  online?: boolean;
}) {
  const t = useT();
  const isDm = group.kind === "dm";
  const title = isDm ? (group.peer?.name ?? t("chat.tab")) : (group.name ?? "");
  const pending = group.status === "pending_approval";
  const unread = group.unreadCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        onPress(group);
      }}
      className="flex-row items-center gap-2.5 px-3 py-2 active:bg-muted/60"
    >
      <ChatAvatar
        kind={chatAvatarKind(group.kind)}
        id={isDm ? (group.peer?.userId ?? group.id) : group.id}
        name={title}
        size="lg"
        online={isDm ? (online ?? false) : undefined}
      />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            className={cn(
              "min-w-0 flex-1 text-[15px] leading-5 text-foreground",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {title}
          </Text>
          {pending ? (
            <Badge variant="outline" accessibilityLabel={t("chat.group.pending_badge")}>
              <Text className="text-[10px]">{t("chat.group.pending_badge")}</Text>
            </Badge>
          ) : null}
          {group.lastMessageAt ? (
            <Text
              className={cn(
                "shrink-0 text-[11px] leading-4",
                unread ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              {formatTime(group.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <View className="mt-px flex-row items-center gap-2">
          {group.lastMessagePreview ? (
            <Text
              numberOfLines={1}
              className={cn(
                "min-w-0 flex-1 text-[13px] leading-4",
                unread ? "font-medium text-foreground/80" : "text-muted-foreground",
              )}
            >
              {group.lastMessagePreview}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {unread ? (
            <View
              className="min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5"
              accessibilityLabel={toBnDigits(group.unreadCount)}
            >
              <Text className="text-[11px] font-bold text-primary-foreground">
                {toBnDigits(group.unreadCount > 99 ? "99+" : group.unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** bn numerals for time + badges (05 §6 responsive: `১০:২৪`). */
export function toBnDigits(value: number | string, locale: string = "bn"): string {
  const s = String(value);
  if (locale !== "bn") return s;
  const digits = "০১২৩৪৫৬৭৮৯";
  return s.replace(/\d/g, (d) => digits[Number(d)] ?? "");
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return toBnDigits(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );
}
