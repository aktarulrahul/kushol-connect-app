// Starred messages of one chat (05 · owner 2026-10-19): the viewer's private bookmarks, newest
// star first, opened from the chat-info "Starred messages" row. Tapping a row closes the sheet
// and jumps to the message in the room; the star button unstars it. Older stars page in through
// the api's `nextBefore` cursor. Stars are private — nothing here reaches other members.
import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";

import { formatListTime } from "@/components/chat/group-row";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { ChatMessage } from "@/fixtures/chat";
import { useT } from "@/i18n/locale-provider";
import { starredEntries } from "@/lib/chat/starred";
import { useStarredMessages } from "@/lib/chat/use-chat";
import { color } from "@/theme/tokens";

export function StarredMessagesSheet({
  open,
  onOpenChange,
  groupId,
  meId,
  previewOf,
  onJump,
  onUnstar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  /** The viewer — their own messages are authored "You". */
  meId: string;
  /** One-line preview (text, caption or the attachment label) — the screen's labels. */
  previewOf: (message: ChatMessage) => string;
  /** Row tap: the sheet closes first, then the room scrolls to the message. */
  onJump: (message: ChatMessage) => void;
  onUnstar: (message: ChatMessage) => void;
}) {
  const t = useT();
  const starred = useStarredMessages(groupId, open);
  const entries = starredEntries(starred.data);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("chat.starred.title")}
      footer={
        starred.hasNextPage ? (
          <Button
            variant="outline"
            disabled={starred.isFetchingNextPage}
            onPress={() => {
              void starred.fetchNextPage();
            }}
          >
            <Text>{t("chat.starred.load_more")}</Text>
          </Button>
        ) : undefined
      }
    >
      {starred.isLoading ? (
        <View className="gap-2 py-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </View>
      ) : starred.isError ? (
        <Text variant="muted" className="py-4 text-center">
          {t("chat.starred.load_failed")}
        </Text>
      ) : entries.length === 0 ? (
        <View className="items-center gap-2 py-6">
          <Star size={28} color={color["muted-foreground"]} />
          <Text variant="muted" className="text-center">
            {t("chat.starred.empty")}
          </Text>
        </View>
      ) : (
        <View className="gap-1.5 pb-2">
          {entries.map(({ message }) => {
            const author = message.senderId === meId ? t("chat.you") : message.senderName;
            const preview = previewOf(message);
            return (
              <View
                key={message.id}
                className="flex-row items-center gap-2 rounded-xl border border-border bg-card"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${author}: ${preview}`}
                  accessibilityHint={t("chat.starred.open_a11y")}
                  onPress={() => {
                    onJump(message);
                  }}
                  className="min-w-0 flex-1 gap-0.5 rounded-xl px-3 py-2 active:bg-muted"
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text numberOfLines={1} className="shrink text-sm font-medium text-primary">
                      {author}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatListTime(message.createdAt, t("chat.date.yesterday"))}
                    </Text>
                  </View>
                  <Text numberOfLines={2} className="text-sm leading-5 text-foreground">
                    {preview}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("chat.starred.unstar_a11y")}
                  onPress={() => {
                    onUnstar(message);
                  }}
                  hitSlop={8}
                  className="mr-2 size-9 items-center justify-center rounded-full active:bg-muted"
                >
                  <Star size={18} color={color.primary} fill={color.primary} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}
