// Requirement detail (TUT-AP-005): interested tutors (public-safe + badge, never contact),
// single accept with confirm, matched/expired states, poster close.
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { VerifiedBadge } from "@/components/tuition/bits";
import { useT } from "@/i18n/locale-provider";
import { useAcceptMatch, useCloseRequirement, useRequirementMatches } from "@/lib/tuition/use-tuition";

export default function RequirementDetailScreen() {
  const t = useT();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matches = useRequirementMatches(id);
  const close = useCloseRequirement();
  const accept = useAcceptMatch();
  const [accepting, setAccepting] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);

  const rows = matches.data ?? [];
  const accepted = rows.find((m) => m.status === "accepted");

  return (
    <Screen header={<ScreenHeader title={t("tuition.requirements.detail_title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        {matches.isLoading ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : matches.isError ? (
          <Text role="status" className="text-sm text-destructive">
            {t("common.state.error_body")}
          </Text>
        ) : accepted ? (
          <View className="rounded-2xl border border-primary bg-primary-soft p-4">
            <Text className="font-semibold text-primary">{t("tuition.requirements.matched_banner")}</Text>
            <Text className="text-sm text-foreground">{accepted.tutor.name}</Text>
            <Button
              variant="outline"
              className="mt-2"
              onPress={() => { router.push(`/messages/${accepted.tutor.profileId}`); }}
            >
              <Text>{t("tuition.requirements.open_chat")}</Text>
            </Button>
          </View>
        ) : null}

        {!accepted ? (
          <>
            <Text variant="lead">{t("tuition.requirements.interested_tutors")}</Text>
            {rows.length === 0 ? (
              <EmptyState title={t("tuition.requirements.no_interested")} />
            ) : (
              rows.map((m) => (
                <View key={m.id} className="rounded-2xl border border-border bg-background p-4">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="font-semibold text-foreground">{m.tutor.name}</Text>
                    <VerifiedBadge />
                  </View>
                  <Text className="text-xs text-muted-foreground">{m.tutor.university}</Text>
                  <Text className="text-xs text-foreground">
                    {m.tutor.subjects.map((s) => t(`tuition.subject.${s}` as Parameters<typeof t>[0])).join(", ")}
                  </Text>
                  {m.tutor.hourlyRateHint !== undefined ? (
                    <Text className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {t("tuition.profile.rate_hint", { n: m.tutor.hourlyRateHint })}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-xs text-muted-foreground">{t("tuition.profile.contact_hidden")}</Text>
                  <View className="mt-3 flex-row gap-2">
                    <Button className="flex-1" onPress={() => {
                      setAccepting(m.id);
                    }}>
                      <Text>{t("tuition.requirements.accept")}</Text>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onPress={() => { router.push(`/marketplace/tutors/${m.tutor.profileId}`); }}
                    >
                      <Text>{t("tuition.requirements.view_profile")}</Text>
                    </Button>
                  </View>
                </View>
              ))
            )}
            <Button variant="ghost" onPress={() => {
              setCloseOpen(true);
            }} disabled={close.isPending}>
              <Text className="text-destructive">{t("tuition.requirements.close")}</Text>
            </Button>
          </>
        ) : null}
      </View>

      <ConfirmModal
        open={accepting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAccepting(null);
          }
        }}
        title={t("tuition.requirements.accept_confirm_title")}
        description={t("tuition.requirements.accept_confirm_body")}
        confirmLabel={t("tuition.requirements.accept")}
        onConfirm={() => {
          if (!accepting) return;
          accept.mutate(accepting, {
            onSuccess: () => {
              setAccepting(null);
            },
            onError: () => {
              setAccepting(null);
              toast({ title: t("tuition.requirements.already_matched"), variant: "error" });
            },
          });
        }}
      />

      <ConfirmModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title={t("tuition.requirements.close_confirm_title")}
        description={t("tuition.requirements.close_confirm_body")}
        confirmLabel={t("tuition.requirements.close")}
        destructive
        onConfirm={() => {
          if (!id) return;
          close.mutate(id, {
            onSuccess: () => {
              setCloseOpen(false);
              router.back();
            },
          });
        }}
      />
    </Screen>
  );
}
