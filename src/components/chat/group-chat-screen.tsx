// Group / DM conversation (COM-AP-003..005, 010, 011, 016) in the Spartens channel language
// (owner 2026-10-09): channel header (back · avatar + name · info), pinned-message bar, inverted
// message list with day pills and the "N new unread" pill captured on open, swipe-to-reply,
// long-press focus menu (reactions · reply · forward · star · edit · pin · info · delete), reply/edit banners,
// typing pill, jump-to-latest button, @mentions in groups and the starred-messages sheet (owner
// 2026-10-19). Shared by /groups/[id] and /messages/[peerId] (05 §2.2).
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  CircleAlert,
  Forward,
  Info,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Star,
  StarOff,
  Trash2,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";

import { AttachmentCaptionSheet } from "@/components/chat/attachment-caption-sheet";
import { ChannelHeader, ChatInfoSheet, PinnedBar } from "@/components/chat/channel-header";
import { ChatWallpaper } from "@/components/chat/chat-wallpaper";
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
import { ForwardSheet } from "@/components/chat/forward-sheet";
import { KlipyPickerSheet } from "@/components/chat/klipy-picker-sheet";
import { MessageInfoSheet, StickerPickerSheet } from "@/components/chat/message-actions";
import {
  MessageBubble,
  type BubbleAnchor,
  type BubbleSendState,
} from "@/components/chat/message-bubble";
import { MessageFocusMenu, type MessageMenuAction } from "@/components/chat/message-menu";
import { PollSheet } from "@/components/chat/poll-sheet";
import { StarredMessagesSheet } from "@/components/chat/starred-sheet";
import { SwipeToReply } from "@/components/chat/swipe-to-reply";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import {
  ChatFixtureError,
  chatFixtureFlags,
  DEMO_STICKERS,
  forwardChatMessage,
  MAX_PINNED_MESSAGES,
  sendChatRead,
  sendChatTyping,
  votePollMessage,
  type ChatGroup,
  type ChatMessage,
} from "@/fixtures/chat";
import { DEMO_MAGIC } from "@/fixtures/media";
import { useT } from "@/i18n/locale-provider";
import { EMPTY_TYPING, reactionChips, useChatState } from "@/lib/chat/chat-state";
import { useChatMe } from "@/lib/chat/chat-identity";
import { pickDocument, pickImage, type PickOutcome } from "@/lib/chat/device-media";
import { klipyShare, type KlipyKind, type KlipyMedia } from "@/lib/chat/klipy";
import { chatLiveModeSync, liveChat } from "@/lib/chat/live-chat";
import { uploadMedia, type MediaPick } from "@/lib/chat/media-pipeline";
import {
  collectMentionIds,
  editMentions,
  MAX_MENTIONS,
  mentionedMembers,
  mentionsViewer,
  type MentionMember,
} from "@/lib/chat/mentions";
import { receiptState } from "@/lib/chat/receipts";
import { starActionFor, starredEntries } from "@/lib/chat/starred";
import { VoiceRecordingSession, type VoiceSessionHandle } from "@/lib/chat/voice-recorder";
import {
  firstUnreadId,
  isSameDay,
  messagePreview,
  sortMessagesAsc,
} from "@/lib/chat/message-utils";
import {
  chatKeys,
  useChatHistory,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  usePinMessage,
  useStarMessage,
  useChatGroupMembers,
  useStarredMessages,
  useSendMessage,
} from "@/lib/chat/use-chat";
import { cn } from "@/lib/utils";
import { motion } from "@/theme/tokens";

/** Show the jump-to-latest button once the reader is this far (pt) above the newest message. */
const JUMP_AFTER = 300;
const HIGHLIGHT_MS = 2_000;

type SendInput = {
  kind: "text" | "image" | "pdf" | "doc" | "sheet" | "csv" | "voice" | "sticker" | "gif" | "poll";
  body?: string;
  mediaAssetId?: string;
  stickerId?: string;
  /** KLIPY GIF/sticker (owner 2026-10-18). */
  klipy?: KlipyMedia;
  poll?: { question: string; options: string[]; allowMultiple: boolean };
  /** Tagged member ids (@mentions, owner 2026-10-19) — text messages only from the composer. */
  mentions?: string[];
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
  const queryClient = useQueryClient();
  // "Me" is the signed-in account in live sessions; the demo teacher on fixtures.
  const me = useChatMe();
  const ME = me.userId;
  const live = chatLiveModeSync();
  const voiceSession = useRef<VoiceSessionHandle>(null);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const history = useChatHistory(groupId);
  const sendMessage = useSendMessage(groupId);
  const markRead = useMarkRead(groupId);
  const deleteMessage = useDeleteMessage(groupId);
  const editMessage = useEditMessage(groupId);
  const pinMessage = usePinMessage(groupId);
  const starMessage = useStarMessage(groupId);
  // @mentions (owner 2026-10-19): the group roster feeds the composer suggestions and resolves
  // mention ids to names in bubbles; picked members ride the next send/edit while their
  // "@Full Name" is still in the text.
  const roster = useChatGroupMembers(groupId, avatarKind !== "dm");
  const pickedMentions = useRef<MentionMember[]>([]);
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
  const typingSentAtRef = useRef(0);
  const [focusKey, setFocusKey] = useState(0);
  // The unread pill is captured once, when the room opens; reading clears the row's count.
  const [unreadAtOpen] = useState(() => group?.unreadCount ?? 0);
  const [showUnread, setShowUnread] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    text: string;
    /** The stored @mentions when the edit began (PATCH keeps them unless the set changes). */
    mentions?: string[] | undefined;
  } | null>(null);
  const [focus, setFocus] = useState<{ message: ChatMessage; anchor: Anchor } | null>(null);
  const [infoMessage, setInfoMessage] = useState<ChatMessage | null>(null);
  const [forwardSource, setForwardSource] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [activePin, setActivePin] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  // Starred messages (owner 2026-10-19): the info row's count + the sheet share one query.
  const [starredOpen, setStarredOpen] = useState(false);
  const starredList = useStarredMessages(groupId, infoOpen || starredOpen);
  // WhatsApp send preview: a picked photo/document waits here for its caption.
  const [captionPick, setCaptionPick] = useState<MediaPick | null>(null);
  const [klipyKind, setKlipyKind] = useState<KlipyKind | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  // KLIPY GIFs/stickers: the api hands out the app key; the device searches KLIPY itself.
  const klipyConfig = useQuery({
    queryKey: ["chat_klipy_config", ME],
    queryFn: () => liveChat.klipyConfig(),
    enabled: live,
    staleTime: 30 * 60_000,
  });
  const klipy = klipyConfig.data?.enabled ? klipyConfig.data : null;

  const isGroup = avatarKind !== "dm";
  const moderator = isGroup && group !== undefined && group.myRole !== "member";
  const readOnly = group?.status === "archived" || group?.status === "pending_approval";

  const messages = useMemo(() => sortMessagesAsc(history.data?.data ?? []), [history.data]);
  const readUpTo = history.data?.readUpTo;
  const deliveredUpTo = history.data?.deliveredUpTo;
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const unreadMarker = useMemo(
    () => (showUnread ? firstUnreadId(messages, unreadAtOpen, ME) : null),
    [messages, unreadAtOpen, showUnread, ME],
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
        message.senderId !== ME
          ? undefined
          : (tracked.get(message.clientMsgId)?.state ??
            (live ? receiptState(message.createdAt, readUpTo, deliveredUpTo) : "seen")),
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
          senderName: me.name,
          kind: o.input.kind,
          ...(o.input.kind === "text" ? { body: o.input.body } : {}),
          ...(o.input.kind === "sticker" ? { stickerId: o.input.stickerId } : {}),
          ...(o.input.klipy ? { klipy: o.input.klipy } : {}),
          ...(o.input.poll
            ? {
                poll: {
                  question: o.input.poll.question,
                  options: o.input.poll.options.map((text) => ({ text, votes: 0 })),
                  ...(o.input.poll.allowMultiple ? { allowMultiple: true } : {}),
                },
              }
            : {}),
          ...(o.input.body && o.input.kind !== "text" ? { body: o.input.body } : {}),
          ...(o.input.mentions?.length ? { mentions: o.input.mentions } : {}),
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
  }, [messages, outgoing, groupId, byId, ME, live, readUpTo, deliveredUpTo]);

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
  }, [typing, messages, title, ME]);

  function previewOf(message: ChatMessage | undefined): string {
    if (!message) return "…";
    if (message.deletedAt) return t("chat.deleted");
    return messagePreview(message, {
      image: t("chat.preview.image"),
      pdf: t("chat.composer.attach_pdf"),
      document: t("chat.preview.document"),
      voice: t("chat.preview.voice"),
      sticker: t("chat.preview.sticker"),
      gif: t("chat.preview.gif"),
      poll: t("chat.preview.poll"),
    });
  }

  function authorOf(message: ChatMessage | undefined): string | undefined {
    if (!message) return undefined;
    return message.senderId === ME ? t("chat.you") : message.senderName;
  }

  // Read pointer follows the newest incoming message while the room is open (US-006).
  const newestIncoming = [...messages].reverse().find((m) => m.senderId !== ME);
  useEffect(() => {
    if (newestIncoming) {
      markRead.mutate(newestIncoming.id);
      sendChatRead(groupId, newestIncoming.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestIncoming?.id]);

  useEffect(() => {
    return () => {
      sendChatTyping(groupId, "stop");
    };
  }, [groupId]);

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

  /** Scrolls to a loaded message and flashes it; false when it is not in the loaded window. */
  const jumpTo = (messageId: string): boolean => {
    const index = rows.findIndex((row) => row.message.id === messageId);
    if (index === -1) return false;
    setHighlighted(messageId);
    listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: !reducedMotion });
    return true;
  };

  /**
   * A send failed. When it tagged someone and the api said VALIDATION_FAILED, a mentioned member
   * left the group: the red bubble would only fail again on retry, so it goes away, the text
   * comes back into an empty composer and the roster refreshes (owner 2026-10-19).
   */
  const sendFailed = (input: { body?: string; mentions?: string[] }, error: unknown) => {
    const mentionRefused =
      (input.mentions?.length ?? 0) > 0 &&
      error instanceof ChatFixtureError &&
      error.code === "VALIDATION_FAILED";
    if (!mentionRefused) {
      toast({ title: t("chat.bubble.failed"), variant: "error" });
      return;
    }
    const state = useChatState.getState();
    const failed = [...state.outgoing]
      .reverse()
      .find((o) => o.groupId === groupId && o.input.body === input.body && o.state === "failed");
    if (failed) dropSend(failed.clientMsgId);
    if (input.body && !state.drafts[groupId]) setDraft(groupId, input.body);
    void queryClient.invalidateQueries({ queryKey: chatKeys.members(groupId) });
    toast({ title: t("chat.mention.not_member"), variant: "error" });
  };

  const doSend = (input: SendInput) => {
    const quoted = replyTo;
    sendMessage.mutate(quoted ? { ...input, replyTo: quoted.id } : input, {
      onError: (error) => {
        sendFailed(input, error);
      },
    });
    setReplyTo(null);
    setShowUnread(false);
    scrollToLatest();
  };

  const pickMedia = (pick: MediaPick, caption = "") => {
    void uploadMedia(pick)
      .then((ref) => {
        // slides never come from the chat pickers; anything Office-like sends as a document.
        doSend({
          kind: ref.kind === "slides" ? "doc" : ref.kind,
          mediaAssetId: ref.assetId,
          ...(caption && ref.kind !== "voice" ? { body: caption } : {}),
        });
      })
      .catch(() => {
        toast({ title: t("chat.media.upload_failed"), variant: "error" });
      });
  };

  // Live sessions: real files from the system pickers → Cloudflare R2 (demo keeps fixtures).
  const sendPicked = (outcome: PickOutcome) => {
    if (outcome.ok) {
      setCaptionPick(outcome.pick); // WhatsApp: preview + caption before the upload
      return;
    }
    if (outcome.reason === "too_large") {
      toast({ title: t("chat.media.file_too_large"), variant: "warning" });
    } else if (outcome.reason === "unsupported") {
      toast({ title: t("chat.media.unsupported"), variant: "warning" });
    }
  };

  const failPick = () => {
    toast({ title: t("chat.media.upload_failed"), variant: "error" });
  };

  // Reactions are server state in live sessions (everyone sees them); local on fixtures.
  const reactTo = (message: ChatMessage, emoji: string) => {
    if (!live) {
      toggleReaction(message.id, emoji);
      return;
    }
    void liveChat
      .toggleReaction(message.id, emoji)
      .then(() => queryClient.invalidateQueries({ queryKey: chatKeys.history(groupId) }))
      .catch(() => {
        toast({ title: t("common.state.error_title"), variant: "error" });
      });
  };

  const tooManyMentions = (ids: readonly string[] | undefined): boolean => {
    if (!ids || ids.length <= MAX_MENTIONS) return false;
    toast({ title: t("chat.mention.too_many", { count: MAX_MENTIONS }), variant: "warning" });
    return true;
  };

  const submitText = (body: string) => {
    if (editing) {
      const target = editing;
      // PATCH semantics: omitted when the tagged set is unchanged (or the roster is unknown).
      const mentions = editMentions(
        body,
        target.mentions,
        pickedMentions.current,
        roster.data,
        ME,
      );
      if (tooManyMentions(mentions)) return;
      setEditing(null);
      pickedMentions.current = [];
      editMessage.mutate(
        { messageId: target.id, body, ...(mentions !== undefined ? { mentions } : {}) },
        {
          onError: (error) => {
            const refused =
              (mentions?.length ?? 0) > 0 &&
              error instanceof ChatFixtureError &&
              error.code === "VALIDATION_FAILED";
            if (refused) void queryClient.invalidateQueries({ queryKey: chatKeys.members(groupId) });
            toast({
              title: refused ? t("chat.mention.not_member") : t("common.state.error_title"),
              variant: "error",
            });
          },
        },
      );
      return;
    }
    // Every "@Full Name" still in the text that names a picked (or uniquely named) member.
    const mentions =
      isGroup && roster.data
        ? collectMentionIds(body, pickedMentions.current, roster.data, ME)
        : [];
    if (tooManyMentions(mentions)) return;
    setDraft(groupId, "");
    pickedMentions.current = [];
    sendChatTyping(groupId, "stop");
    doSend({ kind: "text", body, ...(mentions.length > 0 ? { mentions } : {}) });
  };

  const startReply = (message: ChatMessage) => {
    setEditing(null);
    setReplyTo(message);
    afterMenu(() => {
      setFocusKey((n) => n + 1);
    });
  };

  // WhatsApp forward: copies into the picked chats; the api re-checks every target.
  const forwardTo = (targetGroupIds: string[]) => {
    const source = forwardSource;
    if (!source) return;
    setForwarding(true);
    forwardChatMessage(source.id, targetGroupIds)
      .then((count) => {
        setForwardSource(null);
        toast({ title: t("chat.forward.done", { count }), variant: "success" });
        void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
      })
      .catch(() => {
        toast({ title: t("chat.forward.failed"), variant: "error" });
      })
      .finally(() => {
        setForwarding(false);
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
      onError: (error) => {
        sendFailed(failed.input, error);
      },
    });
  };

  // Star / unstar (owner 2026-10-19): a private bookmark — no role gate, nothing fans out.
  const setStar = (message: ChatMessage, starred: boolean) => {
    starMessage.mutate(
      { messageId: message.id, starred },
      {
        onError: () => {
          toast({ title: t("chat.starred.failed"), variant: "error" });
        },
      },
    );
  };

  const actionsFor = (message: ChatMessage, optimistic: boolean): MessageMenuAction[] => {
    if (message.deletedAt || optimistic) return [];
    const own = message.senderId === ME;
    const star = starActionFor(message, optimistic);
    const list: MessageMenuAction[] = [
      {
        key: "reply",
        label: t("chat.actions.reply"),
        icon: Reply,
        onPress: () => {
          startReply(message);
        },
      },
      {
        key: "forward",
        label: t("chat.actions.forward"),
        icon: Forward,
        onPress: () => {
          afterMenu(() => {
            setForwardSource(message);
          });
        },
      },
    ];
    if (star) {
      list.push({
        key: star,
        label: star === "unstar" ? t("chat.actions.unstar") : t("chat.actions.star"),
        icon: star === "unstar" ? StarOff : Star,
        onPress: () => {
          setStar(message, star === "star");
        },
      });
    }
    if (own && message.kind === "text") {
      list.push({
        key: "edit",
        label: t("chat.actions.edit"),
        icon: Pencil,
        onPress: () => {
          setReplyTo(null);
          pickedMentions.current = [];
          setEditing({ id: message.id, text: message.body ?? "", mentions: message.mentions });
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
    ...(group?.description ? [group.description] : []),
  ];

  const focusRow = focus ? rows.find((row) => row.message.id === focus.message.id) : undefined;
  const focusMessage = focusRow?.message ?? focus?.message;
  const replyQuote = replyTo
    ? { author: authorOf(replyTo) ?? "", preview: previewOf(replyTo) }
    : null;

  const sendKlipy = (kind: KlipyKind, media: KlipyMedia, query: string, slug: string) => {
    doSend({ kind: kind === "gifs" ? "gif" : "sticker", klipy: media });
    if (klipy) klipyShare(klipy, kind, slug, query);
  };

  const votePoll = (message: ChatMessage, optionIndex: number) => {
    void votePollMessage(message.id, optionIndex)
      .then(() => queryClient.invalidateQueries({ queryKey: chatKeys.history(groupId) }))
      .catch(() => {
        toast({ title: t("chat.poll.vote_failed"), variant: "error" });
      });
  };

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
        starred={message.starred === true}
        mentionMembers={mentionedMembers(message.mentions, roster.data)}
        mentionsMe={mentionsViewer(message, ME)}
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
          reactTo(m, emoji);
        }}
        onPressReply={jumpTo}
        onRetry={retry}
        {...(row.optimistic ? {} : { onVotePoll: votePoll })}
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
        photoAssetId={group?.photoAssetId}
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
          <ChatWallpaper />
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
            else {
              setDraft(groupId, text);
              if (text.trim().length > 0) {
                const now = Date.now();
                if (now - typingSentAtRef.current > 2_500) {
                  typingSentAtRef.current = now;
                  sendChatTyping(groupId, "start");
                }
              } else if (typingSentAtRef.current > 0) {
                typingSentAtRef.current = 0;
                sendChatTyping(groupId, "stop");
              }
            }
          }}
          onSend={submitText}
          disabled={readOnly}
          mentionCandidates={isGroup ? roster.data : undefined}
          myUserId={ME}
          onMentionPick={(member) => {
            pickedMentions.current = [
              ...pickedMentions.current.filter((m) => m.userId !== member.userId),
              member,
            ];
          }}
          disabledNotice={
            group?.status === "pending_approval" ? t("chat.group.pending_badge") : undefined
          }
          reply={replyQuote}
          onCancelReply={() => {
            setReplyTo(null);
          }}
          editing={editing !== null}
          onCancelEdit={() => {
            pickedMentions.current = [];
            setEditing(null);
          }}
          onOpenAttach={() => {
            Keyboard.dismiss();
            setAttachOpen(true);
          }}
          onOpenStickers={() => {
            Keyboard.dismiss();
            if (klipy) setKlipyKind("stickers");
            else setStickerOpen(true);
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
            ? (focusMessage.reactions ?? reactionChips(reactions, focusMessage.id))
                .filter((chip) => "mine" in chip && chip.mine === true)
                .map((chip) => chip.emoji)
            : []
        }
        onReact={(emoji) => {
          if (focusMessage) reactTo(focusMessage, emoji);
        }}
        onClose={() => {
          setFocus(null);
        }}
      />
      <AttachSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        onPickImage={() => {
          if (live) {
            void pickImage().then(sendPicked).catch(failPick);
            return;
          }
          setCaptionPick({
            kind: "image",
            headerBytes: DEMO_MAGIC.jpeg,
            sizeBytes: 940_000,
            fileName: "photo.jpg",
            width: 1080,
            height: 1440,
          });
        }}
        onPickPdf={() => {
          if (live) {
            void pickDocument().then(sendPicked).catch(failPick);
            return;
          }
          setCaptionPick({
            kind: "pdf",
            headerBytes: DEMO_MAGIC.pdf,
            sizeBytes: 830_000,
            fileName: "নোটিশ.pdf",
          });
        }}
        onPickSticker={() => {
          afterMenu(() => {
            if (klipy) setKlipyKind("stickers");
            else setStickerOpen(true);
          });
        }}
        {...(klipy
          ? {
              onPickGif: () => {
                afterMenu(() => {
                  setKlipyKind("gifs");
                });
              },
            }
          : {})}
        onPickPoll={() => {
          afterMenu(() => {
            setPollOpen(true);
          });
        }}
      />
      <AttachmentCaptionSheet
        pick={captionPick}
        onCancel={() => {
          setCaptionPick(null);
        }}
        onSend={(pick, caption) => {
          setCaptionPick(null);
          pickMedia(pick, caption);
        }}
      />
      {klipy ? (
        <KlipyPickerSheet
          open={klipyKind !== null}
          onOpenChange={(open) => {
            if (!open) setKlipyKind(null);
          }}
          config={klipy}
          initialKind={klipyKind ?? "gifs"}
          onPick={(kind, item, query) => {
            sendKlipy(kind, item.send, query, item.slug);
          }}
        />
      ) : null}
      <PollSheet
        open={pollOpen}
        onOpenChange={setPollOpen}
        onCreate={(poll) => {
          doSend({ kind: "poll", poll });
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
      {live && voiceOpen ? (
        <VoiceRecordingSession
          ref={voiceSession}
          onDenied={() => {
            setVoiceOpen(false);
            toast({ title: t("chat.voice.mic_denied"), variant: "warning" });
          }}
          onFailed={() => {
            setVoiceOpen(false);
            failPick();
          }}
        />
      ) : null}
      <VoiceRecorderSheet
        visible={voiceOpen}
        onClose={() => {
          void voiceSession.current?.cancel();
          setVoiceOpen(false);
        }}
        onSend={(durationMs) => {
          if (live) {
            // Real voice note: stop the recorder, then stream the .m4a to R2.
            const session = voiceSession.current;
            void (session ? session.finish() : Promise.resolve(null))
              .then((note) => {
                setVoiceOpen(false);
                if (!note) return;
                if (note.durationMs > 300_000) {
                  toast({ title: t("chat.voice.too_long"), variant: "warning" });
                  return;
                }
                pickMedia({
                  kind: "voice",
                  uri: note.uri,
                  headerBytes: new Uint8Array(0),
                  sizeBytes: 1,
                  mime: "audio/mp4",
                  fileName: "voice-note.m4a",
                  durationMs: Math.round(note.durationMs),
                });
              })
              .catch(failPick);
            return;
          }
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
      <ForwardSheet
        message={forwardSource}
        open={Boolean(forwardSource)}
        sending={forwarding}
        onOpenChange={(open) => {
          if (!open) setForwardSource(null);
        }}
        onSend={forwardTo}
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
        photoAssetId={group?.photoAssetId}
        onOpenStarred={() => {
          setInfoOpen(false);
          afterMenu(() => {
            setStarredOpen(true);
          });
        }}
        starredCount={starredList.data ? starredEntries(starredList.data).length : undefined}
        starredMore={starredList.hasNextPage}
      />
      <StarredMessagesSheet
        open={starredOpen}
        onOpenChange={setStarredOpen}
        groupId={groupId}
        meId={ME}
        previewOf={previewOf}
        onJump={(message) => {
          setStarredOpen(false);
          afterMenu(() => {
            if (!jumpTo(message.id)) {
              toast({ title: t("chat.starred.not_loaded"), variant: "info" });
            }
          });
        }}
        onUnstar={(message) => {
          setStar(message, false);
        }}
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
