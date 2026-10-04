// My requirements (TUT-AP-004): status chips, interested counts, expiry countdown.
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { BudgetText, RequirementStatusChip } from "@/components/tuition/bits";
import { useT } from "@/i18n/locale-provider";
import type { Requirement } from "@/fixtures/tuition";
import { useMyRequirements } from "@/lib/tuition/use-tuition";

/** Captured once at module load — never an impure call during render (react-compiler rule). */
const LOADED_AT = Date.now();

export default function MyRequirementsScreen() {
  const t = useT();
  const rows = useMyRequirements();

  return (
    <Screen header={<ScreenHeader title={t("tuition.requirements.title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        {rows.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </View>
        ) : (rows.data?.length ?? 0) === 0 ? (
          <EmptyState title={t("tuition.requirements.empty")} />
        ) : (
          rows.data?.map((r: Requirement) => {
            const daysLeft = Math.max(
              0,
              Math.ceil((new Date(r.expiresAt).getTime() - LOADED_AT) / 86_400_000),
            );
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => {
                  router.push(`/marketplace/requirements/${r.id}`);
                }}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-semibold text-foreground">
                    {r.subjects.map((s) => t(`tuition.subject.${s}` as Parameters<typeof t>[0])).join(", ")}
                    {" · "}
                    {t(`tuition.class.${r.classLevel}` as Parameters<typeof t>[0])}
                  </Text>
                  <RequirementStatusChip status={r.status} />
                </View>
                <View className="mt-2 flex-row items-center justify-between gap-2">
                  <BudgetText min={r.budgetMin} max={r.budgetMax} />
                  <Text className="text-xs text-muted-foreground">
                    {t("tuition.requirements.expires_in", { n: daysLeft })}
                  </Text>
                </View>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {t("tuition.requirements.interested", { n: r.interestedCount })}
                  {r.locationArea ? ` · ${r.locationArea}` : ""}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}
