// Tutor browse (TUT-AP-006): subject/area filters, verified chip locked ON (TUT-BR-002).
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VerifiedBadge } from "@/components/tuition/bits";
import { useT } from "@/i18n/locale-provider";
import { useTutorBrowse } from "@/lib/tuition/use-tuition";
import { TUITION_SUBJECTS, type TuitionSubject } from "@/schemas/tuition";

export default function TutorBrowseScreen() {
  const t = useT();
  const [subject, setSubject] = useState<TuitionSubject | undefined>();
  const [area, setArea] = useState("");
  const browse = useTutorBrowse({ subject, area: area.trim() || undefined });

  return (
    <Screen header={<ScreenHeader title={t("tuition.browse.title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        <View className="flex-row items-center gap-2">
          <View className="rounded-full border border-primary bg-primary-soft px-3 py-1.5">
            <Text className="text-xs font-semibold text-primary">✓ {t("tuition.browse.verified_locked")}</Text>
          </View>
          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder={t("tuition.browse.filter_area")}
            accessibilityLabel={t("tuition.browse.filter_area")}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground"
          />
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: subject === undefined }}
            onPress={() => {
              setSubject(undefined);
            }}
            className={`rounded-full border px-3 py-1.5 ${subject === undefined ? "border-primary bg-primary" : "border-border bg-background"}`}
          >
            <Text className={`text-xs ${subject === undefined ? "font-semibold text-primary-foreground" : "text-muted-foreground"}`}>
              {t("tuition.wizard.gender.any")}
            </Text>
          </Pressable>
          {TUITION_SUBJECTS.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: subject === key }}
              onPress={() => {
                setSubject(subject === key ? undefined : key);
              }}
              className={`rounded-full border px-3 py-1.5 ${subject === key ? "border-primary bg-primary" : "border-border bg-background"}`}
            >
              <Text className={`text-xs ${subject === key ? "font-semibold text-primary-foreground" : "text-foreground"}`}>
                {t(`tuition.subject.${key}` as Parameters<typeof t>[0])}
              </Text>
            </Pressable>
          ))}
        </View>

        {browse.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </View>
        ) : (browse.data?.length ?? 0) === 0 ? (
          <EmptyState
            title={t("tuition.browse.empty")}
            action={
              <Button variant="outline" onPress={() => {
                  router.push("/marketplace/tutor-setup");
                }}>
                <Text>{t("tuition.browse.create_profile_cta")}</Text>
              </Button>
            }
          />
        ) : (
          <View className="gap-2">
            {browse.data?.map((tutor) => (
              <Pressable
                key={tutor.id}
                accessibilityRole="button"
                onPress={() => {
                  router.push(`/marketplace/tutors/${tutor.id}`);
                }}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-semibold text-foreground">{tutor.name}</Text>
                  <VerifiedBadge />
                </View>
                <Text className="text-xs text-muted-foreground">{tutor.university}</Text>
                <Text className="mt-1 text-xs text-foreground">
                  {tutor.subjects.map((s) => t(`tuition.subject.${s}` as Parameters<typeof t>[0])).join(", ")}
                  {tutor.locationArea ? ` · ${tutor.locationArea}` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
