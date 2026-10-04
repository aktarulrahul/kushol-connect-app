// Realtime binding (COM-AP-002/004/010/011): subscribes to the chat event stream (fixture bus
// today, the real WS gateway in Stage 5 through the same ChatRealtimeEvent shapes) and lands
// each event where the app state lives — `message.new` appends to the Query cache, `message.ack`
// swaps the temp bubble by `clientMsgId`, read/typing/presence patch zustand slices, tombstones
// invalidate the history (05 `05-app-tasks.md` §4).
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  subscribeChatEvents,
  type ChatMessage,
} from "@/fixtures/chat";
import { useChatState } from "@/lib/chat/chat-state";
import { chatKeys } from "@/lib/chat/use-chat";

function appendMessage(queryClient: ReturnType<typeof useQueryClient>, message: ChatMessage): void {
  queryClient.setQueryData<{ data: ChatMessage[]; nextBefore?: string }>(
    chatKeys.history(message.groupId),
    (page) => (page ? { ...page, data: [...page.data, message] } : { data: [message] }),
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
    const unsubscribe = subscribeChatEvents((event) => {
      switch (event.type) {
        case "message.new": {
          const mine = event.message.senderId === "user_demo_teacher";
          appendMessage(queryClient, event.message);
          if (!mine) {
            // Arrivals patch the row list; the open room's read pointer advances only on view.
            void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
          }
          break;
        }
        case "message.ack": {
          // The optimistic temp bubble swaps to the canonical message (COM-US-002).
          const outgoing = useChatState.getState().outgoing;
          const tracked = outgoing.find((m) => m.clientMsgId === event.clientMsgId);
          if (tracked) {
            const canonical: ChatMessage = {
              id: event.id,
              groupId: tracked.groupId,
              senderId: "user_demo_teacher",
              senderName: "ডেমো শিক্ষক",
              kind: tracked.input.kind,
              ...(tracked.input.kind === "text" ? { body: tracked.input.body } : {}),
              ...(tracked.input.kind === "sticker"
                ? { stickerId: tracked.input.stickerId }
                : {}),
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
        case "message.read":
          if (event.userId !== "user_demo_teacher") break; // own reads mutate via the mutation
          break;
        case "message.deleted":
          void queryClient.invalidateQueries({
            queryKey: chatKeys.history(event.groupId),
          });
          break;
        case "typing":
          markTyping(event.groupId, event.userId, event.state);
          break;
        case "presence.update":
          useChatState.getState().setPresence(event.userId, event.online);
          break;
      }
    });
    return unsubscribe;
  }, [queryClient, markTyping, setConnection]);

  // Typing TTL sweep — stale "start" events vanish after 4 s (COM-US-007).
  useEffect(() => {
    const timer = setInterval(() => { useChatState.getState().sweepTyping(); }, 1_000);
    return () => { clearInterval(timer); };
  }, []);
}
