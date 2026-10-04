// Long-press sheet: reactions + Reply / Info / Delete; sticker picker; message-info seen-by.
import { Pressable, View } from "react-native";

import { toBnDigits } from "@/components/chat/group-row";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  listMessageSeenBy,
  REACTION_EMOJIS,
  type ChatMessage,
  type MessageReceipt,
} from "@/fixtures/chat";
import { useT } from "@/i18n/locale-provider";

export type MessageActionsHandlers = {
  onReply: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onInfo: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  canDelete: boolean;
};

export function MessageLongPressSheet({
  message,
  open,
  onOpenChange,
  handlers,
}: {
  message: ChatMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handlers: MessageActionsHandlers;
}) {
  const t = useT();
  if (!message) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.actions.title")}>
      <View className="mb-3 flex-row justify-between gap-1">
        {REACTION_EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={emoji}
            onPress={() => {
              handlers.onReact(message, emoji);
              onOpenChange(false);
            }}
            className="size-10 items-center justify-center rounded-full bg-muted active:opacity-80"
          >
            <Text className="text-xl">{emoji}</Text>
          </Pressable>
        ))}
      </View>
      <ActionRow
        label={t("chat.actions.reply")}
        onPress={() => {
          handlers.onReply(message);
          onOpenChange(false);
        }}
      />
      <ActionRow
        label={t("chat.actions.info")}
        onPress={() => {
          onOpenChange(false);
          handlers.onInfo(message);
        }}
      />
      {handlers.canDelete ? (
        <ActionRow
          label={t("chat.actions.delete")}
          onPress={() => {
            handlers.onDelete(message);
            onOpenChange(false);
          }}
        />
      ) : null}
    </Sheet>
  );
}

export function MessageInfoSheet({
  message,
  open,
  onOpenChange,
}: {
  message: ChatMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const rows: MessageReceipt[] = message ? listMessageSeenBy(message.id) : [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.info.title")}>
      {rows.length === 0 ? (
        <Text className="text-sm text-muted-foreground">{t("chat.info.empty")}</Text>
      ) : (
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("chat.info.seen")}
          </Text>
          {rows
            .filter((r) => r.status === "seen")
            .map((r) => (
              <ReceiptRow key={r.userId} row={r} />
            ))}
          {rows.some((r) => r.status === "delivered") ? (
            <>
              <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("chat.info.delivered")}
              </Text>
              {rows
                .filter((r) => r.status === "delivered")
                .map((r) => (
                  <ReceiptRow key={r.userId} row={r} />
                ))}
            </>
          ) : null}
        </View>
      )}
    </Sheet>
  );
}

export function StickerPickerSheet({
  open,
  onOpenChange,
  stickers,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stickers: readonly { id: string; emoji: string }[];
  onPick: (stickerId: string) => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.sticker.title")}>
      <View className="flex-row flex-wrap gap-2">
        {stickers.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={s.emoji}
            onPress={() => {
              onPick(s.id);
              onOpenChange(false);
            }}
            className="size-16 items-center justify-center rounded-2xl bg-muted active:opacity-80"
          >
            <Text className="text-4xl">{s.emoji}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

function ReceiptRow({ row }: { row: MessageReceipt }) {
  return (
    <View className="flex-row items-center gap-3">
      <UserAvatar name={row.name} id={row.userId} size="sm" placeholder="person" />
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">{row.name}</Text>
        <Text className="text-xs text-muted-foreground">{formatReceiptTime(row.at)}</Text>
      </View>
    </View>
  );
}

function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="border-b border-border py-3 active:opacity-70"
    >
      <Text className="text-base text-foreground">{label}</Text>
    </Pressable>
  );
}

function formatReceiptTime(iso: string): string {
  const d = new Date(iso);
  return toBnDigits(
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  );
}
