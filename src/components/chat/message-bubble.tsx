// One chat bubble (COM-AP-004/010/016): WhatsApp behaviour — outgoing teal, incoming muted,
// sender name in groups, ticks under bubble, reply quote, reaction chips, stickers, inline voice.
import { Image, Pressable, View } from "react-native";
import {
  Check,
  CheckCheck,
  Clock,
  FileText,
  Pause,
  Play,
  TriangleAlert,
} from "lucide-react-native";

import { toBnDigits } from "@/components/chat/group-row";
import { Text } from "@/components/ui/text";
import { stickerEmoji, type ChatMessage } from "@/fixtures/chat";
import { mediaFixtures } from "@/fixtures/media";
import { useT } from "@/i18n/locale-provider";
import { reactionChips, useChatState } from "@/lib/chat/chat-state";
import { useVoicePlayback } from "@/lib/chat/voice-playback";
import { cn } from "@/lib/utils";
import { color } from "@/theme/tokens";

export type BubbleSendState = "sending" | "sent" | "seen" | "failed" | "queued";

export function MessageBubble({
  message,
  sendState,
  isOwn,
  showSender,
  onLongPress,
  onOpenMedia,
  onToggleReaction,
}: {
  message: ChatMessage;
  sendState?: BubbleSendState;
  isOwn: boolean;
  showSender: boolean;
  onLongPress?: (message: ChatMessage) => void;
  onOpenMedia?: (message: ChatMessage) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
}) {
  const t = useT();
  const tombstoned = Boolean(message.deletedAt);
  const allReactions = useChatState((s) => s.reactions);
  const chips = reactionChips(allReactions, message.id);

  if (tombstoned) {
    return (
      <View className="items-center py-0.5" accessibilityLabel={t("chat.deleted")}>
        <Text className="text-xs italic text-muted-foreground">{t("chat.deleted")}</Text>
      </View>
    );
  }

  const state = isOwn ? (sendState ?? "sent") : undefined;
  const time = formatTime(message.createdAt);
  const isMediaBubble = message.kind === "image" || message.kind === "pdf";

  return (
    <Pressable
      accessibilityLabel={`${message.senderName}, ${time}`}
      accessibilityRole="button"
      onLongPress={() => {
        onLongPress?.(message);
      }}
      className={cn("max-w-[82%] px-1 py-0.5", isOwn ? "self-end" : "self-start")}
    >
      {message.kind === "sticker" ? (
        <View className={isOwn ? "items-end" : "items-start"}>
          {showSender && !isOwn ? (
            <Text className="mb-0.5 px-1 text-xs font-semibold text-primary">{message.senderName}</Text>
          ) : null}
          <Text className="text-6xl leading-tight">{stickerEmoji(message.stickerId ?? "")}</Text>
          <MetaRow time={time} state={state} isOwn={isOwn} />
        </View>
      ) : (
        <View
          className={cn(
            "overflow-hidden rounded-[16px]",
            isOwn ? "rounded-br-md bg-primary" : "rounded-bl-md bg-muted",
            isMediaBubble ? "p-1" : "px-2.5 py-1.5",
          )}
        >
          {showSender && !isOwn ? (
            <Text
              className={cn(
                "mb-0.5 text-xs font-semibold text-primary",
                isMediaBubble && "px-1.5 pt-0.5",
              )}
            >
              {message.senderName}
            </Text>
          ) : null}

          {message.replyTo ? (
            <View
              className={cn(
                "mb-1 rounded-md border-l-2 border-l-primary/70 bg-background/40 px-2 py-1",
                isMediaBubble && "mx-0.5",
              )}
            >
              <Text
                numberOfLines={1}
                className={cn(
                  "text-xs",
                  isOwn ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {message.replyPreview ?? "…"}
              </Text>
            </View>
          ) : null}

          {message.kind === "image" ? (
            <ImageBubble
              message={message}
              isOwn={isOwn}
              time={time}
              state={state}
              onPress={() => {
                onOpenMedia?.(message);
              }}
            />
          ) : null}
          {message.kind === "pdf" ? (
            <PdfBubble
              message={message}
              isOwn={isOwn}
              onPress={() => {
                onOpenMedia?.(message);
              }}
            />
          ) : null}
          {message.kind === "voice" ? <VoiceNoteInline message={message} isOwn={isOwn} /> : null}
          {message.kind === "text" || message.kind === "system" ? (
            <Text
              className={cn(
                "text-[15px] leading-5",
                isOwn ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {message.body ?? ""}
            </Text>
          ) : null}

          {message.kind === "image" && !message.body?.trim() ? null : (
            <MetaRow
              time={time}
              state={state}
              isOwn={isOwn}
              inside
              className={isMediaBubble ? "px-1" : undefined}
            />
          )}
        </View>
      )}

      {chips.length > 0 ? (
        <View
          className={cn("mt-0.5 flex-row flex-wrap gap-1", isOwn ? "justify-end" : "justify-start")}
        >
          {chips.map((chip) => (
            <Pressable
              key={chip.emoji}
              accessibilityRole="button"
              accessibilityLabel={chip.emoji}
              onPress={() => {
                onToggleReaction?.(message, chip.emoji);
              }}
              className={cn(
                "flex-row items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5",
                chip.mine && "border-primary/40 bg-primary-soft",
              )}
            >
              <Text className="text-xs">{chip.emoji}</Text>
              <Text className="text-[10px] text-muted-foreground">
                {toBnDigits(String(chip.count))}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {state === "failed" ? (
        <Text className="mt-0.5 self-end text-xs text-destructive">{t("chat.bubble.failed")}</Text>
      ) : null}
      {state === "queued" ? (
        <Text className="mt-0.5 self-end text-xs text-muted-foreground">{t("chat.bubble.queued")}</Text>
      ) : null}
    </Pressable>
  );
}

function ImageBubble({
  message,
  isOwn,
  time,
  state,
  onPress,
}: {
  message: ChatMessage;
  isOwn: boolean;
  time: string;
  state?: BubbleSendState;
  onPress: () => void;
}) {
  const t = useT();
  const caption = message.body?.trim() ?? "";
  const assetId = message.media?.assetId ?? "";
  const uri = assetId ? mediaFixtures.previewUri(assetId) : undefined;
  const label = message.media?.fileName ?? t("chat.composer.attach_image");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="overflow-hidden rounded-[12px]"
    >
      <View className="relative">
        {uri ? (
          <Image
            source={{ uri }}
            accessibilityIgnoresInvertColors
            className="h-56 w-full min-w-[200px] max-w-[260px]"
            resizeMode="cover"
            style={{ width: 220, height: 280 }}
          />
        ) : (
          <View className="h-56 w-[220px] items-center justify-center bg-black/20">
            <Text className={cn("text-xs", isOwn ? "text-primary-foreground" : "text-foreground")}>
              {t("chat.media.image_unavailable")}
            </Text>
          </View>
        )}
        {!caption ? (
          <View
            pointerEvents="none"
            className="absolute bottom-1.5 right-1.5 flex-row items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5"
          >
            <MetaRow time={time} state={state} isOwn overlay />
          </View>
        ) : null}
      </View>
      {caption ? (
        <Text
          className={cn(
            "mt-1 px-1 text-[15px] leading-5",
            isOwn ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

function PdfBubble({
  message,
  isOwn,
  onPress,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const name = message.media?.fileName ?? t("chat.composer.attach_pdf");
  const sizeLabel = formatSizeBytes(message.media?.sizeBytes ?? 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${t("chat.media.pdf_badge")}, ${sizeLabel}`}
      onPress={onPress}
      className={cn(
        "mb-0.5 min-w-[200px] max-w-[260px] flex-row items-center gap-2.5 rounded-[12px] px-2.5 py-2.5",
        isOwn ? "bg-primary-foreground/15" : "bg-background",
      )}
    >
      <View
        className="size-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: isOwn ? "rgba(255,255,255,0.22)" : color["destructive-soft"] }}
      >
        <FileText
          size={22}
          color={isOwn ? color["primary-foreground"] : color.destructive}
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          numberOfLines={2}
          className={cn(
            "text-sm font-medium leading-4",
            isOwn ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {name}
        </Text>
        <Text
          className={cn("text-[11px]", isOwn ? "text-primary-foreground/75" : "text-muted-foreground")}
        >
          {`${t("chat.media.pdf_badge")} · ${sizeLabel}`}
        </Text>
      </View>
    </Pressable>
  );
}

function MetaRow({
  time,
  state,
  isOwn,
  inside,
  overlay,
  className,
}: {
  time: string;
  state?: BubbleSendState;
  isOwn: boolean;
  inside?: boolean;
  overlay?: boolean;
  className?: string;
}) {
  const muted = overlay
    ? "text-white/90"
    : inside && isOwn
      ? "text-primary-foreground/70"
      : "text-muted-foreground";
  // Prefer explicit stroke colors over Icon+className — Svg is View-like and must not host text.
  const stroke = overlay
    ? color.white
    : inside && isOwn
      ? color["primary-foreground"]
      : color["muted-foreground"];
  const seenStroke = overlay ? color.white : color.primary;

  return (
    <View
      className={cn(
        "mt-0.5 flex-row items-center gap-1",
        isOwn ? "justify-end" : "justify-start",
        !inside && !overlay && "px-1",
        overlay && "mt-0",
        className,
      )}
    >
      <Text className={cn("text-[10px]", muted)}>{time}</Text>
      {state === "sending" ? <Clock size={11} color={stroke} /> : null}
      {state === "queued" ? <Clock size={11} color={color["muted-foreground"]} /> : null}
      {state === "sent" ? <Check size={11} color={stroke} /> : null}
      {state === "seen" ? <CheckCheck size={11} color={seenStroke} /> : null}
      {state === "failed" ? <TriangleAlert size={11} color={color.destructive} /> : null}
    </View>
  );
}

function VoiceNoteInline({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const durationMs = message.media?.durationMs ?? 1_000;
  const { playing, progress, toggle } = useVoicePlayback(durationMs, message.id);
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? t("chat.voice.pause") : t("chat.voice.play")}
      onPress={toggle}
      className="mb-0.5 min-w-[180px] flex-row items-center gap-2 py-1"
    >
        <View
          className={cn(
            "size-8 items-center justify-center rounded-full",
            isOwn ? "bg-primary-foreground/20" : "bg-primary/15",
          )}
        >
          {playing ? (
            <Pause size={14} color={isOwn ? color["primary-foreground"] : color.primary} />
          ) : (
            <Play size={14} color={isOwn ? color["primary-foreground"] : color.primary} />
          )}
        </View>
      <View className="h-1 flex-1 overflow-hidden rounded-full bg-black/20">
        <View
          className={cn("h-full rounded-full", isOwn ? "bg-primary-foreground" : "bg-primary")}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>
      <Text className={cn("text-xs", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {voiceLabel(message)}
      </Text>
    </Pressable>
  );
}

function formatSizeBytes(bytes: number): string {
  if (bytes <= 0) return toBnDigits("0") + " KB";
  if (bytes < 1024 * 1024) {
    return `${toBnDigits(Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  const rounded = Math.round(mb * 10) / 10;
  return `${toBnDigits(rounded)} MB`;
}

function voiceLabel(message: ChatMessage): string {
  const secs = Math.round((message.media?.durationMs ?? 0) / 1000);
  return `${toBnDigits(String(Math.floor(secs / 60)))}:${toBnDigits(String(secs % 60).padStart(2, "0"))}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return toBnDigits(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );
}
