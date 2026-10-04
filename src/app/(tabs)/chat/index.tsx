// Chat home (COM-AP-001): dense WhatsApp list + header-inline All/Official/Community/DMs filter,
// always-visible search under header, unread teal badges. Message requests live under Feeds.
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Link, router } from "expo-router";
import { Archive, Inbox, Plus } from "lucide-react-native";

import { GroupRow } from "@/components/chat/group-row";
import { OfflineBanner } from "@/components/chat/chrome";
import { chatFixtureFlags, type ChatGroup } from "@/fixtures/chat";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useChatRealtime } from "@/lib/chat/realtime";
import { useChatState } from "@/lib/chat/chat-state";
import { useChatGroups } from "@/lib/chat/use-chat";
import { useT } from "@/i18n/locale-provider";

const SEGMENTS = [
  { value: "all", labelKey: "chat.segment.all" },
  { value: "official", labelKey: "chat.segment.official" },
  { value: "custom", labelKey: "chat.segment.community" },
  { value: "dm", labelKey: "chat.segment.dms" },
] as const;
type SegmentValue = (typeof SEGMENTS)[number]["value"];

function groupTitle(group: ChatGroup): string {
  return group.kind === "dm" ? (group.peer?.name ?? "") : (group.name ?? "");
}

export default function ChatScreen() {
  const t = useT();
  const user = useAuthStore((s) => s.me);
  const [segment, setSegment] = useState<SegmentValue>("all");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const groups = useChatGroups();
  const presence = useChatState((s) => s.presence);

  useChatRealtime();

  const filtered = useMemo(() => {
    const list = groups.data ?? [];
    const q = query.trim().toLowerCase();

    let bySeg: ChatGroup[];
    if (showArchived && segment === "dm") {
      bySeg = list.filter((g) => g.kind === "dm" && g.status === "archived");
    } else if (segment === "all") {
      bySeg = list.filter((g) => g.status !== "archived");
    } else if (segment === "dm") {
      bySeg = list.filter((g) => g.kind === "dm" && g.status !== "archived");
    } else {
      bySeg = list.filter((g) => g.kind === segment && g.status !== "archived");
    }

    const searched = q
      ? bySeg.filter((g) => {
          const title = groupTitle(g).toLowerCase();
          const preview = (g.lastMessagePreview ?? "").toLowerCase();
          return title.includes(q) || preview.includes(q);
        })
      : bySeg;

    return [...searched].sort((a, b) => {
      const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return bt - at;
    });
  }, [groups.data, segment, showArchived, query]);

  const archivedCount = useMemo(
    () => (groups.data ?? []).filter((g) => g.kind === "dm" && g.status === "archived").length,
    [groups.data],
  );

  const onSegmentChange = (next: SegmentValue) => {
    setSegment(next);
    if (next !== "dm") setShowArchived(false);
  };

  if (user?.status === "PENDING") {
    return (
      <Screen header={<ScreenHeader title={t("chat.tab")} />}>
        <VerifiedGateInline />
      </Screen>
    );
  }

  return (
    <Screen
      // Dense WhatsApp list: override Screen's default gap-4 / py-4 / px-4.
      className="gap-1 px-0 py-1"
      header={
        <ScreenHeader
          title={showArchived ? t("chat.archived.title") : t("chat.tab")}
          middle={
            showArchived ? undefined : (
              <SegmentedPill
                size="compact"
                className="max-w-full self-center"
                segments={SEGMENTS.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
                value={segment}
                onChange={onSegmentChange}
                accessibilityLabel={t("chat.tab")}
              />
            )
          }
          action={{
            icon: Plus,
            accessibilityLabel: t("chat.club.new_title"),
            onPress: () => {
              router.push("/(modals)/group-new");
            },
          }}
        />
      }
    >
      <View className="px-3 pb-1.5 pt-0.5">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t("chat.search.placeholder")}
          accessibilityLabel={t("common.actions.search")}
          returnKeyType="search"
          className="min-h-10 rounded-full px-4 py-2 text-sm"
        />
      </View>

      <OfflineBanner visible={chatFixtureFlags.mode === "offline"} />

      {segment === "dm" && !showArchived && archivedCount > 0 && !query.trim() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.archived.entry")}
          onPress={() => {
            setShowArchived(true);
          }}
          className="mx-3 mb-0.5 flex-row items-center gap-3 rounded-xl px-2 py-2.5 active:bg-muted"
        >
          <View className="size-12 items-center justify-center rounded-full bg-muted">
            <Icon as={Archive} size={22} className="text-muted-foreground" />
          </View>
          <Text className="flex-1 text-[15px] font-medium text-foreground">
            {t("chat.archived.entry")}
          </Text>
          <Text className="text-xs text-muted-foreground">{archivedCount}</Text>
        </Pressable>
      ) : null}

      {showArchived ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.back")}
          onPress={() => {
            setShowArchived(false);
          }}
          className="mx-3 mb-1"
        >
          <Text className="text-sm font-medium text-primary">{`← ${t("common.actions.back")}`}</Text>
        </Pressable>
      ) : null}

      {groups.isLoading ? (
        <View className="gap-1 px-3 pt-0.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} className="flex-row items-center gap-2.5 py-1.5">
              <Skeleton className="size-12 rounded-full" />
              <View className="flex-1 gap-1">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </View>
            </View>
          ))}
        </View>
      ) : groups.isError ? (
        <EmptyState
          icon={Inbox}
          title={t("chat.state.error")}
          description={t("common.state.error_body")}
          className="py-4"
          action={
            <Button variant="outline" onPress={() => void groups.refetch()}>
              <Text>{t("common.actions.retry")}</Text>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            query.trim()
              ? t("chat.list.no_search_results")
              : showArchived
                ? t("chat.archived.empty")
                : segment === "official"
                  ? t("chat.list.empty_official")
                  : segment === "custom"
                    ? t("chat.list.empty_clubs")
                    : segment === "dm"
                      ? t("chat.list.empty_dms")
                      : t("chat.list.empty_all")
          }
          className="py-4"
          action={
            segment === "custom" && !query.trim() && !showArchived ? (
              <Button
                onPress={() => {
                  router.push("/(modals)/group-new");
                }}
              >
                <Text>{t("chat.club.new_title")}</Text>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <View className="flex-1">
          {filtered.map((group: ChatGroup) => (
            <GroupRow
              key={group.id}
              group={group}
              online={group.kind === "dm" ? presence[group.peer?.userId ?? ""] : undefined}
              onPress={(g) => {
                if (g.kind === "dm") {
                  router.push({
                    pathname: "/messages/[peerId]",
                    params: { peerId: g.peer?.userId ?? "" },
                  });
                } else {
                  router.push({ pathname: "/groups/[id]", params: { id: g.id } });
                }
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

export function VerifiedGateInline() {
  const t = useT();
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <Text variant="h4" className="text-center">
        {t("chat.gate.title")}
      </Text>
      <Text variant="muted" className="text-center">
        {t("chat.gate.body")}
      </Text>
      <Link href="/verification-pending" asChild>
        <Button variant="outline" size="sm">
          <Text>{t("verification.pending.title")}</Text>
        </Button>
      </Link>
    </View>
  );
}
