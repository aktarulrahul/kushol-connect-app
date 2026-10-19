// @mention picker (05 · owner 2026-10-19): the strip of matching group members that opens above
// the composer field while an "@query" is typed (WhatsApp). Tapping a row inserts "@Full Name"
// and records the member id; the rows come from `filterMentionCandidates` (never the viewer).
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useT } from "@/i18n/locale-provider";
import type { MentionMember } from "@/lib/chat/mentions";
import { motion } from "@/theme/tokens";

const stripIn = FadeInDown.duration(motion.duration.fast).reduceMotion(ReduceMotion.System);
const stripOut = FadeOutDown.duration(motion.duration.fast).reduceMotion(ReduceMotion.System);

export function MentionSuggestions({
  members,
  onPick,
}: {
  members: ReadonlyArray<MentionMember>;
  onPick: (member: MentionMember) => void;
}) {
  const t = useT();
  if (members.length === 0) return null;
  return (
    <Animated.View
      entering={stripIn}
      exiting={stripOut}
      accessibilityRole="list"
      accessibilityLabel={t("chat.mention.suggestions")}
      className="mb-2 max-h-48 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled>
        {members.map((member) => (
          <Pressable
            key={member.userId}
            accessibilityRole="button"
            accessibilityLabel={t("chat.mention.pick_a11y", { name: member.name })}
            onPress={() => {
              onPick(member);
            }}
            className="flex-row items-center gap-3 px-3 py-2 active:bg-muted"
          >
            <UserAvatar name={member.name} id={member.userId} size="sm" />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-medium text-foreground">
                {member.name}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
