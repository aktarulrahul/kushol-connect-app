// Group / DM conversation (COM-AP-003..005, 010, 011, 016) in the Spartens channel language
// (owner 2026-10-09): channel header (back · avatar + name · info), pinned-message bar, inverted
// message list with day pills and the "N new unread" pill captured on open, swipe-to-reply,
// long-press focus menu (reactions · reply · edit · pin · info · delete), reply/edit banners,
// typing pill, jump-to-latest button. Shared by /groups/[id] and /messages/[peerId] (05 §2.2).
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import { router } from "expo-router";
import { CircleAlert, Info, Pencil, Pin, PinOff, Reply, Trash2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";

import { ChannelHeader, ChatInfoSheet, PinnedBar } from "@/components/chat/channel-header";
import type { ChatAvatarKind } from "@/components/chat/chat-avatar";
import {
  DateSeparator,
  EmptyConversation,
  OfflineBanner,
  ScrollToBottomButton,
  TypingIndicator,
  UnreadPill,
} from "@/components/chat/chrome";
import { AttachSheet, Composer, VoiceRecorderSheet } from "@/components/chat/composer";
import type { Anchor } from "@/components/chat/focus-overlay";
import { MessageInfoSheet, StickerPickerSheet } from "@/components/chat/message-actions";
import {
  MessageBubble,
  type BubbleAnchor,
  type BubbleSendState,
} from "@/components/chat/message-bubble";
import { MessageFocusMenu, type MessageMenuAction } from "@/components/chat/message-menu";
import { SwipeToReply } from "@/components/chat/swipe-to-reply";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import {
  chatFixtureFlags,
  DEMO_ME,
  DEMO_STICKERS,
  MAX_PINNED_MESSAGES,
  type ChatGroup,
  type ChatMessage,
} from "@/fixtures/chat";
import { DEMO_MAGIC } from "@/fixtures/media";
import { useT } from "@/i18n/locale-provider";
import { EMPTY_TYPING, reactionChips, useChatState } from "@/lib/chat/chat-state";
import { uploadMedia, type MediaPick } from "@/lib/chat/media-pipeline";
import {
  firstUnreadId,
  isSameDay,
  messagePreview,
  sortMessagesAsc,
} from "@/lib/chat/message-utils";
import {
  useChatHistory,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  usePinMessage,
  useSendMessage,
} from "@/lib/chat/use-chat";
import { cn } from "@/lib/utils";
import { motion } from "@/theme/tokens";

const ME = DEMO_ME.userId;
/** Show the jump-to-latest button once the reader is this far (pt) above the newest message. */
const JUMP_AFTER = 300;
const HIGHLIGHT_MS = 2_000;

type SendInput = {
  kind: "text" | "image" | "pdf" | "voice" | "sticker";
  body?: string;
  mediaAssetId?: string;
  stickerId?: string;
};

type Row = { message: ChatMessage; sendState?: BubbleSendState; optimistic: boolean };

/** Opens a sheet once the focus menu's modal is gone — iOS presents one modal at a time. */
function afterMenu(action: () => void): void {
  setTimeout(action, motion.duration.slow);
}

export function GroupChatScreen({
  groupId,
  title,
  group,
  subtitle,
  memberCount,
  avatarKind = "group",
  peerId,
}: {
  groupId: string;
  title: string;
  /** The cached list row — role, status and the unread count at open. */
  group?: ChatGroup;
  subtitle?: string;
  memberCount?: number;
  /** DM vs group/official silhouette when there is no photo. */
  avatarKind?: ChatAvatarKind;
  /** DM peer id for a stable palette seed; defaults to `groupId`. */
  peerId?: string;
}) {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const history = useChatHistory(groupId);
  const sendMessage = useSendMessage(groupId);
  const markRead = useMarkRead(groupId);
  const deleteMessage = useDeleteMessage(groupId);
  const editMessage = useEditMessage(groupId);
  const pinMessage = usePinMessage(groupId);
  const typing = useChatState((s) => s.typing[groupId]) ?? EMPTY_TYPING;
  const outgoing = useChatState((s) => s.outgoing);
  const connection = useChatState((s) => s.connection);
  const reactions = useChatState((s) => s.reactions);
  const presence = useChatState((s) => s.presence);
  const toggleReaction = useChatState((s) => s.toggleReaction);
  const dropSend = useChatState((s) => s.dropSend);
  const draft = useChatState((s) => s.drafts[groupId]) ?? "";
  const setDraft = useChatState((s) => s.setDraft);

  const listRef = useRef<FlatList<Row>>(null);
  const [focusKey, setFocusKey] = useState(0);
  // The unread pill is captured once, when the room opens; reading clears the row's count.
  const [unreadAtOpen] = useState(() => group?.unreadCount ?? 0);
  const [showUnread, setShowUnread] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [focus, setFocus] = useState<{ message: ChatMessage; anchor: Anchor } | null>(null);
  const [infoMessage, setInfoMessage] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [activePin, setActivePin] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const isGroup = avatarKind !== "dm";
  const moderator = isGroup && group !== undefined && group.myRole !== "member";
  const readOnly = group?.status === "archived" || group?.status === "pending_approval";

  const messages = useMemo(() => sortMessagesAsc(history.data?.data ?? []), [history.data]);
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const unreadMarker = useMemo(
    () => (showUnread ? firstUnreadId(messages, unreadAtOpen, ME) : null),
    [messages, unreadAtOpen, showUnread],
  );

  // History rows + optimistic sends not yet in history, newest first for the inverted list.
  const rows = useMemo<Row[]>(() => {
    const tracked = new Map(
      outgoing.filter((o) => o.groupId === groupId).map((o) => [o.clientMsgId, o]),
    );
    const seen = new Set(messages.map((m) => m.clientMsgId));
    const fromHistory: Row[] = messages.map((message) => ({
      message,
      optimistic: false,
      sendState:
        message.senderId !== ME ? undefined : (tracked.get(message.clientMsgId)?.state ?? "seen"),
    }));
    const pending: Row[] = [...tracked.values()]
      .filter((o) => !seen.has(o.clientMsgId))
      .map((o) => ({
        optimistic: true,
        sendState: o.state,
        message: {
          id: o.clientMsgId,
          groupId,
          senderId: ME,
          senderName: DEMO_ME.name,
          kind: o.input.kind,
          ...(o.input.kind === "text" ? { body: o.input.body } : {}),
          ...(o.input.kind === "sticker" ? { stickerId: o.input.stickerId } : {}),
          ...(o.input.replyTo
            ? {
                replyTo: o.input.replyTo,
                replyPreview: previewOf(byId.get(o.input.replyTo)),
              }
            : {}),
          clientMsgId: o.clientMsgId,
          createdAt: new Date().toISOString(),
        },
      }));
    return [...fromHistory, ...pending].reverse();
    // previewOf is stable per locale via t; byId covers quoted messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, outgoing, groupId, byId]);

  const pins = useMemo(
    () =>
      messages
        .filter((m) => m.pinnedAt && !m.deletedAt)
        .sort((a, b) => Date.parse(b.pinnedAt ?? "") - Date.parse(a.pinnedAt ?? "")),
    [messages],
  );

  const typers = useMemo(() => {
    const names = new Map(messages.map((m) => [m.senderId, m.senderName]));
    return Object.keys(typing)
      .filter((id) => id !== ME)
      .map((userId) => ({ userId, name: names.get(userId) ?? title }));
  }, [typing, messages, title]);

  function previewOf(message: ChatMessage | undefined): string {
    if (!message) return "…";
    if (message.deletedAt) return t("chat.deleted");
    return messagePreview(message, {
      image: t("chat.preview.image"),
      pdf: t("chat.composer.attach_pdf"),
      voice: t("chat.preview.voice"),
      sticker: t("chat.preview.sticker"),
    });
  }

  function authorOf(message: ChatMessage | undefined): string | undefined {
    if (!message) return undefined;
    return message.senderId === ME ? t("chat.you") : message.senderName;
  }

  // Read pointer follows the newest incoming message while the room is open (US-006).
  const newestIncoming = [...messages].reverse().find((m) => m.senderId !== ME);
  useEffect(() => {
    if (newestIncoming) markRead.mutate(newestIncoming.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestIncoming?.id]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardOpen(true);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardOpen(false);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => {
      setHighlighted(null);
    }, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [highlighted]);

  const scrollToLatest = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: !reducedMotion });
  };

  const jumpTo = (messageId: string) => {
    const index = rows.findIndex((row) => row.message.id === messageId);
    if (index === -1) return;
    setHighlighted(messageId);
    listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: !reducedMotion });
  };

  const doSend = (input: SendInput) => {
    const quoted = replyTo;
    sendMessage.mutate(quoted ? { ...input, replyTo: quoted.id } : input, {
      onError: () => {
        toast({ title: t("chat.bubble.failed"), variant: "error" });
      },
    });
    setReplyTo(null);
    setShowUnread(false);
    scrollToLatest();
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

  const submitText = (body: string) => {
    if (editing) {
      const target = editing.id;
      setEditing(null);
      editMessage.mutate(
        { messageId: target, body },
        {
          onError: () => {
            toast({ title: t("common.state.error_title"), variant: "error" });
          },
        },
      );
      return;
    }
    setDraft(groupId, "");
    doSend({ kind: "text", body });
  };

  const startReply = (message: ChatMessage) => {
    setEditing(null);
    setReplyTo(message);
    afterMenu(() => {
      setFocusKey((n) => n + 1);
    });
  };

  const togglePin = (message: ChatMessage) => {
    const pinned = Boolean(message.pinnedAt);
    if (!pinned && pins.length >= MAX_PINNED_MESSAGES) {
      toast({ title: t("chat.pinned.limit", { count: MAX_PINNED_MESSAGES }), variant: "info" });
      return;
    }
    pinMessage.mutate(
      { messageId: message.id, pinned: !pinned },
      {
        onError: () => {
          toast({ title: t("chat.errors.forbidden"), variant: "error" });
        },
      },
    );
  };

  // A failed bubble resends its own input (reply included) without touching the composer.
  const retry = (message: ChatMessage) => {
    const failed = outgoing.find((o) => o.clientMsgId === message.clientMsgId);
    if (!failed) return;
    dropSend(failed.clientMsgId);
    sendMessage.mutate(failed.input, {
      onError: () => {
        toast({ title: t("chat.bubble.failed"), variant: "error" });
      },
    });
  };

  const actionsFor = (message: ChatMessage, optimistic: boolean): MessageMenuAction[] => {
    if (message.deletedAt || optimistic) return [];
    const own = message.senderId === ME;
    const list: MessageMenuAction[] = [
      {
        key: "reply",
        label: t("chat.actions.reply"),
        icon: Reply,
        onPress: () => {
          startReply(message);
        },
      },
    ];
    if (own && message.kind === "text") {
      list.push({
        key: "edit",
        label: t("chat.actions.edit"),
        icon: Pencil,
        onPress: () => {
          setReplyTo(null);
          setEditing({ id: message.id, text: message.body ?? "" });
          afterMenu(() => {
            setFocusKey((n) => n + 1);
          });
        },
      });
    }
    if (moderator) {
      const pinned = Boolean(message.pinnedAt);
      list.push({
        key: pinned ? "unpin" : "pin",
        label: pinned ? t("chat.actions.unpin") : t("chat.actions.pin"),
        icon: pinned ? PinOff : Pin,
        onPress: () => {
          togglePin(message);
        },
      });
    }
    if (own) {
      list.push({
        key: "info",
        label: t("chat.actions.message_info"),
        icon: Info,
        onPress: () => {
          afterMenu(() => {
            setInfoMessage(message);
          });
        },
      });
    }
    if (own || moderator) {
      list.push({
        key: "delete",
        label: t("chat.actions.delete_message"),
        icon: Trash2,
        destructive: true,
        onPress: () => {
          afterMenu(() => {
            setDeleteTarget(message);
          });
        },
      });
    }
    return list;
  };

  const offline = connection === "offline" || chatFixtureFlags.mode === "offline";
  const peerOnline = !isGroup && peerId ? presence[peerId] === true : false;
  const headerSubtitle =
    typers.length > 0
      ? t("chat.group.typing")
      : (subtitle ??
        (peerOnline
          ? t("chat.group.online")
          : memberCount
            ? t("chat.group.members_count", { count: memberCount })
            : undefined));

  const infoDetails = [
    avatarKind === "dm"
      ? t("chat.header.kind_dm")
      : avatarKind === "official"
        ? t("chat.header.kind_official")
        : t("chat.header.kind_custom"),
    ...(memberCount ? [t("chat.group.members_count", { count: memberCount })] : []),
    ...(peerOnline ? [t("chat.group.online")] : []),
  ];

  const focusRow = focus ? rows.find((row) => row.message.id === focus.message.id) : undefined;
  const focusMessage = focusRow?.message ?? focus?.message;
  const replyQuote = replyTo
    ? { author: authorOf(replyTo) ?? "", preview: previewOf(replyTo) }
    : null;

  const renderBubble = (row: Row, preview: boolean) => {
    const message = row.message;
    const own = message.senderId === ME;
    return (
      <MessageBubble
        message={message}
        isOwn={own}
        showSender={!own}
        isGroup={isGroup}
        sendState={row.sendState}
        replyAuthor={message.replyTo ? authorOf(byId.get(message.replyTo)) : undefined}
        preview={preview}
        onLongPress={
          preview
            ? undefined
            : (m: ChatMessage, anchor: BubbleAnchor, remeasure) => {
                if (!keyboardOpen) {
                  setFocus({ message: m, anchor });
                  return;
                }
                // The bubble moves when the keyboard drops — lift it from where it lands.
                Keyboard.dismiss();
                setTimeout(() => {
                  remeasure((settled) => {
                    setFocus({ message: m, anchor: settled });
                  });
                }, motion.duration.slow + motion.duration.fast);
              }
        }
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
        onPressReply={jumpTo}
        onRetry={retry}
      />
    );
  };

  const renderRow = ({ item, index }: { item: Row; index: number }) => {
    const message = item.message;
    const own = message.senderId === ME;
    // rows are newest-first: the chronologically previous message is the next row.
    const previous = rows[index + 1]?.message;
    const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
    return (
      <View className="px-4 py-1.5">
        {newDay ? <DateSeparator iso={message.createdAt} /> : null}
        {message.id === unreadMarker ? <UnreadPill count={unreadAtOpen} /> : null}
        <View
          className={cn(
            "rounded-xl",
            newDay || message.id === unreadMarker ? "mt-2" : undefined,
            highlighted === message.id && "bg-primary-soft",
          )}
        >
          <SwipeToReply
            direction={own ? "left" : "right"}
            enabled={!message.deletedAt && !item.optimistic && !readOnly}
            onReply={() => {
              startReply(message);
            }}
          >
            {renderBubble(item, false)}
          </SwipeToReply>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ChannelHeader
        title={title}
        subtitle={headerSubtitle}
        subtitleActive={typers.length > 0 || peerOnline}
        avatarKind={avatarKind}
        avatarId={peerId ?? groupId}
        onBack={() => {
          router.back();
        }}
        onOpenInfo={() => {
          setInfoOpen(true);
        }}
      />
      <OfflineBanner visible={offline} />
      <PinnedBar
        previews={pins.map((m) => previewOf(m))}
        activeIndex={activePin}
        onPress={() => {
          const pin = pins[activePin % Math.max(pins.length, 1)];
          if (pin) jumpTo(pin.id);
          if (pins.length > 1) setActivePin((i) => (i + 1) % pins.length);
        }}
      />
      {/* Overlap-based padding: safe whether or not Android resizes the window (edge-to-edge). */}
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <View className="flex-1 bg-muted">
          {history.isLoading ? (
            <View className="flex-1 justify-end gap-3 p-4">
              {["w-3/5", "w-4/5", "w-2/3", "w-1/2"].map((w, i) => (
                <Skeleton
                  key={w}
                  className={cn("h-12 rounded-xl", w, i % 2 ? "self-end" : "self-start")}
                />
              ))}
            </View>
          ) : history.isError ? (
            <View className="flex-1 items-center justify-center gap-2 p-6">
              <Icon as={CircleAlert} size={28} className="text-muted-foreground" />
              <Text variant="muted" className="text-center">
                {t("chat.group.not_member")}
              </Text>
            </View>
          ) : rows.length === 0 ? (
            <EmptyConversation />
          ) : (
            <FlatList
              ref={listRef}
              inverted
              data={rows}
              keyExtractor={(row) => row.message.id}
              renderItem={renderRow}
              extraData={{ highlighted, unreadMarker, reactions }}
              contentContainerClassName="py-2"
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={64}
              onScroll={(event) => {
                const away = event.nativeEvent.contentOffset.y > JUMP_AFTER;
                setShowJump((prev) => (prev === away ? prev : away));
              }}
              onScrollToIndexFailed={(info) => {
                listRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: false,
                });
                setTimeout(() => {
                  listRef.current?.scrollToIndex({
                    index: info.index,
                    viewPosition: 0.5,
                    animated: !reducedMotion,
                  });
                }, 100);
              }}
            />
          )}
          <ScrollToBottomButton visible={showJump} onPress={scrollToLatest} />
        </View>

        <View className="bg-muted">
          <TypingIndicator typers={typers} showAvatars={isGroup} />
        </View>
        <Composer
          focusKey={focusKey}
          value={editing ? editing.text : draft}
          onChangeText={(text) => {
            if (editing) setEditing({ ...editing, text });
            else setDraft(groupId, text);
          }}
          onSend={submitText}
          disabled={readOnly}
          disabledNotice={
            group?.status === "pending_approval" ? t("chat.group.pending_badge") : undefined
          }
          reply={replyQuote}
          onCancelReply={() => {
            setReplyTo(null);
          }}
          editing={editing !== null}
          onCancelEdit={() => {
            setEditing(null);
          }}
          onOpenAttach={() => {
            Keyboard.dismiss();
            setAttachOpen(true);
          }}
          onOpenStickers={() => {
            Keyboard.dismiss();
            setStickerOpen(true);
          }}
          onStartVoice={() => {
            Keyboard.dismiss();
            setVoiceOpen(true);
          }}
          bottomInset={keyboardOpen ? 0 : insets.bottom}
        />
      </KeyboardAvoidingView>

      <MessageFocusMenu
        anchor={focus?.anchor ?? null}
        align={focusMessage?.senderId === ME ? "end" : "start"}
        preview={focusRow ? renderBubble(focusRow, true) : null}
        actions={focusMessage ? actionsFor(focusMessage, focusRow?.optimistic ?? false) : []}
        reactions={Boolean(focusMessage && !focusMessage.deletedAt && !focusRow?.optimistic)}
        selectedEmojis={
          focusMessage
            ? reactionChips(reactions, focusMessage.id)
                .filter((chip) => chip.mine)
                .map((chip) => chip.emoji)
            : []
        }
        onReact={(emoji) => {
          if (focusMessage) toggleReaction(focusMessage.id, emoji);
        }}
        onClose={() => {
          setFocus(null);
        }}
      />
      <AttachSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
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
          afterMenu(() => {
            setStickerOpen(true);
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
      <MessageInfoSheet
        message={infoMessage}
        open={Boolean(infoMessage)}
        onOpenChange={(open) => {
          if (!open) setInfoMessage(null);
        }}
      />
      <ChatInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title={title}
        avatarKind={avatarKind}
        avatarId={peerId ?? groupId}
        details={infoDetails}
      />
      <ConfirmModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        destructive
        icon={Trash2}
        title={t("chat.delete.confirm_title")}
        description={t("chat.delete.confirm_body")}
        confirmLabel={t("chat.delete.action")}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (!target) return;
          deleteMessage.mutate(target.id, {
            onError: () => {
              toast({ title: t("chat.errors.forbidden"), variant: "error" });
            },
          });
        }}
      />
    </View>
  );
}
