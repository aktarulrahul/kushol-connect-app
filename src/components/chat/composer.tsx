// Composer (COM-AP-005): WhatsApp pill — attach inside left, mic/send swap, circular teal send,
// sticker entry from attach, keyboard-aware, reply banner.
import { useRef, useState } from "react";
import { color } from "@/theme/tokens";
import { Pressable, TextInput, View } from "react-native";
import { FileText, Image as ImageIcon, Mic, Paperclip, SendHorizonal, Smile } from "lucide-react-native";

import { toBnDigits } from "@/components/chat/group-row";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";

export function Composer({
  disabled,
  disabledNotice,
  onSendText,
  onPickImage,
  onPickPdf,
  onPickSticker,
  onStartVoice,
  replyPreview,
  onCancelReply,
}: {
  disabled?: boolean;
  disabledNotice?: string;
  onSendText: (body: string) => void;
  onPickImage: () => void;
  onPickPdf: () => void;
  onPickSticker?: () => void;
  onStartVoice: () => void;
  replyPreview?: string | null;
  onCancelReply?: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  if (disabled) {
    return (
      <GlassSurface variant="light" className="border-t border-border px-4 py-2">
        <Text className="text-center text-sm text-muted-foreground">
          {disabledNotice ?? t("chat.composer.disabled_archived")}
        </Text>
      </GlassSurface>
    );
  }

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    onSendText(body);
    setDraft("");
    inputRef.current?.clear();
  };

  return (
    <GlassSurface variant="light" className="border-t border-border px-2 pb-2 pt-1.5">
      {replyPreview ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.cancel")}
          onPress={onCancelReply}
          className="mb-1 flex-row items-center justify-between rounded-md border-l-2 border-l-primary bg-muted px-2 py-1"
        >
          <Text numberOfLines={1} className="flex-1 text-xs text-muted-foreground">
            {replyPreview}
          </Text>
          <Text className="px-2 text-xs font-semibold text-primary">✕</Text>
        </Pressable>
      ) : null}
      {attachOpen ? (
        <View className="mb-1 flex-row gap-2 px-1">
          <AttachChip
            label={t("chat.composer.attach_image")}
            onPress={() => {
              setAttachOpen(false);
              onPickImage();
            }}
            icon={ImageIcon}
          />
          <AttachChip
            label={t("chat.composer.attach_pdf")}
            onPress={() => {
              setAttachOpen(false);
              onPickPdf();
            }}
            icon={FileText}
          />
          {onPickSticker ? (
            <AttachChip
              label={t("chat.composer.attach_sticker")}
              onPress={() => {
                setAttachOpen(false);
                onPickSticker();
              }}
              icon={Smile}
            />
          ) : null}
        </View>
      ) : null}
      <View className="flex-row items-end gap-1.5">
        <View className="min-h-10 flex-1 flex-row items-end rounded-full border border-border bg-muted/50 px-1 py-0.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.composer.attach")}
            onPress={() => {
              setAttachOpen((v) => !v);
            }}
            className="size-9 items-center justify-center"
          >
            <Icon as={Paperclip} size={18} className="text-muted-foreground" />
          </Pressable>
          <TextInput
            ref={inputRef}
            accessibilityLabel={t("chat.composer.placeholder")}
            placeholder={t("chat.composer.placeholder")}
            placeholderTextColor={color["muted-foreground"]}
            multiline
            value={draft}
            onChangeText={setDraft}
            className="max-h-28 min-h-9 flex-1 py-2 pr-2 text-[15px] text-foreground"
          />
        </View>
        {draft.trim() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.composer.send")}
            onPress={send}
            className="mb-0.5 size-10 items-center justify-center rounded-full bg-primary active:opacity-80"
          >
            <Icon as={SendHorizonal} size={18} className="text-primary-foreground" />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.composer.attach_voice")}
            onPress={onStartVoice}
            className="mb-0.5 size-10 items-center justify-center rounded-full bg-primary active:opacity-80"
          >
            <Icon as={Mic} size={18} className="text-primary-foreground" />
          </Pressable>
        )}
      </View>
    </GlassSurface>
  );
}

function AttachChip({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: typeof ImageIcon;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-row items-center gap-1 rounded-full bg-muted px-2.5 py-1.5"
    >
      <Icon as={icon} size={14} className="text-primary" />
      <Text className="text-xs text-foreground">{label}</Text>
    </Pressable>
  );
}

/** Voice recorder sheet (COM-AP-007): simulated hold-to-record with a live duration ticker. */
export function VoiceRecorderSheet({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (durationMs: number) => void;
}) {
  const t = useT();
  const [seconds, setSeconds] = useState(0);
  if (!visible) return null;
  return (
    <View
      className="absolute inset-x-0 bottom-0 border-t border-border bg-background p-4"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t("chat.voice.record_a11y")}
    >
      <View className="mb-3 h-8 flex-row items-end justify-center gap-1">
        {Array.from({ length: 18 }).map((_, i) => (
          <View
            key={i}
            className="w-1 rounded-full bg-primary/70"
            style={{ height: 8 + ((i * 7) % 22) }}
          />
        ))}
      </View>
      <Text className="mb-2 text-center text-sm text-muted-foreground">
        {t("chat.voice.record_a11y")} · {toBnDigits(formatDuration(seconds))}
      </Text>
      <View className="flex-row justify-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.cancel")}
          onPress={() => {
            setSeconds(0);
            onClose();
          }}
          className="rounded-full border border-border px-4 py-2"
        >
          <Text className="text-sm text-foreground">{t("common.actions.cancel")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.composer.send")}
          onPress={() => {
            onSend(Math.max(seconds, 1) * 1000);
            setSeconds(0);
          }}
          className="rounded-full bg-primary px-4 py-2"
        >
          <Text className="text-sm font-semibold text-primary-foreground">{t("chat.composer.send")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m)}:${String(s).padStart(2, "0")}`;
}
