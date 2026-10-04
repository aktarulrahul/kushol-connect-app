// Tutor public profile (TUT-AP-007): public-safe fields only; contact rendered only when the
// payload carries it (accepted pair — INV-4); CTA pre-fills the wizard (subjects/area).
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VerifiedBadge } from "@/components/tuition/bits";
import { useT } from "@/i18n/locale-provider";
import { useTutorProfile } from "@/lib/tuition/use-tuition";

export default function TutorPublicProfileScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tutor = useTutorProfile(id);

  if (tutor.isLoading) {
    return (
      <Screen header={<ScreenHeader title={t("tuition.setup.title")} />}>
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (tutor.isError || !tutor.data) {
    return (
      <Screen header={<ScreenHeader title={t("tuition.setup.title")} />}>
        <EmptyState title={t("common.state.error_body")} />
      </Screen>
    );
  }

  const v = tutor.data;
  return (
    <Screen header={<ScreenHeader title={v.name} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        <View className="flex-row items-center justify-between">
          <Text variant="lead">{v.university}</Text>
          <VerifiedBadge />
        </View>
        <Text className="text-foreground">
          {v.subjects.map((s) => t(`tuition.subject.${s}` as Parameters<typeof t>[0])).join(", ")}
          {" · "}
          {v.classesTaught.map((c) => t(`tuition.class.${c}` as Parameters<typeof t>[0])).join(", ")}
        </Text>
        {v.hourlyRateHint !== undefined ? (
          <Text className="tabular-nums text-muted-foreground">
            {t("tuition.profile.rate_hint", { n: v.hourlyRateHint })}
          </Text>
        ) : null}
        {v.bioBn ? <Text className="text-foreground">{v.bioBn}</Text> : null}
        {v.bioEn ? <Text className="text-muted-foreground">{v.bioEn}</Text> : null}
        {v.availability ? (
          <Text className="text-sm text-muted-foreground">
            {t("tuition.profile.availability")}: {v.availability}
          </Text>
        ) : null}
        <Text className="text-xs text-muted-foreground">{t("tuition.profile.contact_hidden")}</Text>

        <Button
          className="mt-2"
          onPress={() => { router.push({
              pathname: "/marketplace/requirements/new",
              params: { subject: v.subjects[0], area: v.locationArea ?? "" },
            }); }
          }
        >
          <Text>{t("tuition.profile.request_as_tutor")}</Text>
        </Button>
      </View>
    </Screen>
  );
}
