import { useLocalSearchParams } from "expo-router";

import { GroupChatScreen } from "@/components/chat/group-chat-screen";
import { useChatGroups } from "@/lib/chat/use-chat";

// DM route (COM-AP-012): /messages/[peerId] — same surface as the group screen, bound to the
// peer's dm room. A room that does not exist yet still opens the composer (the fixture creates
// it on first send); the request flow owns cross-school peers (BR-004).
export default function DmScreen() {
  const { peerId } = useLocalSearchParams<{ peerId: string }>();
  const groups = useChatGroups();
  const room = groups.data?.find((g) => g.kind === "dm" && g.peer?.userId === peerId);

  return (
    <GroupChatScreen
      groupId={room?.id ?? `grp_dm_${peerId}`}
      title={room?.peer?.name ?? peerId}
      avatarKind="dm"
      peerId={peerId}
    />
  );
}
