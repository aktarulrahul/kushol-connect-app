// Notifications tab (COM-AP-014, owner 2026-10-02): official school/college announces.
// Pinned first, scope badges, attachment chip; campaigns (module 13) render as a separate block.
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Pin, Plus, ScrollText } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import { OfflineBanner } from "@/components/chat/chrome";
import { chatFixtureFlags } from "@/fixtures/chat";
import { listNotices, type Notice } from "@/fixtures/notices";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";

export default function NotificationsScreen() {
  const t = useT();
  const router = useRouter();
  const notices = useQuery({ queryKey: ["notices", "board"], queryFn: () => listNotices() });

  return (
    <Screen
      // Dense list: override Screen's default gap-4 / py-4 / px-4 (same pattern as Chat/Feeds).
      className="gap-1 px-0 py-1"
      header={
        <ScreenHeader
          title={t("notices.tab")}
          action={{
            icon: Plus,
            accessibilityLabel: t("notices.compose.title"),
            onPress: () => {
              router.push("/(modals)/notice-new");
            },
          }}
        />
      }
    >
      <OfflineBanner visible={chatFixtureFlags.mode === "offline"} />
      {notices.isLoading ? (
        <View className="gap-1.5 px-3 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </View>
      ) : (notices.data?.length ?? 0) === 0 ? (
        <EmptyState icon={ScrollText} title={t("notices.empty")} className="py-4" />
      ) : (
        <ScrollView contentContainerClassName="gap-1.5 px-3 pb-8 pt-1">
          {notices.data?.map((notice) => (
            <NoticeRow
              key={notice.id}
              notice={notice}
              onPress={() => {
                router.push({ pathname: "/notices/[id]", params: { id: notice.id } });
              }}
            />
          ))}
          <Text className="pt-2 text-center text-xs text-muted-foreground">
            ── {t("notices.campaigns_section")} ──
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

export function NoticeRow({ notice, onPress }: { notice: Notice; onPress: () => void }) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={notice.title}
      onPress={onPress}
      className="rounded-2xl border border-border bg-background p-2.5 active:opacity-80"
    >
      <View className="flex-row items-center gap-2">
        {notice.pinned ? <Pin size={12} className="text-primary" /> : null}
        <Text numberOfLines={1} className="flex-1 font-semibold text-foreground">
          {notice.title}
        </Text>
        <Badge variant="outline">
          {notice.scope === "school" ? t("notices.scope.school") : t("notices.scope.section")}
        </Badge>
      </View>
      <View className="mt-0.5 flex-row items-center gap-2">
        <Text numberOfLines={1} className="flex-1 text-xs text-muted-foreground">
          {notice.author.name} ·{" "}
          {notice.author.role === "teacher" ? t("notices.role.teacher") : t("notices.role.school_admin")}
        </Text>
        {notice.attachment ? (
          <Text className="text-xs font-medium text-primary">
            [{notice.attachment.kind.toUpperCase()} {t("notices.attachment")}]
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
