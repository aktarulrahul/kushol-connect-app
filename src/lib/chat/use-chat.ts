// Chat query hooks (COM-AP-001/003): TanStack Query reads over the Stage-2 seam + optimistic
// send/read/delete mutations. `message.new`/`message.ack` events land through realtime.ts; this
// module owns everything request-shaped.
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  type ChatFixtureError,
  type ChatMessageSendInput,
  acceptMessageRequest,
  createChatGroup,
  createMessageRequest,
  declineMessageRequest,
  deleteChatMessage,
  editChatMessage,
  listChatGroupMembers,
  listChatGroups,
  listChatMessages,
  listMessageRequests,
  listStarredChatMessages,
  markChatRead,
  openDm,
  sendChatMessage,
  setChatMessagePinned,
  starChatMessage,
  unstarChatMessage,
  type ChatMessage,
  type StarredPage,
} from "@/fixtures/chat";
import { useChatState, type OutgoingMessage } from "@/lib/chat/chat-state";
import { dropStarredEntry, setStarredInPage } from "@/lib/chat/starred";
import { uuidv4 } from "@/lib/chat/uuid";

export const chatKeys = {
  groups: ["chat", "groups"] as const,
  history: (groupId: string) => ["chat", "messages", groupId] as const,
  requests: ["chat", "requests"] as const,
  dm: (peerId: string) => ["chat", "dm", peerId] as const,
  starred: (groupId: string) => ["chat", "starred", groupId] as const,
  members: (groupId: string) => ["chat", "members", groupId] as const,
};

export function useChatGroups() {
  return useQuery({
    queryKey: chatKeys.groups,
    queryFn: listChatGroups,
    staleTime: 15_000,
  });
}

export type HistoryPage = {
  data: ChatMessage[];
  nextBefore?: string;
  readUpTo?: string;
  deliveredUpTo?: string;
};

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
    mutationFn: async (
      input: Omit<ChatMessageSendInput, "groupId" | "clientMsgId">,
    ): Promise<{ clientMsgId: string; queued: boolean }> => {
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

/**
 * Edit of an own text message. `mentions` (owner 2026-10-19): omit to keep the stored @mentions,
 * pass a list to replace them (`[]` clears).
 */
export function useEditMessage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      body,
      mentions,
    }: {
      messageId: string;
      body: string;
      mentions?: string[] | undefined;
    }) => editChatMessage(messageId, body, mentions),
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

type StarredData = InfiniteData<StarredPage>;

/**
 * Star / unstar one message (private bookmark, owner 2026-10-19). `starred` is the state to set.
 * The history bubble and the starred list update optimistically (rolled back on failure); the
 * starred list refetches afterwards. Stars fan out nothing, so no event will refresh them.
 */
export function useStarMessage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, starred }: { messageId: string; starred: boolean }) =>
      starred ? starChatMessage(messageId) : unstarChatMessage(messageId),
    onMutate: async ({ messageId, starred }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.history(groupId) });
      const history = queryClient.getQueryData<HistoryPage>(chatKeys.history(groupId));
      const list = queryClient.getQueryData<StarredData>(chatKeys.starred(groupId));
      queryClient.setQueryData<HistoryPage>(chatKeys.history(groupId), (page) =>
        setStarredInPage(page, messageId, starred),
      );
      if (!starred) {
        queryClient.setQueryData<StarredData>(chatKeys.starred(groupId), (data) =>
          dropStarredEntry(data, messageId),
        );
      }
      return { history, list };
    },
    onError: (_error, _vars, context) => {
      if (context?.history) queryClient.setQueryData(chatKeys.history(groupId), context.history);
      if (context?.list) queryClient.setQueryData(chatKeys.starred(groupId), context.list);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.starred(groupId) });
    },
  });
}

/**
 * The viewer's starred messages in one chat (the chat-info "Starred messages" sheet): newest
 * star first, older pages through `nextBefore`.
 */
export function useStarredMessages(groupId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: chatKeys.starred(groupId),
    queryFn: ({ pageParam }) =>
      listStarredChatMessages(pageParam ? { groupId, before: pageParam } : { groupId }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: StarredPage) => last.nextBefore,
    enabled,
  });
}

/** The room roster — the @mention picker and name resolution (owner 2026-10-19). */
export function useChatGroupMembers(groupId: string, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.members(groupId),
    queryFn: () => listChatGroupMembers(groupId),
    enabled,
    staleTime: 60_000,
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
