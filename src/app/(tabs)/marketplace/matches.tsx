// Tutor-side matches (TUT-AP-011): requirement summaries, interest CTA (optimistic), staged
// contact + chat deep link only after acceptance (TUT-BR-006/007).
import { View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { BudgetText, MatchStatusChip } from "@/components/tuition/bits";
import { useT } from "@/i18n/locale-provider";
import { useDeclineMatch, useExpressInterest, useMyMatches } from "@/lib/tuition/use-tuition";

export default function MyMatchesScreen() {
  const t = useT();
  const toast = useToast();
  const rows = useMyMatches();
  const interest = useExpressInterest();
  const decline = useDeclineMatch();

  return (
    <Screen header={<ScreenHeader title={t("tuition.matches.title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        {rows.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </View>
        ) : (rows.data?.length ?? 0) === 0 ? (
          <EmptyState title={t("tuition.matches.empty")} />
        ) : (
          rows.data?.map((m) => (
            <View key={m.id} className="gap-2 rounded-2xl border border-border bg-background p-4">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="font-semibold text-foreground">
                  {m.requirement.subjects.map((s) => t(`tuition.subject.${s}` as Parameters<typeof t>[0])).join(", ")}
                  {" · "}
                  {t(`tuition.class.${m.requirement.classLevel}` as Parameters<typeof t>[0])}
                </Text>
                <MatchStatusChip status={m.status} />
              </View>
              <View className="flex-row items-center justify-between gap-2">
                <BudgetText min={m.requirement.budgetMin} max={m.requirement.budgetMax} />
                <Text className="text-xs text-muted-foreground">{m.requirement.locationArea}</Text>
              </View>
              {m.requirement.scheduleNote ? (
                <Text className="text-xs text-muted-foreground">{m.requirement.scheduleNote}</Text>
              ) : null}

              {m.status === "accepted" && m.contact ? (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-foreground">
                    {t("tuition.matches.contact_revealed")}: {m.contact.phone}
                  </Text>
                  {m.chat?.dmGroupId ? (
                    <Button
                      onPress={() => {
                        router.push(`/messages/${m.chat?.dmGroupId ?? ""}`);
                      }}
                    >
                      <Text>{t("tuition.matches.chat_cta")}</Text>
                    </Button>
                  ) : m.chat?.messageRequestId ? (
                    <Text role="status" className="text-sm text-muted-foreground">
                      {t("tuition.matches.request_pending")}
                    </Text>
                  ) : null}
                </View>
              ) : m.status === "notified" ? (
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    disabled={interest.isPending}
                    onPress={() => {
                      interest.mutate(m.id, {
                        onError: () => {
                          toast({ title: t("chat.offline.refused"), variant: "error" });
                        },
                      });
                    }}
                  >
                    <Text>{t("tuition.matches.interest_cta")}</Text>
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={decline.isPending}
                    onPress={() => {
                      decline.mutate(m.id);
                    }}
                  >
                    <Text className="text-muted-foreground">{t("tuition.matches.decline")}</Text>
                  </Button>
                </View>
              ) : m.status === "interested" ? (
                <Text role="status" className="text-sm text-primary">
                  {t("tuition.matches.interest_done")}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
