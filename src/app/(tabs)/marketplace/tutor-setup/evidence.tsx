// Evidence upload + submit-for-review + tracker (TUT-AP-009/010). Stage 2 wires the flow and
// states; the real 05 media pipeline (compress → presign → PUT R2 → confirm) swaps in at Stage 5.
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { useMyTutorProfile, useSubmitForReview } from "@/lib/tuition/use-tuition";

export default function TutorEvidenceScreen() {
  const t = useT();
  const toast = useToast();
  const profile = useMyTutorProfile();
  const submit = useSubmitForReview();
  const [nationalId, setNationalId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);

  const pending = profile.data?.hasPendingReview ?? false;
  const rejected = profile.data?.status === "rejected";

  const pick = (kind: "nid" | "evidence") => {
    // Stage 5: 05 media flow (compress → presign → PUT R2 → confirm) yields real media ids.
    const mediaId = `med_demo_${kind}_${String(Date.now())}`;
    if (kind === "nid") setNationalId(mediaId);
    else setEvidence((rows) => [...rows, mediaId]);
  };

  const ready = nationalId !== null && evidence.length >= 1;

  return (
    <Screen header={<ScreenHeader title={t("tuition.evidence.title")} />}>
      <View className="gap-4 px-4 pb-10 pt-2">
        {profile.data?.rejectionNote ? (
          <Text role="status" className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
            {t("tuition.tracker.reason", { reason: profile.data.rejectionNote })}
          </Text>
        ) : null}
        {pending ? (
          <Text role="status" className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {t("tuition.tracker.pending")}
          </Text>
        ) : null}

        <EvidenceRow
          label={t("tuition.evidence.national_id")}
          done={nationalId !== null}
          disabled={pending}
          onPress={() => { pick("nid"); }}
        />
        <EvidenceRow
          label={`${t("tuition.evidence.subject")} (1..n)`}
          done={evidence.length >= 1}
          disabled={pending}
          onPress={() => { pick("evidence"); }}
          count={evidence.length}
        />

        {!pending ? (
          <Button
            disabled={!ready || submit.isPending}
            onPress={() => { submit.mutate(
                { nationalIdMediaId: nationalId ?? "", evidenceMediaIds: evidence },
                {
                  onSuccess: () => { toast({ title: t("tuition.tracker.pending"), variant: "success" }); },
                },
              ); }
            }
          >
            <Text>{rejected ? t("tuition.tracker.resubmit") : t("tuition.evidence.submit")}</Text>
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}

function EvidenceRow({
  label,
  done,
  disabled,
  onPress,
  count,
}: {
  label: string;
  done: boolean;
  disabled?: boolean;
  onPress: () => void;
  count?: number;
}) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: done, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl border border-border bg-background p-4"
    >
      <View className="flex-1">
        <Text className="font-medium text-foreground">{label}</Text>
        {count !== undefined && count > 0 ? (
          <Text className="text-xs text-muted-foreground">{count}</Text>
        ) : null}
      </View>
      <Text className={done ? "font-semibold text-primary" : "text-primary"}>
        {done ? "✓" : t("tuition.evidence.add")}
      </Text>
    </Pressable>
  );
}
