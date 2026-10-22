// Explore tab (owner 2026-10-09): events + tuition listings in one place. The Shop tab stays
// hidden until campus commerce lands (module 11); /shop remains routed for deep links.
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  MapPin,
  Sparkles,
  Award,
  Flame,
} from "lucide-react-native";
import { Link } from "expo-router";

import { useNotificationBellAction } from "@/components/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { useTutorBrowse } from "@/lib/tuition/use-tuition";

export default function ExploreScreen() {
  const t = useT();
  const browse = useTutorBrowse({});
  const bell = useNotificationBellAction();

  return (
    <Screen
      // Dense tab root: override Screen's default gap-4 / py-4 / px-4 (same pattern as Feeds/Chat).
      className="gap-1 px-0 py-1"
      header={<ScreenHeader title={t("common.explore_tab")} action={bell} />}
    >
      <View className="gap-1 px-4 pb-8 pt-1">
        <Text className="pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("events.explore_section")}
        </Text>
        <View className="gap-3">
          {[
            {
              id: "camp-1",
              title: "জাতীয় গণিত অলিম্পিয়াড প্রস্তুতি ক্যাম্প ২০২৬",
              partner: "বিদ্যা প্রকাশন (অনুমোদিত পার্টনার)",
              date: "১৫ নভেম্বর ২০২৬",
              venue: "আইডিয়াল স্কুল অডিটোরিয়াম, মতিঝিল",
              volunteerXp: 100,
            },
            {
              id: "camp-2",
              title: "ঢাকা বিজ্ঞান উৎসব ও রোবোটিক্স মেলা ২০২৬",
              partner: "মেধাবী এডটেক (অনুমোদিত পার্টনার)",
              date: "৩০ নভেম্বর ২০২৬",
              venue: "ভিকারুননিসা নূন ক্যাম্পাস",
              volunteerXp: 150,
            },
          ].map((item) => (
            <Card key={item.id} className="rounded-2xl border border-border bg-card p-4 gap-2">
              <View className="flex-row items-center justify-between">
                <Badge className="bg-primary/10 text-primary">{t("events.explore_section")}</Badge>
                <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 border border-amber-200">
                  <Flame size={12} className="text-amber-500 fill-amber-500" />
                  <Text className="text-[10px] font-bold text-amber-700">
                    +{item.volunteerXp} XP
                  </Text>
                </View>
              </View>

              <Text className="font-bold text-foreground text-sm">{item.title}</Text>
              <Text className="text-xs text-muted-foreground">{item.partner}</Text>

              <View className="flex-row items-center justify-between pt-2 border-t border-border">
                <Text className="text-xs text-muted-foreground">{item.date}</Text>

                <Link href={"/volunteering" as any} asChild>
                  <Pressable className="rounded-xl bg-primary px-3 py-1.5 active:opacity-80">
                    <Text className="text-xs font-bold text-white">
                      {t("events.apply_volunteer_btn")}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </Card>
          ))}
        </View>

        <Text className="pb-0.5 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("tuition.explore_section")}
        </Text>
        <Link href="/marketplace/find" asChild>
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-primary-soft p-4"
          >
            <GraduationCap size={24} className="text-primary" />
            <View className="flex-1">
              <Text className="font-semibold text-foreground">{t("tuition.home.find_title")}</Text>
              <Text className="text-xs text-muted-foreground">{t("tuition.home.find_body")}</Text>
            </View>
            {browse.isLoading ? (
              <Skeleton className="h-6 w-10 rounded-full" />
            ) : (browse.data?.length ?? 0) > 0 ? (
              <Text className="font-semibold text-primary">{String(browse.data?.length ?? 0)}</Text>
            ) : null}
          </Pressable>
        </Link>
        <Link href="/marketplace/requirements/new" asChild>
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-background p-4"
          >
            <ClipboardList size={24} className="text-primary" />
            <Text className="flex-1 font-semibold text-foreground">
              {t("tuition.home.post_cta")}
            </Text>
          </Pressable>
        </Link>
        <Link href="/marketplace" asChild>
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-center rounded-2xl border border-border bg-background p-3"
          >
            <Text className="text-sm font-medium text-primary">{t("tuition.tab")}</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
