// Chat query hooks (COM-AP-001/003): TanStack Query reads over the Stage-2 seam + optimistic
// send/read/delete mutations. `message.new`/`message.ack` events land through realtime.ts; this
// module owns everything request-shaped.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type ChatFixtureError,
  type ChatMessageSendInput,
  acceptMessageRequest,
  createChatGroup,
  createMessageRequest,
  declineMessageRequest,
  deleteChatMessage,
  editChatMessage,
  listChatGroups,
  listChatMessages,
  listMessageRequests,
  markChatRead,
  openDm,
  sendChatMessage,
  setChatMessagePinned,
  type ChatMessage,
} from "@/fixtures/chat";
import { useChatState, type OutgoingMessage } from "@/lib/chat/chat-state";
import { uuidv4 } from "@/lib/chat/uuid";

export const chatKeys = {
  groups: ["chat", "groups"] as const,
  history: (groupId: string) => ["chat", "messages", groupId] as const,
  requests: ["chat", "requests"] as const,
  dm: (peerId: string) => ["chat", "dm", peerId] as const,
};

export function useChatGroups() {
  return useQuery({
    queryKey: chatKeys.groups,
    queryFn: listChatGroups,
    staleTime: 15_000,
  });
}

export type HistoryPage = { data: ChatMessage[]; nextBefore?: string };

export function useChatHistory(groupId: string) {
  return useQuery({
    queryKey: chatKeys.history(groupId),
    queryFn: () => listChatMessages(groupId),
  });
}

/** Older-page fetch for infinite scroll — appends to the cached page set (COM-US-001). */
export async function fetchOlderMessages(groupId: string, before: string): Promise<HistoryPage> {
  return listChatMessages(groupId, before);
}

export function useMessageRequests() {
  return useQuery({ queryKey: chatKeys.requests, queryFn: listMessageRequests });
}

export function useOpenDm(peerId: string) {
  return useQuery({
    queryKey: chatKeys.dm(peerId),
    queryFn: () => openDm(peerId),
    retry: false,
  });
}

export function useSendMessage(groupId: string) {
  const queryClient = useQueryClient();
  const { trackSend, setSendState, dropSend, connection } = useChatState();

  return useMutation({
    mutationFn: async (input: {
      kind: ChatMessageSendInput["kind"];
      body?: string;
      mediaAssetId?: string;
      stickerId?: string;
      replyTo?: string;
    }): Promise<{ clientMsgId: string; queued: boolean }> => {
      const clientMsgId = uuidv4();
      const outgoing: OutgoingMessage = {
        clientMsgId,
        groupId,
        input,
        state: connection === "offline" ? "queued" : "sending",
      };
      trackSend(outgoing);
      if (connection === "offline") {
        useChatState.getState().enqueue(outgoing);
        return { clientMsgId, queued: true };
      }
      try {
        await sendChatMessage({ ...input, groupId, clientMsgId });
        return { clientMsgId, queued: false };
      } catch (error) {
        const code = (error as ChatFixtureError).code;
        if (code === "OFFLINE") {
          useChatState.getState().enqueue({ ...outgoing, state: "queued" });
          return { clientMsgId, queued: true };
        }
        throw error;
      }
    },
    onMutate: async () => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.groups });
    },
    onSuccess: (result) => {
      setSendState(result.clientMsgId, "sent");
      if (!result.queued) dropLater(result.clientMsgId, setSendState, dropSend);
    },
    onError: () => {
      // The newest tracked send for this group failed — mark it so the bubble turns red.
      const outgoing = useChatState.getState().outgoing;
      const last = outgoing[outgoing.length - 1];
      if (last) setSendState(last.clientMsgId, "failed");
    },
  });
}

/** A settled bubble is owned by the history list — drop the optimistic entry shortly after. */
function dropLater(
  clientMsgId: string,
  setSendState: (id: string, state: OutgoingMessage["state"]) => void,
  dropSend: (id: string) => void,
): void {
  setTimeout(() => {
    setSendState(clientMsgId, "seen"); // fixture: demo peers read promptly
    setTimeout(() => {
      dropSend(clientMsgId);
    }, 400);
  }, 1_200);
}

export function useMarkRead(groupId: string) {
  return useMutation({
    mutationFn: (lastReadMessageId: string) => {
      useChatState.getState().trackRead(groupId, lastReadMessageId);
      return markChatRead(groupId, lastReadMessageId);
    },
    retry: 2, // offline reads replay like a send (US-006)
  });
}

export function useDeleteMessage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteChatMessage(messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.history(groupId) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
    },
  });
}

/** Fixture-only edit of an own text message (Spartens parity — 08-gaps G-7). */
export function useEditMessage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      editChatMessage(messageId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.history(groupId) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
    },
  });
}

/** Fixture-only pin/unpin for room moderators (Spartens parity — 08-gaps G-7). */
export function usePinMessage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, pinned }: { messageId: string; pinned: boolean }) =>
      setChatMessagePinned(messageId, pinned),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.history(groupId) });
    },
  });
}

export function useAcceptRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptMessageRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.requests });
      void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
    },
  });
}

export function useDeclineRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineMessageRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.requests });
    },
  });
}

export function useCreateMessageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMessageRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.requests });
    },
  });
}

export function useCreateClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChatGroup,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
    },
  });
}
