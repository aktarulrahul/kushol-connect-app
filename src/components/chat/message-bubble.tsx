// One chat bubble (COM-AP-004/010/016) — Spartens channel language (owner 2026-10-09):
// incoming = card bubble with soft shadow + square outer corner, outgoing = teal with square
// outer corner, group messages carry the author avatar + primary-coloured name, reply quotes
// name their author and jump to the original, 1–3 emoji render large without a bubble, the meta
// row shows "edited", the pin mark, time and ticks. Long-press reports the bubble's window rect
// so the focus menu can lift it; `preview` renders the same bubble inside that menu.
import { useRef, type ReactNode } from "react";
import { Image, Pressable, View, type DimensionValue } from "react-native";
import {
  Ban,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Pause,
  Pin,
  Play,
  TriangleAlert,
} from "lucide-react-native";

import { toBnDigits } from "@/components/chat/group-row";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { stickerEmoji, type ChatMessage } from "@/fixtures/chat";
import { mediaFixtures } from "@/fixtures/media";
import { useT } from "@/i18n/locale-provider";
import { reactionChips, useChatState } from "@/lib/chat/chat-state";
import { isEmojiOnly } from "@/lib/chat/message-utils";
import { useVoicePlayback } from "@/lib/chat/voice-playback";
import { cn } from "@/lib/utils";
import { color } from "@/theme/tokens";

export type BubbleSendState = "sending" | "sent" | "seen" | "failed" | "queued";

/** The bubble's rectangle in window coordinates (for the long-press focus menu). */
export type BubbleAnchor = { x: number; y: number; width: number; height: number };

// Spartens corner grammar: the outer corner (away from the speaker) is square.
const INCOMING_DM = "rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-none";
const INCOMING_GROUP = "rounded-tl-none rounded-tr-xl rounded-br-xl rounded-bl-xl";
const OUTGOING = "rounded-tl-xl rounded-tr-xl rounded-br-none rounded-bl-xl";

export function MessageBubble({
  message,
  sendState,
  isOwn,
  showSender,
  isGroup,
  replyAuthor,
  preview = false,
  onLongPress,
  onOpenMedia,
  onToggleReaction,
  onPressReply,
  onRetry,
}: {
  message: ChatMessage;
  sendState?: BubbleSendState;
  isOwn: boolean;
  showSender: boolean;
  /** Group rooms show the author avatar + name on incoming (Spartens isGroup branch). */
  isGroup?: boolean;
  /** Author of the quoted message ("You" for own) — resolved by the screen from history. */
  replyAuthor?: string;
  /** Rendered inside the long-press focus menu: full width of the lifted rect, no handlers. */
  preview?: boolean;
  /** `remeasure` reads the rect again — e.g. after the keyboard has gone down. */
  onLongPress?: (
    message: ChatMessage,
    anchor: BubbleAnchor,
    remeasure: (done: (anchor: BubbleAnchor) => void) => void,
  ) => void;
  onOpenMedia?: (message: ChatMessage) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  /** Tap on the reply quote → jump to the quoted message. */
  onPressReply?: (messageId: string) => void;
  /** Tap on a failed bubble → resend (US-002: the input is never lost). */
  onRetry?: (message: ChatMessage) => void;
}) {
  const t = useT();
  const ref = useRef<View>(null);
  const tombstoned = Boolean(message.deletedAt);
  const allReactions = useChatState((s) => s.reactions);
  const chips = reactionChips(allReactions, message.id);
  const corners = isOwn ? OUTGOING : isGroup ? INCOMING_GROUP : INCOMING_DM;
  const width = preview ? "w-full" : "max-w-[82%]";
  const measure = (done: (anchor: BubbleAnchor) => void) => {
    ref.current?.measureInWindow((x, y, w, h) => {
      done({ x, y, width: w, height: h });
    });
  };
  const lift = () => {
    if (!onLongPress) return;
    measure((anchor) => {
      onLongPress(message, anchor, measure);
    });
  };

  if (tombstoned) {
    return (
      <View
        accessibilityLabel={t("chat.deleted")}
        className={cn(
          "gap-1 px-3 py-2 shadow-sm",
          width,
          corners,
          isOwn ? "self-end bg-primary" : "self-start bg-card",
        )}
      >
        <View className="flex-row items-center gap-1.5">
          <Ban size={14} color={isOwn ? color["primary-foreground"] : color["muted-foreground"]} />
          <Text
            className={cn(
              "text-sm italic leading-5",
              isOwn ? "text-primary-foreground/90" : "text-muted-foreground",
            )}
          >
            {t("chat.deleted")}
          </Text>
        </View>
        <Text
          className={cn(
            "text-xs leading-3.5",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    );
  }

  const state = isOwn ? (sendState ?? "sent") : undefined;
  const time = formatTime(message.createdAt);
  const isMediaBubble = message.kind === "image" || message.kind === "pdf";
  const showAuthor = !isOwn && (isGroup || showSender);
  const edited = Boolean(message.editedAt);
  const pinned = Boolean(message.pinnedAt);
  const bigEmoji = message.kind === "text" && !message.replyTo && isEmojiOnly(message.body);
  const meta = { time, state, isOwn, edited, pinned };

  const avatar =
    !isOwn && isGroup ? (
      <UserAvatar name={message.senderName} id={message.senderId} size="sm" placeholder="person" />
    ) : null;

  let content: ReactNode;
  if (message.kind === "sticker" || bigEmoji) {
    // Stickers and 1–3 emoji: no bubble, time in a small card pill (Spartens emojiOnly).
    content = (
      <View className={cn("flex-row items-start gap-2", isOwn && "self-end")}>
        {avatar}
        <View className={isOwn ? "items-end" : "items-start"}>
          {showAuthor ? (
            <Text className="mb-0.5 px-1 text-sm font-semibold text-primary">
              {message.senderName}
            </Text>
          ) : null}
          <Text className="text-5xl">
            {message.kind === "sticker" ? stickerEmoji(message.stickerId ?? "") : message.body}
          </Text>
          <View className="rounded-full bg-card px-2 py-0.5 shadow-sm">
            <MetaRow {...meta} />
          </View>
        </View>
      </View>
    );
  } else {
    content = (
      <View className={cn("flex-row items-start gap-2", isOwn ? "self-end" : "self-start")}>
        {avatar}
        <View
          className={cn(
            "min-w-0 shrink items-start gap-1 shadow-sm",
            corners,
            isOwn ? "bg-primary p-2" : "bg-card px-3 py-2",
            isMediaBubble && "p-1",
          )}
        >
          {showAuthor ? (
            <Text
              className={cn(
                "text-sm font-semibold leading-4 text-primary",
                isMediaBubble && "px-1.5 pt-0.5",
              )}
            >
              {message.senderName}
            </Text>
          ) : null}

          {message.replyTo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${replyAuthor ?? ""} ${message.replyPreview ?? ""}`.trim()}
              disabled={preview}
              onPress={() => {
                if (message.replyTo) onPressReply?.(message.replyTo);
              }}
              onLongPress={lift}
              delayLongPress={250}
              className={cn(
                "mb-0.5 w-full items-start gap-0.5 overflow-hidden rounded-lg border-l-2 px-2.5 py-1.5",
                isOwn
                  ? "border-primary-foreground bg-primary-foreground/15"
                  : "border-primary bg-muted",
                isMediaBubble && "mx-0.5",
              )}
            >
              {replyAuthor ? (
                <Text
                  numberOfLines={1}
                  className={cn(
                    "text-xs font-medium leading-4",
                    isOwn ? "text-primary-foreground" : "text-primary",
                  )}
                >
                  {replyAuthor}
                </Text>
              ) : null}
              <Text
                numberOfLines={1}
                className={cn(
                  "text-sm leading-5",
                  isOwn ? "text-primary-foreground/90" : "text-foreground",
                )}
              >
                {message.replyPreview ?? "…"}
              </Text>
            </Pressable>
          ) : null}

          {message.kind === "image" ? (
            <ImageBubble
              message={message}
              isOwn={isOwn}
              meta={meta}
              onLongPress={lift}
              onPress={() => {
                if (!preview) onOpenMedia?.(message);
              }}
            />
          ) : null}
          {message.kind === "pdf" ? (
            <PdfBubble
              message={message}
              isOwn={isOwn}
              onLongPress={lift}
              onPress={() => {
                if (!preview) onOpenMedia?.(message);
              }}
            />
          ) : null}
          {message.kind === "voice" ? (
            <VoiceNoteInline message={message} isOwn={isOwn} onLongPress={lift} />
          ) : null}
          {message.kind === "text" || message.kind === "system" ? (
            <Text
              className={cn(
                "text-sm leading-5",
                isOwn ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {message.body ?? ""}
            </Text>
          ) : null}

          {message.kind === "image" && !message.body?.trim() ? null : (
            <MetaRow {...meta} inside className={isMediaBubble ? "px-1" : undefined} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      className={cn(width, isOwn ? "self-end" : "self-start")}
      pointerEvents={preview ? "none" : "auto"}
    >
      <Pressable
        ref={ref}
        accessibilityLabel={`${message.senderName}, ${time}`}
        accessibilityRole="button"
        accessibilityHint={onLongPress ? t("chat.actions.title") : undefined}
        delayLongPress={250}
        onLongPress={lift}
        onPress={
          state === "failed" && onRetry
            ? () => {
                onRetry(message);
              }
            : undefined
        }
      >
        {content}
      </Pressable>

      {chips.length > 0 ? (
        <View
          className={cn(
            "mt-1 flex-row flex-wrap gap-1",
            isOwn ? "justify-end" : "justify-start",
            !isOwn && isGroup && "pl-10",
          )}
        >
          {chips.map((chip) => (
            <Pressable
              key={chip.emoji}
              accessibilityRole="button"
              accessibilityLabel={`${chip.emoji} ${String(chip.count)}`}
              accessibilityState={{ selected: chip.mine }}
              onPress={() => {
                onToggleReaction?.(message, chip.emoji);
              }}
              hitSlop={6}
              className={cn(
                "flex-row items-center gap-1 rounded-full border px-2 py-0.5",
                chip.mine ? "border-primary bg-primary-soft" : "border-border bg-card",
              )}
            >
              <Text className="text-sm">{chip.emoji}</Text>
              <Text
                className={cn(
                  "text-xs font-medium",
                  chip.mine ? "text-primary" : "text-muted-foreground",
                )}
              >
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
        <Text className="mt-0.5 self-end text-xs text-muted-foreground">
          {t("chat.bubble.queued")}
        </Text>
      ) : null}
    </View>
  );
}

type Meta = {
  time: string;
  state?: BubbleSendState;
  isOwn: boolean;
  edited: boolean;
  pinned: boolean;
};

function ImageBubble({
  message,
  isOwn,
  meta,
  onPress,
  onLongPress,
}: {
  message: ChatMessage;
  isOwn: boolean;
  meta: Meta;
  onPress: () => void;
  onLongPress?: () => void;
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
      onLongPress={onLongPress}
      delayLongPress={250}
      className="overflow-hidden rounded-xl"
    >
      <View className="relative">
        {uri ? (
          <Image
            source={{ uri }}
            accessibilityIgnoresInvertColors
            className="h-72 w-full min-w-52 max-w-64"
            resizeMode="cover"
          />
        ) : (
          <View className="h-72 w-full min-w-52 max-w-64 items-center justify-center bg-muted">
            <Text className={cn("text-xs", isOwn ? "text-primary-foreground" : "text-foreground")}>
              {t("chat.media.image_unavailable")}
            </Text>
          </View>
        )}
        {!caption ? (
          <View
            pointerEvents="none"
            className="absolute bottom-1.5 right-1.5 flex-row items-center gap-1 rounded-md bg-foreground/70 px-1.5 py-0.5"
          >
            <MetaRow {...meta} isOwn overlay />
          </View>
        ) : null}
      </View>
      {caption ? (
        <Text
          className={cn(
            "mt-1 px-1 text-sm leading-5",
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
  onLongPress,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const t = useT();
  const name = message.media?.fileName ?? t("chat.composer.attach_pdf");
  const sizeLabel = formatSizeBytes(message.media?.sizeBytes ?? 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${t("chat.media.pdf_badge")}, ${sizeLabel}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      className={cn(
        "mb-0.5 min-w-52 max-w-64 flex-row items-center gap-2.5 rounded-xl px-2.5 py-2.5",
        isOwn ? "bg-primary-foreground/15" : "bg-muted",
      )}
    >
      <View
        className={cn(
          "size-11 items-center justify-center rounded-xl",
          isOwn ? "bg-primary-foreground/15" : "bg-destructive-soft",
        )}
      >
        <FileText size={22} color={isOwn ? color["primary-foreground"] : color.destructive} />
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
          className={cn("text-xs", isOwn ? "text-primary-foreground/75" : "text-muted-foreground")}
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
  edited,
  pinned,
  inside,
  overlay,
  className,
}: Meta & {
  inside?: boolean;
  overlay?: boolean;
  className?: string;
}) {
  const t = useT();
  const onTeal = overlay || (inside && isOwn);
  const muted = overlay
    ? "text-white/90"
    : inside && isOwn
      ? "text-primary-foreground/70"
      : "text-muted-foreground";
  // Explicit stroke colours instead of Icon+className — Svg is View-like and must not host text.
  const stroke = overlay
    ? color.white
    : inside && isOwn
      ? color["primary-foreground"]
      : color["muted-foreground"];
  // Spartens outgoing ticks read white on the teal bubble; elsewhere seen is teal.
  const seenStroke = onTeal ? color.white : color.primary;

  return (
    <View
      className={cn(
        "flex-row items-center gap-1",
        inside && "mt-0.5 self-stretch",
        inside && (isOwn ? "justify-end" : "justify-start"),
        className,
      )}
    >
      {pinned ? <Pin size={11} color={stroke} /> : null}
      {edited ? <Text className={cn("text-xs", muted)}>{t("chat.bubble.edited")}</Text> : null}
      <Text className={cn("text-xs", muted)}>{time}</Text>
      {state === "sending" ? <Clock size={11} color={stroke} /> : null}
      {state === "queued" ? <Clock size={11} color={color["muted-foreground"]} /> : null}
      {state === "sent" ? <Check size={11} color={stroke} /> : null}
      {state === "seen" ? <CheckCheck size={11} color={seenStroke} /> : null}
      {state === "failed" ? <TriangleAlert size={11} color={color.destructive} /> : null}
    </View>
  );
}

function VoiceNoteInline({
  message,
  isOwn,
  onLongPress,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onLongPress?: () => void;
}) {
  const durationMs = message.media?.durationMs ?? 1_000;
  const { playing, progress, toggle } = useVoicePlayback(durationMs, message.id);
  const t = useT();
  const percent = `${String(Math.round(progress * 100))}%` as DimensionValue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? t("chat.voice.pause") : t("chat.voice.play")}
      onPress={toggle}
      onLongPress={onLongPress}
      delayLongPress={250}
      className="mb-0.5 min-w-44 flex-row items-center gap-2 py-1"
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
      <View className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <View
          className={cn("h-full rounded-full", isOwn ? "bg-primary-foreground" : "bg-primary")}
          style={{ width: percent }}
        />
      </View>
      <Text
        className={cn("text-xs", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}
      >
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
  return `${toBnDigits(String(rounded))} MB`;
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
