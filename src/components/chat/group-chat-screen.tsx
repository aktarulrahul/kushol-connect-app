// Group / DM chat screen (COM-AP-003..005, 010, 011, 016): WhatsApp-dense message list, reply,
// reactions, stickers, message info, media viewers, inline voice. Shared by /groups/[id] and
// /messages/[peerId] (05 §2.2).
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Composer, VoiceRecorderSheet } from "@/components/chat/composer";
import { DateSeparator, OfflineBanner, TypingIndicator } from "@/components/chat/chrome";
import {
  MessageInfoSheet,
  MessageLongPressSheet,
  StickerPickerSheet,
} from "@/components/chat/message-actions";
import { MessageBubble, type BubbleSendState } from "@/components/chat/message-bubble";
import { chatFixtureFlags, DEMO_STICKERS, type ChatMessage } from "@/fixtures/chat";
import { DEMO_MAGIC } from "@/fixtures/media";
import { GlassSurface } from "@/components/ui/glass-surface";
import { CircleAction } from "@/components/ui/screen-header";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { ChatAvatar, type ChatAvatarKind } from "@/components/chat/chat-avatar";
import { EMPTY_TYPING, useChatState } from "@/lib/chat/chat-state";
import { uploadMedia, type MediaPick } from "@/lib/chat/media-pipeline";
import {
  useChatHistory,
  useDeleteMessage,
  useMarkRead,
  useSendMessage,
} from "@/lib/chat/use-chat";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

const ME = "user_demo_teacher";

export function GroupChatScreen({
  groupId,
  title,
  subtitle,
  memberCount,
  avatarKind = "group",
  peerId,
}: {
  groupId: string;
  title: string;
  subtitle?: string;
  memberCount?: number;
  /** DM vs group/official silhouette when there is no photo. */
  avatarKind?: ChatAvatarKind;
  /** DM peer id for a stable palette seed; defaults to `groupId`. */
  peerId?: string;
}) {
  const t = useT();
  const toast = useToast();
  const reducedMotion = useReducedMotion();
  const history = useChatHistory(groupId);
  const sendMessage = useSendMessage(groupId);
  const markRead = useMarkRead(groupId);
  const deleteMessage = useDeleteMessage(groupId);
  const typingByUser = useChatState((s) => s.typing[groupId]);
  const typing = typingByUser ?? EMPTY_TYPING;
  const outgoing = useChatState((s) => s.outgoing);
  const connection = useChatState((s) => s.connection);
  const toggleReaction = useChatState((s) => s.toggleReaction);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [infoMessage, setInfoMessage] = useState<ChatMessage | null>(null);
  const listRef = useRef<ScrollView>(null);

  const messages = history.data?.data ?? [];
  const typingNames = useMemo(
    () => Object.keys(typing).filter((id) => id !== ME),
    [typing],
  );

  // First unread separator: messages after the group's last-read cursor (fixture lastRead on row).
  const firstUnreadId = useMemo(() => {
    const unreadIncoming = messages.find((m) => m.senderId !== ME);
    // Stage-2: treat the first non-own message in a room with unreadCount>0 path as marker when
    // the newest message is from a peer — approximate WhatsApp "unread" bar on open.
    if (!unreadIncoming) return null;
    const newest = messages[messages.length - 1];
    if (newest && newest.senderId !== ME) {
      // Find first peer message after the last own message, or first peer message overall.
      let lastOwn = -1;
      messages.forEach((m, i) => {
        if (m.senderId === ME) lastOwn = i;
      });
      const idx = messages.findIndex((m, i) => i > lastOwn && m.senderId !== ME);
      return idx >= 0 ? messages[idx]?.id ?? null : unreadIncoming.id;
    }
    return null;
  }, [messages]);

  const newest = messages[messages.length - 1];
  useEffect(() => {
    if (newest && newest.senderId === ME) return;
    if (newest) markRead.mutate(newest.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest?.id]);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: !reducedMotion });
  }, [messages.length, reducedMotion]);

  const sendStateFor = (message: ChatMessage): BubbleSendState | undefined => {
    if (message.senderId !== ME) return undefined;
    if (message.clientMsgId && outgoing.some((o) => o.clientMsgId === message.clientMsgId)) {
      return outgoing.find((o) => o.clientMsgId === message.clientMsgId)?.state;
    }
    return "seen";
  };

  const doSend = (input: {
    kind: "text" | "image" | "pdf" | "voice" | "sticker";
    body?: string;
    mediaAssetId?: string;
    stickerId?: string;
  }) => {
    sendMessage.mutate(replyTo ? { ...input, replyTo: replyTo.id } : input, {
      onError: () => {
        toast({ title: t("chat.bubble.failed"), variant: "error" });
      },
      onSettled: () => {
        setReplyTo(null);
      },
    });
  };

  const pickMedia = (pick: MediaPick) => {
    void uploadMedia(pick)
      .then((ref) => {
        doSend({ kind: ref.kind, mediaAssetId: ref.assetId });
      })
      .catch(() => {
        toast({ title: t("chat.media.upload_failed"), variant: "error" });
      });
  };

  const offline = connection === "offline" || chatFixtureFlags.mode === "offline";
  const headerSubtitle =
    typingNames.length > 0
      ? t("chat.group.typing")
      : (subtitle ??
        (memberCount ? t("chat.group.members_count", { count: memberCount }) : undefined));

  return (
    <Screen
      scroll={false}
      className="flex-1"
      header={
        <ScreenHeaderForChat
          title={title}
          subtitle={headerSubtitle}
          avatarKind={avatarKind}
          avatarId={peerId ?? groupId}
        />
      }
    >
      <OfflineBanner visible={offline} />
      {history.isLoading ? (
        <View className="flex-1 gap-2 p-3">
          {["w-4/5", "w-3/5", "w-2/3"].map((w, i) => (
            <Skeleton
              key={i}
              className={cn("h-10 rounded-2xl", w, i % 2 ? "self-end" : "self-start")}
            />
          ))}
        </View>
      ) : history.isError ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text variant="muted">{t("chat.group.not_member")}</Text>
        </View>
      ) : (
        <ScrollView
          ref={listRef}
          className="flex-1"
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: false });
          }}
        >
          <View className="gap-0.5 px-2 py-1">
            {messages.map((message: ChatMessage, index) => {
              const previous = messages[index - 1];
              const needsSeparator =
                !previous ||
                new Date(previous.createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();
              const isOwn = message.senderId === ME;
              const showSender =
                !isOwn &&
                (needsSeparator || !previous || previous.senderId !== message.senderId);
              // Children as an array — avoids JSX whitespace RCTRawText under this View
              // (Fabric logs that as a blank ERROR pointing here).
              return (
                <View key={message.id}>
                  {[
                    needsSeparator ? (
                      <DateSeparator key={`${message.id}-sep`} iso={message.createdAt} />
                    ) : null,
                    message.id === firstUnreadId ? (
                      <View key={`${message.id}-unread`} className="my-1 items-center py-1">
                        <Text className="rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-semibold text-primary">
                          {t("chat.unread.separator")}
                        </Text>
                      </View>
                    ) : null,
                    <MessageBubble
                      key={`${message.id}-bubble`}
                      message={message}
                      isOwn={isOwn}
                      showSender={showSender}
                      sendState={sendStateFor(message)}
                      onLongPress={(m) => {
                        setActionMessage(m);
                      }}
                      onOpenMedia={(m) => {
                        router.push({
                          pathname: "/(modals)/media-viewer",
                          params: {
                            assetId: m.media?.assetId ?? "",
                            title: m.media?.fileName ?? "",
                            kind: m.kind,
                          },
                        });
                      }}
                      onToggleReaction={(m, emoji) => {
                        toggleReaction(m.id, emoji);
                      }}
                    />,
                  ]}
                </View>
              );
            })}
            {outgoing
              .filter((o) => o.groupId === groupId)
              .map((o) => (
                <MessageBubble
                  key={o.clientMsgId}
                  isOwn
                  showSender={false}
                  sendState={o.state}
                  message={{
                    id: o.clientMsgId,
                    groupId,
                    senderId: ME,
                    senderName: "ডেমো শিক্ষক",
                    kind: o.input.kind,
                    ...(o.input.kind === "text" ? { body: o.input.body } : {}),
                    ...(o.input.kind === "sticker" ? { stickerId: o.input.stickerId } : {}),
                    clientMsgId: o.clientMsgId,
                    createdAt: new Date().toISOString(),
                  }}
                />
              ))}
          </View>
        </ScrollView>
      )}

      <TypingIndicator names={typingNames} reducedMotion={reducedMotion} />

      <Composer
        disabled={false}
        replyPreview={replyTo ? (replyTo.body ?? replyTo.media?.fileName ?? replyTo.stickerId ?? "…") : null}
        onCancelReply={() => {
          setReplyTo(null);
        }}
        onSendText={(body) => {
          doSend({ kind: "text", body });
        }}
        onPickImage={() => {
          pickMedia({
            kind: "image",
            headerBytes: DEMO_MAGIC.jpeg,
            sizeBytes: 940_000,
            fileName: "photo.jpg",
            width: 1080,
            height: 1440,
          });
        }}
        onPickPdf={() => {
          pickMedia({
            kind: "pdf",
            headerBytes: DEMO_MAGIC.pdf,
            sizeBytes: 830_000,
            fileName: "নোটিশ.pdf",
          });
        }}
        onPickSticker={() => {
          setStickerOpen(true);
        }}
        onStartVoice={() => {
          setVoiceOpen(true);
        }}
      />
      <VoiceRecorderSheet
        visible={voiceOpen}
        onClose={() => {
          setVoiceOpen(false);
        }}
        onSend={(durationMs) => {
          setVoiceOpen(false);
          if (durationMs > 300_000) {
            toast({ title: t("chat.voice.too_long"), variant: "warning" });
            return;
          }
          pickMedia({
            kind: "voice",
            headerBytes: DEMO_MAGIC.aac,
            sizeBytes: 240_000,
            durationMs,
          });
        }}
      />
      <StickerPickerSheet
        open={stickerOpen}
        onOpenChange={setStickerOpen}
        stickers={DEMO_STICKERS}
        onPick={(stickerId) => {
          doSend({ kind: "sticker", stickerId });
        }}
      />
      <MessageLongPressSheet
        message={actionMessage}
        open={Boolean(actionMessage)}
        onOpenChange={(open) => {
          if (!open) setActionMessage(null);
        }}
        handlers={{
          onReply: (m) => {
            setReplyTo(m);
          },
          onReact: (m, emoji) => {
            toggleReaction(m.id, emoji);
          },
          onInfo: (m) => {
            setInfoMessage(m);
          },
          onDelete: (m) => {
            if (m.senderId !== ME && m.groupId.startsWith("grp_dm")) return;
            deleteMessage.mutate(m.id, {
              onError: () => {
                toast({ title: t("chat.bubble.failed"), variant: "error" });
              },
            });
          },
          canDelete: Boolean(actionMessage && (actionMessage.senderId === ME || !actionMessage.groupId.startsWith("grp_dm"))),
        }}
      />
      <MessageInfoSheet
        message={infoMessage}
        open={Boolean(infoMessage)}
        onOpenChange={(open) => {
          if (!open) setInfoMessage(null);
        }}
      />
    </Screen>
  );
}

function ScreenHeaderForChat({
  title,
  subtitle,
  avatarKind,
  avatarId,
}: {
  title: string;
  subtitle?: string;
  avatarKind: ChatAvatarKind;
  avatarId: string;
}) {
  const t = useT();
  return (
    <GlassSurface variant="light" className="border-b border-border pb-1.5 pt-12">
      <View className="flex-row items-center gap-2 px-2">
        <CircleAction
          icon={ChevronLeft}
          accessibilityLabel={t("common.actions.back")}
          onPress={() => {
            router.back();
          }}
        />
        <ChatAvatar kind={avatarKind} id={avatarId} name={title} size="sm" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-semibold text-foreground">
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} className="text-[11px] text-muted-foreground">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassSurface>
  );
}
