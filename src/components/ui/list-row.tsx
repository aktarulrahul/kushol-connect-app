import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";

import { UnreadBadge } from "./indicators";
import { Text } from "./text";

// List row (DSN-AP-018, design-reference §6.2 — CircleUp 58): avatar slot, title (1 line),
// preview (1 line, ellipsis), trailing time + unread badge, long-press slot for row actions.
// Used by the chat list (05), notifications (06) and member lists. Preview truncation is the
// documented exception to "no numberOfLines on user content": a list row is a summary, the full
// message is one tap away.

type ListRowProps = {
  leading?: ReactNode;
  title: string;
  preview?: string;
  time?: string;
  unread?: number;
  /** Bold title/preview when there is something new. */
  emphasised?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
  className?: string;
};

function ListRow({
  leading,
  title,
  preview,
  time,
  unread = 0,
  emphasised = unread > 0,
  trailing,
  onPress,
  onLongPress,
  accessibilityHint,
  className,
}: ListRowProps) {
  return (
    <Pressable
      role={onPress ? "button" : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityHint={accessibilityHint}
      className={cn("min-h-16 flex-row items-center gap-3 px-4 py-2.5 active:bg-muted", className)}
    >
      {leading}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className={cn("text-base", emphasised ? "font-semibold" : "font-medium")}
        >
          {title}
        </Text>
        {preview ? (
          <Text
            numberOfLines={1}
            className={cn("text-sm", emphasised ? "text-foreground" : "text-muted-foreground")}
          >
            {preview}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-1">
        {time ? (
          <Text className={cn("text-xs", unread > 0 ? "text-primary" : "text-muted-foreground")}>
            {time}
          </Text>
        ) : null}
        <UnreadBadge count={unread} />
        {trailing}
      </View>
    </Pressable>
  );
}

export { ListRow };
