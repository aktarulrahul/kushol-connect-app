// Realtime binding (COM-AP-002/004/010/011): subscribes to the chat event stream (fixture bus
// today, the real WS gateway in Stage 5 through the same ChatRealtimeEvent shapes) and lands
// each event where the app state lives — `message.new` appends to the Query cache, `message.ack`
// swaps the temp bubble by `clientMsgId`, `receipts.updated` raises the cached page's tick
// horizons, typing/presence patch zustand slices, tombstones invalidate the history (05
// `05-app-tasks.md` §4).
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { chatMeNow } from "@/lib/chat/chat-identity";
import {
  ackDelivered,
  chatLiveModeSync,
  onChatReconnected,
  setChatConnectionSink,
} from "@/lib/chat/live-chat";
import { subscribeChatEvents, type ChatMessage } from "@/fixtures/chat";
import { useChatState } from "@/lib/chat/chat-state";
import { raiseHorizons } from "@/lib/chat/receipts";
// Frames merge with the per-viewer rules: mentions absent ⇒ none, `starred` kept (2026-10-19).
import { mergeRealtimeMessage } from "@/lib/chat/starred";
import { chatKeys, type HistoryPage } from "@/lib/chat/use-chat";

function appendMessage(queryClient: ReturnType<typeof useQueryClient>, message: ChatMessage): void {
  // A send lands twice — `message.ack` (canonical id) then `message.new` (full row, with the
  // reply preview): merge by id so the bubble never doubles.
  queryClient.setQueryData<{ data: ChatMessage[]; nextBefore?: string }>(
    chatKeys.history(message.groupId),
    (page) => {
      if (!page) return { data: [message] };
      const exists = page.data.some((m) => m.id === message.id);
      return {
        ...page,
        data: exists
          ? page.data.map((m) => (m.id === message.id ? mergeRealtimeMessage(m, message) : m))
          : [...page.data, message],
      };
    },
  );
  void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
}

/**
 * Mount once per chat surface (the tabs layout): binds the event stream to caches/stores and
 * runs the typing sweep + heartbeat that keep presence honest.
 */
export function useChatRealtime(): void {
  const queryClient = useQueryClient();
  const markTyping = useChatState((s) => s.markTyping);
  const setConnection = useChatState((s) => s.setConnection);

  useEffect(() => {
    setConnection("online"); // fixture bus is always connected; the WS client flips this
    setChatConnectionSink(setConnection); // live socket state lands in the same store slice
    // Reconnect catch-up (COM-INT-010): after a live socket re-dials, refetch every cached room
    // from the server cursor (the WS replay heals the rest). Fixture sessions never fire this.
    const offReconnect = onChatReconnected(() => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
      void queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
    });
    const unsubscribe = subscribeChatEvents((event) => {
      switch (event.type) {
        case "message.new": {
          const mine = event.message.senderId === chatMeNow().userId;
          appendMessage(queryClient, event.message);
          if (!mine) {
            // Arrivals patch the row list; the open room's read pointer advances only on view.
            void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
            // …but the message reached this device: its sender gets grey double ticks.
            if (chatLiveModeSync()) ackDelivered(event.message.groupId, event.message.id);
          }
          break;
        }
        case "message.ack": {
          // The optimistic temp bubble swaps to the canonical message (COM-US-002).
          const outgoing = useChatState.getState().outgoing;
          const tracked = outgoing.find((m) => m.clientMsgId === event.clientMsgId);
          if (tracked) {
            const me = chatMeNow();
            const canonical: ChatMessage = {
              id: event.id,
              groupId: tracked.groupId,
              senderId: me.userId,
              senderName: me.name,
              kind: tracked.input.kind,
              ...(tracked.input.kind === "text" ? { body: tracked.input.body } : {}),
              ...(tracked.input.kind === "sticker" ? { stickerId: tracked.input.stickerId } : {}),
              ...(tracked.input.mentions?.length ? { mentions: tracked.input.mentions } : {}),
              clientMsgId: event.clientMsgId,
              ...(tracked.input.replyTo
                ? { replyTo: tracked.input.replyTo, replyPreview: undefined }
                : {}),
              createdAt: event.createdAt,
            };
            const page = queryClient.getQueryData<{ data: ChatMessage[]; nextBefore?: string }>(
              chatKeys.history(tracked.groupId),
            );
            if (page && !page.data.some((m) => m.id === canonical.id)) {
              appendMessage(queryClient, canonical);
            }
          }
          break;
        }
        case "receipts.updated":
          // The ticks on my messages moved (sent to me only, with my horizons): no refetch.
          queryClient.setQueryData<HistoryPage>(chatKeys.history(event.groupId), (page) =>
            page ? raiseHorizons(page, event.readUpTo, event.deliveredUpTo) : page,
          );
          break;
        case "message.deleted":
          void queryClient.invalidateQueries({
            queryKey: chatKeys.history(event.groupId),
          });
          // A tombstone takes every member's star with it.
          void queryClient.invalidateQueries({ queryKey: chatKeys.starred(event.groupId) });
          break;
        case "typing":
          markTyping(event.groupId, event.userId, event.state);
          break;
        case "presence.update":
          useChatState.getState().setPresence(event.userId, event.online);
          break;
        case "group.updated":
          // Added/removed, renamed, new DM: the list (and that room's history) refetch.
          void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
          void queryClient.invalidateQueries({ queryKey: chatKeys.history(event.groupId) });
          // …and the @mention roster (members joined/left).
          void queryClient.invalidateQueries({ queryKey: chatKeys.members(event.groupId) });
          break;
      }
    });
    return () => {
      offReconnect();
      unsubscribe();
    };
  }, [queryClient, markTyping, setConnection]);

  // Typing TTL sweep — stale "start" events vanish after 4 s (COM-US-007).
  useEffect(() => {
    const timer = setInterval(() => {
      useChatState.getState().sweepTyping();
    }, 1_000);
    return () => {
      clearInterval(timer);
    };
  }, []);
}
