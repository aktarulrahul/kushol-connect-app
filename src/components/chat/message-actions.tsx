// Sticker picker and message-info seen-by sheets (the long-press menu is message-menu.tsx).
import { Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCheck, type LucideIcon } from "lucide-react-native";

import { toBnDigits } from "@/components/chat/group-row";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  listMessageSeenBy,
  type ChatMessage,
  type MessageInfo,
  type MessageReactor,
  type MessageReceipt,
} from "@/fixtures/chat";
import { useLocale, useT } from "@/i18n/locale-provider";
import { chatLiveModeSync, liveChat } from "@/lib/chat/live-chat";
import { messagePreview } from "@/lib/chat/message-utils";
import { color } from "@/theme/tokens";

/** Message info for one of my messages: the api in live sessions, the demo fixture otherwise. */
function loadInfo(messageId: string): Promise<MessageInfo> {
  if (chatLiveModeSync()) return liveChat.messageInfo(messageId);
  return Promise.resolve({ receipts: listMessageSeenBy(messageId), pending: 0, reactors: [] });
}

// WhatsApp "Message info": the message itself on top, then a card listing who has read it, who
// it was only delivered to, how many members it has not reached, and who reacted — each with
// avatar, name and time.
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
  const { locale } = useLocale();
  const receipts = useQuery({
    queryKey: ["chat", "message-info", message?.id ?? ""],
    queryFn: () =>
      message ? loadInfo(message.id) : Promise.resolve({ receipts: [], pending: 0, reactors: [] }),
    enabled: open && message !== null,
    staleTime: 10_000,
  });
  const rows = receipts.data?.receipts ?? [];
  const seen = rows.filter((r) => r.status === "seen");
  const delivered = rows.filter((r) => r.status === "delivered");
  const pending = receipts.data?.pending ?? 0;
  const reactors = receipts.data?.reactors ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.info.title")}>
      {message ? <InfoBubble message={message} locale={locale} /> : null}
      <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader icon={CheckCheck} tint={color.primary} label={t("chat.info.seen")} />
        {receipts.isLoading ? (
          <View className="gap-3 px-3 pb-3">
            {[0, 1].map((i) => (
              <View key={i} className="flex-row items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-3.5 flex-1 rounded-md" />
              </View>
            ))}
          </View>
        ) : seen.length === 0 ? (
          <View className="flex-row items-center gap-2.5 px-3 pb-3.5">
            <Check size={16} color={color["muted-foreground"]} />
            <Text className="flex-1 text-sm text-muted-foreground">{t("chat.info.empty")}</Text>
          </View>
        ) : (
          seen.map((r) => <ReceiptRow key={r.userId} row={r} locale={locale} />)
        )}
        {delivered.length > 0 ? (
          <>
            <View className="mx-3 h-px bg-border" />
            <SectionHeader
              icon={CheckCheck}
              tint={color["muted-foreground"]}
              label={t("chat.info.delivered")}
            />
            {delivered.map((r) => (
              <ReceiptRow key={r.userId} row={r} locale={locale} />
            ))}
          </>
        ) : null}
        {pending > 0 ? (
          <>
            <View className="mx-3 h-px bg-border" />
            <View className="flex-row items-center gap-2.5 px-3 py-3">
              <Check size={16} color={color["muted-foreground"]} />
              <Text className="flex-1 text-sm text-muted-foreground">
                {t("chat.info.pending", { count: toBnDigits(String(pending), locale) })}
              </Text>
            </View>
          </>
        ) : null}
      </View>
      {reactors.length > 0 ? (
        <View className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-center gap-2 px-3 pb-2 pt-3">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("chat.info.reactions")}
            </Text>
          </View>
          {reactors.map((r) => (
            <ReactorRow key={r.userId} row={r} locale={locale} />
          ))}
        </View>
      ) : null}
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

function InfoBubble({ message, locale }: { message: ChatMessage; locale: string }) {
  const t = useT();
  const preview = messagePreview(message, {
    image: t("chat.preview.image"),
    pdf: t("chat.composer.attach_pdf"),
    document: t("chat.preview.document"),
    voice: t("chat.preview.voice"),
    sticker: t("chat.preview.sticker"),
  });
  return (
    <View className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3 pb-1.5 pt-2">
      <Text numberOfLines={4} className="text-sm leading-5 text-primary-foreground">
        {preview}
      </Text>
      <View className="mt-1 flex-row items-center justify-end gap-1">
        <Text className="text-xs text-primary-foreground/75">
          {formatReceiptTime(message.createdAt, locale)}
        </Text>
        <CheckCheck size={12} color={color["primary-foreground"]} />
      </View>
    </View>
  );
}

function SectionHeader({
  icon: IconCmp,
  tint,
  label,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2 px-3 pb-2 pt-3">
      <IconCmp size={16} color={tint} />
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function ReceiptRow({ row, locale }: { row: MessageReceipt; locale: string }) {
  return (
    <View className="flex-row items-center gap-3 px-3 py-2">
      <UserAvatar name={row.name} id={row.userId} size="sm" placeholder="person" />
      <Text numberOfLines={1} className="flex-1 text-sm font-medium text-foreground">
        {row.name}
      </Text>
      <Text className="text-xs text-muted-foreground">{formatReceiptTime(row.at, locale)}</Text>
    </View>
  );
}

function ReactorRow({ row, locale }: { row: MessageReactor; locale: string }) {
  return (
    <View className="flex-row items-center gap-3 px-3 py-2">
      <UserAvatar name={row.name} id={row.userId} size="sm" placeholder="person" />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-foreground">
          {row.name}
        </Text>
        <Text className="text-xs text-muted-foreground">{formatReceiptTime(row.at, locale)}</Text>
      </View>
      <Text className="text-2xl" accessibilityLabel={row.emoji}>
        {row.emoji}
      </Text>
    </View>
  );
}

/** HH:mm today, dd/MM HH:mm otherwise — digits follow the UI language. */
function formatReceiptTime(iso: string, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const today = new Date().toDateString() === d.toDateString();
  const day = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return toBnDigits(today ? hm : `${day} ${hm}`, locale);
}
