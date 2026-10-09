import { useQueryClient } from "@tanstack/react-query";
import { Redirect, Slot, usePathname, useRouter } from "expo-router";
import {
  Compass,
  MessageCircle,
  Newspaper,
  ShoppingBag,
  UserRound,
} from "lucide-react-native";
import { useEffect, useMemo, useRef } from "react";
import { AppState, View } from "react-native";
import { FadeIn, ReduceMotion } from "react-native-reanimated";

import { PendingScreen } from "@/components/auth/pending-screen";
import { FloatingTabBar } from "@/components/ui/floating-tab-bar";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useChatGroups, useMessageRequests } from "@/lib/chat/use-chat";

// Verified-only gate around all tabs (IDT-AP-008, 05 §2.4): PENDING renders the friendly pending
// screen instead of tab content; SUSPENDED clears the session; the gate polls status on a ≤ 30 s
// interval and on foreground so a mid-session verify opens the tabs without re-login (fade of
// gate → tabs, opacity only under reduced motion — 05 §5). Owner shell 2026-10-02: Feeds · Shop ·
// Chat · Notifications · You/Users (floating pill). Settings reachable from You only — no Chat
// avatar / gear FAB. Owner 2026-10-09: Shop hidden; Explore added; first tab relabelled Home.
// Owner 2026-10-09 (rev 2): final shell = Home · Explore · Chat · Store · Profile — notifications
// move OFF the bar into the Home header bell (Spartens-style, badge → /notifications).
const TABS = [
  { key: "feeds", labelKey: "common.home_tab", icon: Newspaper, href: "/feeds" },
  { key: "explore", labelKey: "common.explore_tab", icon: Compass, href: "/explore" },
  { key: "chat", labelKey: "chat.tab", icon: MessageCircle, href: "/chat" },
  { key: "store", labelKey: "common.store_tab", icon: ShoppingBag, href: "/shop" },
  { key: "you", labelKey: "settings.you_tab", icon: UserRound, href: "/you" },
] as const;

function GateSkeleton() {
  return (
    <Screen className="justify-center gap-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </Screen>
  );
}

function useTabBadges(): { chat: number; feeds: number } {
  const groups = useChatGroups();
  const requests = useMessageRequests();
  return useMemo(() => {
    const chat =
      groups.data
        ?.filter((g) => g.status !== "archived")
        .reduce((sum, g) => sum + (g.unreadCount || 0), 0) ?? 0;
    const feeds =
      requests.data?.received.filter((r) => r.status === "pending").length ?? 0;
    return { chat, feeds };
  }, [groups.data, requests.data]);
}

export default function TabsLayout() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.me);
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const signOut = useAuthStore((s) => s.signOut);
  const suspendedHandled = useRef(false);
  const badges = useTabBadges();

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshMe();
    }, 30_000);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshMe();
    });
    return () => {
      clearInterval(timer);
      foreground.remove();
    };
  }, [refreshMe]);

  useEffect(() => {
    if (me?.status === "SUSPENDED" && !suspendedHandled.current) {
      suspendedHandled.current = true;
      void signOut().then(() => {
        queryClient.clear();
        router.replace("/login");
      });
    }
    if (me?.status !== "SUSPENDED") suspendedHandled.current = false;
  }, [me?.status, signOut, queryClient, router]);

  // Signed-out visitors never see the tabs skeleton — straight to /login (owner gate, 2026-10-01).
  // Checking, or authed with no profile yet (offline restore), keeps the skeleton so /login
  // does not flash before the session is known.
  if (status === "anon") return <Redirect href="/login" />;
  if (status !== "authed" || !me) return <GateSkeleton />;
  if (me.status === "PENDING") return <PendingScreen />;
  // Sessions and refresh families are revoked server-side (IDT-US-010); the local session is
  // cleared and the bilingual suspension message is shown before the redirect to login.
  if (me.status === "SUSPENDED") {
    return (
      <Screen className="justify-center gap-4">
        <Text variant="lead" className="text-center">
          {t("auth.suspended")}
        </Text>
      </Screen>
    );
  }

  // The notice board (+ detail pages) lives off the bar now — no tab lights up for /notices*.
  const active = pathname.startsWith("/notices")
    ? ""
    : (TABS.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.key ??
      "chat");

  return (
    <View className="flex-1 bg-background">
      <NativeOnlyAnimatedView
        entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
        className="flex-1"
      >
        <Slot />
      </NativeOnlyAnimatedView>
      <FloatingTabBar
        accessibilityLabel={t("common.nav.main")}
        tabs={TABS.map((tab) => ({
          key: tab.key,
          label: t(tab.labelKey),
          icon: tab.icon,
          badge:
            tab.key === "chat"
              ? badges.chat
              : tab.key === "feeds"
                ? badges.feeds
                : undefined,
          avatar: tab.key === "you" ? { name: me.fullName } : undefined,
        }))}
        active={active}
        onChange={(key) => {
          const tab = TABS.find((candidate) => candidate.key === key);
          if (tab) router.push(tab.href);
        }}
      />
    </View>
  );
}
