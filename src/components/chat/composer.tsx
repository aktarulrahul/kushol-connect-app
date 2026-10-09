// Composer (COM-AP-005) in the Spartens ChatInput language (owner 2026-10-09): a soft-teal "+"
// circle (share sheet: image · PDF · sticker) beside a card field that is a pill on one line and
// rounded-2xl when it grows, the sticker/emoji button and a teal send circle inside the field —
// the send circle turns into the mic (COM-AP-007) while the field is empty. Above it: the reply
// quote (author + preview) or the "Editing message" banner. Read-only rooms show a lock line.
// The text is controlled by the screen so the chat list can show it as a draft.
import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from "react-native-reanimated";
import {
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Lock,
  Mic,
  Pencil,
  Plus,
  Smile,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import { toBnDigits } from "@/components/chat/group-row";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { color, motion } from "@/theme/tokens";

const bannerIn = FadeInDown.duration(motion.duration.base).reduceMotion(ReduceMotion.System);
const bannerOut = FadeOutDown.duration(motion.duration.fast).reduceMotion(ReduceMotion.System);

export function Composer({
  value,
  onChangeText,
  onSend,
  onOpenAttach,
  onOpenStickers,
  onStartVoice,
  disabled,
  disabledNotice,
  reply,
  onCancelReply,
  editing = false,
  onCancelEdit,
  focusKey = 0,
  bottomInset = 0,
}: {
  value: string;
  onChangeText: (text: string) => void;
  /** Called with the trimmed text; the screen clears the field. */
  onSend: (body: string) => void;
  onOpenAttach: () => void;
  onOpenStickers?: () => void;
  onStartVoice: () => void;
  disabled?: boolean;
  disabledNotice?: string;
  reply?: { author: string; preview: string } | null;
  onCancelReply?: () => void;
  editing?: boolean;
  onCancelEdit?: () => void;
  /** Bump to focus the field (after picking Reply or Edit in the long-press menu). */
  focusKey?: number;
  /** Safe-area bottom while the keyboard is down. */
  bottomInset?: number;
}) {
  const t = useT();
  const [multiline, setMultiline] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const body = value.trim();

  useEffect(() => {
    if (focusKey > 0) inputRef.current?.focus();
  }, [focusKey]);

  if (disabled) {
    return (
      <View className="bg-background px-4 pt-2" style={{ paddingBottom: bottomInset + 8 }}>
        <View className="min-h-12 flex-row items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3">
          <Icon as={Lock} size={18} className="text-muted-foreground" />
          <Text className="text-sm font-medium text-muted-foreground">
            {disabledNotice ?? t("chat.composer.disabled_archived")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-background px-4 pt-2" style={{ paddingBottom: bottomInset + 8 }}>
      {reply ? (
        <Animated.View entering={bannerIn} exiting={bannerOut} className="mb-2">
          <View className="flex-row items-center overflow-hidden rounded-lg border-l-2 border-primary bg-muted">
            <View className="min-w-0 flex-1 gap-0.5 px-3 py-2">
              <Text numberOfLines={1} className="text-xs font-medium leading-4 text-primary">
                {reply.author}
              </Text>
              <Text numberOfLines={1} className="text-sm leading-5 text-foreground">
                {reply.preview}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.composer.cancel_reply")}
              onPress={onCancelReply}
              hitSlop={8}
              className="mr-2 size-6 items-center justify-center rounded-full bg-card"
            >
              <Icon as={X} size={14} className="text-foreground" />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
      {editing ? (
        <Animated.View
          entering={bannerIn}
          exiting={bannerOut}
          className="mb-2 flex-row items-center justify-between rounded-lg border-l-2 border-primary bg-muted px-3 py-2"
        >
          <View className="flex-row items-center gap-2">
            <Icon as={Pencil} size={16} className="text-primary" />
            <Text className="text-sm font-medium text-primary">{t("chat.composer.editing")}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.composer.cancel_edit")}
            onPress={onCancelEdit}
            hitSlop={8}
          >
            <Icon as={X} size={18} className="text-muted-foreground" />
          </Pressable>
        </Animated.View>
      ) : null}
      <View className="flex-row items-end gap-3">
        {editing ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.composer.attach")}
            onPress={onOpenAttach}
            className="size-12 items-center justify-center rounded-full bg-primary-soft active:opacity-80"
          >
            <Icon as={Plus} size={26} className="text-primary" />
          </Pressable>
        )}
        <View
          className={cn(
            "min-h-12 flex-1 flex-row items-center border border-border bg-card py-1.5 pl-4 pr-2 shadow-sm",
            multiline ? "rounded-2xl" : "rounded-full",
          )}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height > 52;
            setMultiline((prev) => (prev === next ? prev : next));
          }}
        >
          <TextInput
            ref={inputRef}
            accessibilityLabel={t("chat.composer.placeholder")}
            placeholder={t("chat.composer.placeholder")}
            placeholderTextColor={color["muted-foreground"]}
            multiline
            maxLength={4000}
            value={value}
            onChangeText={onChangeText}
            className="max-h-32 flex-1 py-1 text-sm text-foreground"
          />
          <View className="flex-row items-center gap-1.5 self-end">
            {onOpenStickers && !editing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("chat.composer.stickers")}
                onPress={onOpenStickers}
                hitSlop={6}
                className="size-8 items-center justify-center"
              >
                <Icon as={Smile} size={22} className="text-muted-foreground" />
              </Pressable>
            ) : null}
            {body || editing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("chat.composer.send")}
                accessibilityState={{ disabled: !body }}
                disabled={!body}
                onPress={() => {
                  onSend(body);
                }}
                className={cn(
                  "size-8 items-center justify-center rounded-full bg-primary active:opacity-80",
                  !body && "opacity-50",
                )}
              >
                <Icon as={ArrowUp} size={16} className="text-primary-foreground" />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("chat.composer.attach_voice")}
                onPress={onStartVoice}
                className="size-8 items-center justify-center rounded-full bg-primary active:opacity-80"
              >
                <Icon as={Mic} size={16} className="text-primary-foreground" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Share sheet behind the "+" circle (Spartens AttachmentSheet): round tiles with labels. */
export function AttachSheet({
  open,
  onOpenChange,
  onPickImage,
  onPickPdf,
  onPickSticker,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickImage: () => void;
  onPickPdf: () => void;
  onPickSticker?: () => void;
}) {
  const t = useT();
  const tiles: { key: string; label: string; icon: LucideIcon; onPress: () => void }[] = [
    { key: "image", label: t("chat.composer.attach_image"), icon: ImageIcon, onPress: onPickImage },
    { key: "pdf", label: t("chat.composer.attach_pdf"), icon: FileText, onPress: onPickPdf },
    ...(onPickSticker
      ? [
          {
            key: "sticker",
            label: t("chat.composer.attach_sticker"),
            icon: Smile,
            onPress: onPickSticker,
          },
        ]
      : []),
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.composer.share_title")}>
      <View className="flex-row flex-wrap gap-6 pb-2">
        {tiles.map((tile) => (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
            onPress={() => {
              onOpenChange(false);
              tile.onPress();
            }}
            className="items-center gap-2 active:opacity-70"
          >
            <View className="size-14 items-center justify-center rounded-full bg-primary-soft">
              <Icon as={tile.icon} size={24} className="text-primary" />
            </View>
            <Text className="text-xs text-foreground">{tile.label}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
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
          <Text className="text-sm font-semibold text-primary-foreground">
            {t("chat.composer.send")}
          </Text>
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
