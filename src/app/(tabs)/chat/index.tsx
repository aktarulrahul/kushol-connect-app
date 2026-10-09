// Chat home (COM-AP-001) in the Spartens chat-list language (owner 2026-10-09): search pill +
// bell header, filter chips (All · Unread · Official · Community · DMs), pinned chats first,
// "Draft: …" rows, long-press row menu (pin, notification settings), pull to refresh and a
// floating new-club button. Message requests live under Feeds.
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { Link, router } from "expo-router";
import { Archive, ChevronLeft, Inbox, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatListHeader, FilterChips } from "@/components/chat/chat-list-header";
import { ChatRowMenu, NotifySettingsSheet } from "@/components/chat/chat-row-menu";
import { OfflineBanner } from "@/components/chat/chrome";
import type { Anchor } from "@/components/chat/focus-overlay";
import { GroupRow } from "@/components/chat/group-row";
import { useNotificationBellAction } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/floating-tab-bar";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { chatFixtureFlags, type ChatGroup } from "@/fixtures/chat";
import type { CatalogKey } from "@/i18n";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { archivedDmCount, filterChatList, type ChatFilter } from "@/lib/chat/chat-list";
import { MAX_PINNED_CHATS, useChatState } from "@/lib/chat/chat-state";
import { useChatRealtime } from "@/lib/chat/realtime";
import { useChatGroups } from "@/lib/chat/use-chat";
import { color, layout, motion } from "@/theme/tokens";

const FILTERS: { value: ChatFilter; labelKey: CatalogKey }[] = [
  { value: "all", labelKey: "chat.segment.all" },
  { value: "unread", labelKey: "chat.segment.unread" },
  { value: "official", labelKey: "chat.segment.official" },
  { value: "custom", labelKey: "chat.segment.community" },
  { value: "dm", labelKey: "chat.segment.dms" },
];

const EMPTY_KEY: Record<ChatFilter, CatalogKey> = {
  all: "chat.list.empty_all",
  unread: "chat.list.empty_all",
  official: "chat.list.empty_official",
  custom: "chat.list.empty_clubs",
  dm: "chat.list.empty_dms",
};

function openChat(group: ChatGroup): void {
  if (group.kind === "dm") {
    router.push({ pathname: "/messages/[peerId]", params: { peerId: group.peer?.userId ?? "" } });
  } else {
    router.push({ pathname: "/groups/[id]", params: { id: group.id } });
  }
}

export default function ChatScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.me);
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<{ group: ChatGroup; anchor: Anchor } | null>(null);
  const [notifyFor, setNotifyFor] = useState<string | null>(null);
  const groups = useChatGroups();
  const presence = useChatState((s) => s.presence);
  const drafts = useChatState((s) => s.drafts);
  const pinnedChats = useChatState((s) => s.pinnedChats);
  const chatNotify = useChatState((s) => s.chatNotify);
  const togglePinChat = useChatState((s) => s.togglePinChat);
  const setChatNotify = useChatState((s) => s.setChatNotify);
  const bell = useNotificationBellAction();

  useChatRealtime();

  const all = groups.data;
  const visible = useMemo(
    () =>
      filterChatList(all ?? [], {
        filter,
        query,
        pinned: pinnedChats,
        archived: showArchived,
      }),
    [all, filter, query, pinnedChats, showArchived],
  );
  const archivedCount = useMemo(() => archivedDmCount(all ?? []), [all]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void groups.refetch().finally(() => {
      setRefreshing(false);
    });
  }, [groups]);

  const onTogglePin = (group: ChatGroup) => {
    const wasPinned = pinnedChats.includes(group.id);
    if (!togglePinChat(group.id)) {
      toast({
        title: t("chat.list.pin_limit", { count: MAX_PINNED_CHATS }),
        variant: "info",
      });
      return;
    }
    toast({
      title: wasPinned ? t("chat.list.unpinned") : t("chat.list.pinned"),
      variant: "success",
    });
  };

  if (user?.status === "PENDING") {
    return (
      <Screen header={<ScreenHeader title={t("chat.tab")} />}>
        <VerifiedGateInline />
      </Screen>
    );
  }

  const listHeader = (
    <View>
      <OfflineBanner visible={chatFixtureFlags.mode === "offline"} />
      {showArchived ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.back")}
          onPress={() => {
            setShowArchived(false);
          }}
          className="flex-row items-center gap-1 px-4 py-3"
        >
          <Icon as={ChevronLeft} size={18} className="text-primary" />
          <Text className="text-sm font-medium text-primary">{t("chat.archived.title")}</Text>
        </Pressable>
      ) : (
        <FilterChips
          options={FILTERS.map((f) => ({ value: f.value, label: t(f.labelKey) }))}
          value={filter}
          onChange={setFilter}
          accessibilityLabel={t("chat.tab")}
        />
      )}
      {filter === "dm" && !showArchived && archivedCount > 0 && !query.trim() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.archived.entry")}
          onPress={() => {
            setShowArchived(true);
          }}
          className="flex-row items-center gap-3 px-4 py-2.5 active:bg-muted"
        >
          <View className="size-12 items-center justify-center rounded-full bg-muted">
            <Icon as={Archive} size={22} className="text-muted-foreground" />
          </View>
          <Text className="flex-1 text-base font-medium text-foreground">
            {t("chat.archived.entry")}
          </Text>
          <Text className="text-xs text-muted-foreground">{archivedCount}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const empty = groups.isLoading ? (
    <View className="gap-1 px-4 pt-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3 py-2.5">
          <Skeleton className="size-12 rounded-full" />
          <View className="flex-1 gap-1.5">
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
      className="py-6"
      action={
        <Button variant="outline" onPress={() => void groups.refetch()}>
          <Text>{t("common.actions.retry")}</Text>
        </Button>
      }
    />
  ) : (
    <EmptyState
      title={
        query.trim()
          ? t("chat.list.no_search_results")
          : showArchived
            ? t("chat.archived.empty")
            : t(EMPTY_KEY[filter])
      }
      className="py-6"
      action={
        filter === "custom" && !query.trim() && !showArchived ? (
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
  );

  const menuGroup = menu?.group;
  const notifyLevel = notifyFor ? (chatNotify[notifyFor] ?? "all") : "all";

  return (
    <View className="flex-1 bg-background">
      <ChatListHeader query={query} onQueryChange={setQuery} actions={[bell]} />
      <FlatList
        data={visible}
        keyExtractor={(group) => group.id}
        renderItem={({ item }) => (
          <GroupRow
            group={item}
            online={item.kind === "dm" ? presence[item.peer?.userId ?? ""] : undefined}
            draft={drafts[item.id]}
            pinned={pinnedChats.includes(item.id)}
            muted={chatNotify[item.id] === "none"}
            onPress={openChat}
            onLongPress={(group, anchor) => {
              setMenu({ group, anchor });
            }}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + layout.tabBarClearance + 72 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.primary}
            colors={[color.primary]}
          />
        }
      />
      <View
        className="absolute right-4"
        style={{ bottom: Math.max(insets.bottom, 12) + layout.tabBarClearance }}
        pointerEvents="box-none"
      >
        <Fab
          icon={Plus}
          accessibilityLabel={t("chat.club.new_title")}
          onPress={() => {
            router.push("/(modals)/group-new");
          }}
        />
      </View>
      <ChatRowMenu
        anchor={menu?.anchor ?? null}
        pinned={menuGroup ? pinnedChats.includes(menuGroup.id) : false}
        muted={menuGroup ? chatNotify[menuGroup.id] === "none" : false}
        onClose={() => {
          setMenu(null);
        }}
        onTogglePin={() => {
          if (menuGroup) onTogglePin(menuGroup);
        }}
        onOpenNotify={() => {
          if (!menuGroup) return;
          // Let the menu's modal finish closing — iOS presents one modal at a time.
          setTimeout(() => {
            setNotifyFor(menuGroup.id);
          }, motion.duration.slow);
        }}
      />
      <NotifySettingsSheet
        open={notifyFor !== null}
        level={notifyLevel}
        onOpenChange={(open) => {
          if (!open) setNotifyFor(null);
        }}
        onSelect={(level) => {
          if (notifyFor) setChatNotify(notifyFor, level);
        }}
      />
    </View>
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
