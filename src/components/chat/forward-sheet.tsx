// WhatsApp "Forward to…" sheet (05 · owner 2026-10-17): pick up to 5 chats (1 when the message
// was already forwarded many times), then send. Lists my active chats except the source room;
// the api re-checks every target, so a stale row only fails that one copy.
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";

import { ChatAvatar, chatAvatarKind } from "@/components/chat/chat-avatar";
import { toBnDigits } from "@/components/chat/group-row";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import type { ChatGroup, ChatMessage } from "@/fixtures/chat";
import { useLocale, useT } from "@/i18n/locale-provider";
import { chatTitle } from "@/lib/chat/chat-list";
import { forwardLimit } from "@/lib/chat/receipts";
import { useChatGroups } from "@/lib/chat/use-chat";
import { cn } from "@/lib/utils";
import { color } from "@/theme/tokens";

/** Chats a message can be forwarded into: active rooms other than its own (pure). */
export function forwardTargets(groups: readonly ChatGroup[], sourceGroupId: string): ChatGroup[] {
  return groups.filter((g) => g.id !== sourceGroupId && g.status === "active");
}

export function ForwardSheet({
  message,
  open,
  onOpenChange,
  onSend,
  sending = false,
}: {
  message: ChatMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (targetGroupIds: string[]) => void;
  sending?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const groups = useChatGroups();
  const [picked, setPicked] = useState<string[]>([]);
  const limit = forwardLimit(message?.forwardCount);
  const targets = useMemo(
    () => (message ? forwardTargets(groups.data ?? [], message.groupId) : []),
    [groups.data, message],
  );

  const close = (next: boolean) => {
    if (!next) setPicked([]);
    onOpenChange(next);
  };
  const toggle = (groupId: string) => {
    setPicked((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : prev.length >= limit
          ? prev
          : [...prev, groupId],
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      title={t("chat.forward.title")}
      description={
        limit === 1
          ? t("chat.forward.hint_many")
          : t("chat.forward.hint", { count: toBnDigits(String(limit), locale) })
      }
      footer={
        <Button
          disabled={picked.length === 0 || sending}
          onPress={() => {
            const chosen = picked;
            setPicked([]);
            onSend(chosen);
          }}
        >
          <Text>
            {picked.length > 0
              ? `${t("chat.forward.send")} (${toBnDigits(String(picked.length), locale)})`
              : t("chat.forward.send")}
          </Text>
        </Button>
      }
    >
      {targets.length === 0 ? (
        <Text variant="muted" className="py-4 text-center">
          {t("chat.forward.empty")}
        </Text>
      ) : (
        <View className="gap-1">
          {targets.map((group) => {
            const selected = picked.includes(group.id);
            const full = !selected && picked.length >= limit;
            const title = chatTitle(group) || t("chat.tab");
            return (
              <Pressable
                key={group.id}
                accessibilityRole="checkbox"
                accessibilityLabel={title}
                accessibilityState={{ checked: selected, disabled: full }}
                disabled={full}
                onPress={() => {
                  toggle(group.id);
                }}
                className={cn(
                  "flex-row items-center gap-3 rounded-xl px-2 py-2 active:bg-muted",
                  selected && "bg-primary-soft",
                  full && "opacity-40",
                )}
              >
                <ChatAvatar
                  kind={chatAvatarKind(group.kind)}
                  name={title}
                  id={group.id}
                  size="sm"
                  photoAssetId={group.photoAssetId}
                />
                <Text numberOfLines={1} className="flex-1 text-base text-foreground">
                  {title}
                </Text>
                <View
                  className={cn(
                    "size-6 items-center justify-center rounded-full border",
                    selected ? "border-primary bg-primary" : "border-input",
                  )}
                >
                  {selected ? <Check size={14} color={color["primary-foreground"]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}
