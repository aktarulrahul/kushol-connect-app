import { useLocalSearchParams } from "expo-router";

import { chatAvatarKind } from "@/components/chat/chat-avatar";
import { GroupChatScreen } from "@/components/chat/group-chat-screen";
import { useChatGroups } from "@/lib/chat/use-chat";

// Group chat route (COM-AP-003): /groups/[id] — official & custom groups. Title/members come
// from the cached group row; the chat surface is the shared GroupChatScreen (05 §2.2).
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groups = useChatGroups();
  const group = groups.data?.find((g) => g.id === id);

  return (
    <GroupChatScreen
      groupId={id}
      title={group?.name ?? id}
      memberCount={group?.memberCount}
      avatarKind={group ? chatAvatarKind(group.kind) : "group"}
    />
  );
}
