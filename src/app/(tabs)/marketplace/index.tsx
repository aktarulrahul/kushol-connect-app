// Marketplace home (TUT-AP-001): find-a-tutor card, poster/tutor entries, NOT_VERIFIED gate.
import { Pressable, View } from "react-native";
import { GraduationCap, ClipboardList, UserRoundCheck, Briefcase, Store, Package } from "lucide-react-native";
import { Link, router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useMyMatches, useMyRequirements, useTutorBrowse } from "@/lib/tuition/use-tuition";

export default function MarketplaceHomeScreen() {
  const t = useT();
  const me = useAuthStore((s) => s.me);
  const verified = me?.status === "VERIFIED";
  const browse = useTutorBrowse({});
  const requirements = useMyRequirements();
  const matches = useMyMatches();

  if (!verified) {
    return (
      <Screen header={<ScreenHeader title={t("tuition.tab")} />}>
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <UserRoundCheck size={40} className="text-muted-foreground" />
          <Text variant="h3" className="text-center">
            {t("tuition.gate.title")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("tuition.gate.body")}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={<ScreenHeader title={t("tuition.tab")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
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
            <Text className="flex-1 font-semibold text-foreground">{t("tuition.home.post_cta")}</Text>
          </Pressable>
        </Link>

        {/* Pay fees (module 12) */}
        <Link href="/payments" asChild>
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-primary-soft p-4"
          >
            <GraduationCap size={24} className="text-primary" />
            <View className="flex-1">
              <Text className="font-semibold text-foreground">{t("payments.tab")}</Text>
              <Text className="text-xs text-muted-foreground">{t("payments.home_body")}</Text>
            </View>
          </Pressable>
        </Link>

        {/* Store section (module 11 — school-scoped commerce) */}
        <Link href="/marketplace/stores" asChild>
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-primary-soft p-4"
          >
            <Store size={24} className="text-primary" />
            <View className="flex-1">
              <Text className="font-semibold text-foreground">{t("commerce.home_store_title")}</Text>
              <Text className="text-xs text-muted-foreground">{t("commerce.home_store_body")}</Text>
            </View>
          </Pressable>
        </Link>
        <EntryRow
          icon={<Package className="h-5 w-5 text-foreground" />}
          label={t("commerce.home_orders_title")}
          count={0}
          loading={false}
          onPress={() => { router.push("/marketplace/orders"); }}
        />

        <EntryRow
          icon={<ClipboardList size={20} className="text-foreground" />}
          label={t("tuition.home.my_requirements")}
          count={requirements.data?.length ?? 0}
          loading={requirements.isLoading}
          onPress={() => {
            router.push("/marketplace/requirements");
          }}
        />
        <EntryRow
          icon={<Briefcase size={20} className="text-foreground" />}
          label={t("tuition.home.my_matches")}
          count={matches.data?.length ?? 0}
          loading={matches.isLoading}
          onPress={() => {
            router.push("/marketplace/matches");
          }}
        />
        <EntryRow
          icon={<UserRoundCheck size={20} className="text-foreground" />}
          label={t("tuition.home.tutor_setup")}
          count={0}
          loading={false}
          onPress={() => {
            router.push("/marketplace/tutor-setup");
          }}
        />
      </View>
    </Screen>
  );
}

function EntryRow({
  icon,
  label,
  count,
  loading,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${String(count)}`}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-background p-4"
    >
      {icon}
      <Text className="flex-1 font-medium text-foreground">{label}</Text>
      {loading ? (
        <Skeleton className="h-6 w-8 rounded-full" />
      ) : count > 0 ? (
        <View className="rounded-full bg-primary px-2 py-0.5">
          <Text className="text-xs font-semibold text-primary-foreground">{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
