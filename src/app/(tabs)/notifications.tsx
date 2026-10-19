// Notifications tab (COM-AP-014, owner 2026-10-02): official school/college announces.
// Pinned first, scope badges, attachment chip; campaigns (module 13) render as a separate block.
// 2026-10-19 (owner): an "Activity" segment adds the in-app inbox (NTF-BE-006) beside the
// notice board — unread dots, tap to mark read.
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Pin, Plus, ScrollText } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { OfflineBanner } from "@/components/chat/chrome";
import { chatFixtureFlags } from "@/fixtures/chat";
import { listNotices, type Notice } from "@/fixtures/notices";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useLocale, useT } from "@/i18n/locale-provider";
import { markInboxReadNotification } from "@/lib/notifications/use-notifications";
import { listInbox, type InboxNotification } from "@/lib/notifications/backend";
import { cn } from "@/lib/utils";

type Segment = "notices" | "activity";

export default function NotificationsScreen() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>("notices");
  const notices = useQuery({ queryKey: ["notices", "board"], queryFn: () => listNotices() });
  const inbox = useQuery({ queryKey: ["notifications", "inbox"], queryFn: () => listInbox(20) });

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
      <View className="flex-row gap-1.5 px-3 pb-1">
        {(["notices", "activity"] as const).map((entry) => (
          <Pressable
            key={entry}
            accessibilityRole="tab"
            aria-selected={segment === entry}
            onPress={() => {
              setSegment(entry);
            }}
            className={cn(
              "flex-1 items-center rounded-full py-1.5",
              segment === entry ? "bg-primary" : "bg-muted",
            )}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                segment === entry ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {entry === "notices" ? t("notices.tab") : t("notifications.activity")}
            </Text>
          </Pressable>
        ))}
      </View>
      {segment === "notices" ? (
        <NoticesList notices={notices} onOpen={(noticeId) => {
          router.push({ pathname: "/notices/[id]", params: { id: noticeId } });
        }} />
      ) : (
        <ActivityList
          inbox={inbox}
          locale={locale}
          emptyTitle={t("notifications.activity_empty")}
          onOpen={(id) => {
            markInboxReadNotification(id);
          }}
        />
      )}
    </Screen>
  );
}

function NoticesList({
  notices,
  onOpen,
}: {
  notices: { isLoading: boolean; data?: Notice[] | undefined };
  onOpen: (noticeId: string) => void;
}) {
  const t = useT();
  if (notices.isLoading) {
    return (
      <View className="gap-1.5 px-3 pt-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </View>
    );
  }
  if ((notices.data?.length ?? 0) === 0) {
    return <EmptyState icon={ScrollText} title={t("notices.empty")} className="py-4" />;
  }
  return (
    <ScrollView contentContainerClassName="gap-1.5 px-3 pb-8 pt-1">
      {notices.data?.map((notice) => (
        <NoticeRow
          key={notice.id}
          notice={notice}
          onPress={() => {
            onOpen(notice.id);
          }}
        />
      ))}
      <Text className="pt-2 text-center text-xs text-muted-foreground">
        ── {t("notices.campaigns_section")} ──
      </Text>
    </ScrollView>
  );
}

function ActivityList({
  inbox,
  locale,
  emptyTitle,
  onOpen,
}: {
  inbox: {
    isLoading: boolean;
    data?: { data: InboxNotification[]; unreadCount: number } | undefined;
  };
  locale: "bn" | "en";
  emptyTitle: string;
  onOpen: (notificationId: string) => void;
}) {
  if (inbox.isLoading) {
    return (
      <View className="gap-1.5 px-3 pt-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </View>
    );
  }
  if ((inbox.data?.data.length ?? 0) === 0) {
    return <EmptyState icon={ScrollText} title={emptyTitle} className="py-4" />;
  }
  return (
    <ScrollView contentContainerClassName="gap-1.5 px-3 pb-8 pt-1">
      {inbox.data?.data.map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          accessibilityLabel={locale === "en" ? row.titleEn : row.titleBn}
          onPress={() => {
            onOpen(row.id);
          }}
          className={cn(
            "rounded-2xl border border-border bg-background p-2.5 active:opacity-80",
            !row.readAt && "border-primary/40",
          )}
        >
          <View className="flex-row items-center gap-2">
            {!row.readAt ? <View className="size-1.5 rounded-full bg-primary" /> : null}
            <Text numberOfLines={1} className="flex-1 font-semibold text-foreground">
              {locale === "en" ? row.titleEn : row.titleBn}
            </Text>
            <Text variant="muted" className="text-xs">
              {new Date(row.createdAt).toLocaleDateString("bn-BD")}
            </Text>
          </View>
          <Text numberOfLines={2} variant="muted" className="mt-0.5 text-xs">
            {locale === "en" ? row.bodyEn : row.bodyBn}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
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
