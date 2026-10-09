// Chat list row (COM-AP-001) in the Spartens ChatItem language (owner 2026-10-09): 48pt avatar
// with presence dot, medium name, one-line preview (or "Draft: …" in teal), time on the right
// with the unread pill, pin and mute marks underneath. Long-press opens the row menu.
import { useRef } from "react";
import { Pressable, View } from "react-native";
import { BellOff, Pin } from "lucide-react-native";

import { ChatAvatar, chatAvatarKind } from "@/components/chat/chat-avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import type { ChatGroup } from "@/fixtures/chat";
import { chatTitle } from "@/lib/chat/chat-list";
import { cn } from "@/lib/utils";

export type RowAnchor = { x: number; y: number; width: number; height: number };

export function GroupRow({
  group,
  onPress,
  onLongPress,
  online,
  draft,
  pinned = false,
  muted = false,
}: {
  group: ChatGroup;
  onPress: (group: ChatGroup) => void;
  /** Opens the row menu anchored under the row (Spartens ChatItemMenu). */
  onLongPress?: (group: ChatGroup, anchor: RowAnchor) => void;
  /** Fixture/WS presence for DM peers when known. */
  online?: boolean;
  /** Unsent composer text for this chat. */
  draft?: string;
  pinned?: boolean;
  muted?: boolean;
}) {
  const t = useT();
  const ref = useRef<View>(null);
  const isDm = group.kind === "dm";
  const title = chatTitle(group) || t("chat.tab");
  const pending = group.status === "pending_approval";
  const unread = group.unreadCount > 0;
  const draftText = draft?.trim();

  const a11y = [
    title,
    unread ? t("chat.list.unread_a11y", { count: group.unreadCount }) : null,
    pinned ? t("chat.list.pinned_a11y") : null,
    muted ? t("chat.list.muted_a11y") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint={onLongPress ? t("chat.list.menu_a11y") : undefined}
      onPress={() => {
        onPress(group);
      }}
      onLongPress={
        onLongPress
          ? () => {
              ref.current?.measureInWindow((x, y, width, height) => {
                onLongPress(group, { x, y, width, height });
              });
            }
          : undefined
      }
      delayLongPress={300}
      className="flex-row items-center gap-3 px-4 py-2.5 active:bg-muted"
    >
      <ChatAvatar
        kind={chatAvatarKind(group.kind)}
        id={isDm ? (group.peer?.userId ?? group.id) : group.id}
        name={title}
        size="lg"
        online={isDm ? (online ?? false) : undefined}
      />
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            className={cn(
              "min-w-0 flex-1 text-base leading-6 text-foreground",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {title}
          </Text>
          {pending ? (
            <Badge variant="outline" accessibilityLabel={t("chat.group.pending_badge")}>
              <Text className="text-xs">{t("chat.group.pending_badge")}</Text>
            </Badge>
          ) : null}
          {group.lastMessageAt ? (
            <Text
              className={cn(
                "shrink-0 text-xs leading-4",
                unread ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {formatListTime(group.lastMessageAt, t("chat.date.yesterday"))}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          {draftText ? (
            <Text numberOfLines={1} className="min-w-0 flex-1 text-xs leading-4 text-primary">
              {`${t("chat.list.draft")} ${draftText}`}
            </Text>
          ) : group.lastMessagePreview ? (
            <Text
              numberOfLines={1}
              className={cn(
                "min-w-0 flex-1 text-xs leading-4",
                unread ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {group.lastMessagePreview}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {muted ? <Icon as={BellOff} size={16} className="text-muted-foreground" /> : null}
          {pinned ? <Icon as={Pin} size={16} className="text-muted-foreground" /> : null}
          {unread ? (
            <View
              className={cn(
                "min-w-5 items-center justify-center rounded-full px-2 py-0.5",
                muted ? "bg-muted-foreground" : "bg-primary",
              )}
            >
              <Text className="text-xs font-semibold leading-4 text-primary-foreground">
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

/** WhatsApp/Spartens list time: today → HH:mm, yesterday → label, older → dd/mm. */
export function formatListTime(iso: string, yesterdayLabel: string, now = new Date()): string {
  const date = new Date(iso);
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayStart(now) - dayStart(date)) / 86_400_000);
  if (days <= 0) {
    return toBnDigits(
      `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    );
  }
  if (days === 1) return yesterdayLabel;
  return toBnDigits(`${String(date.getDate())}/${String(date.getMonth() + 1)}`);
}
