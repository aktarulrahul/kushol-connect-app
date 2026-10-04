// Post-requirement wizard (TUT-AP-002): 4 steps — subjects+class → budget+gender → area+pin →
// summary. Offline submit queues with the banner (§8); NOT_VERIFIED never reaches step 1.
import { useMemo, useReducer, useState } from "react";
import { TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { Text } from "@/components/ui/text";
import { BudgetText, ClassChips, SubjectChips, bnNumber } from "@/components/tuition/bits";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  queueRequirementPost,
  useCreateRequirement,
} from "@/lib/tuition/use-tuition";
import {
  initialWizardState,
  requirementInputFrom,
  wizardReducer,
  WIZARD_ORDER,
} from "@/lib/tuition/wizard";
import { TUITION_GENDER_PREFS } from "@/schemas/tuition";

export default function RequirementWizardScreen() {
  const t = useT();
  const me = useAuthStore((s) => s.me);
  const params = useLocalSearchParams<{ subject?: string; area?: string }>();
  const prefill = useMemo(() => {
    const subject = params.subject;
    return {
      subjects: subject ? [subject as never] : undefined,
      locationArea: params.area,
    } as const;
  }, [params.subject, params.area]);

  const [state, dispatch] = useReducer(wizardReducer, initialWizardState(prefill));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const create = useCreateRequirement();
  const [queuedNotice, setQueuedNotice] = useState(false);

  if (me?.status !== "VERIFIED") {
    return (
      <Screen header={<ScreenHeader title={t("tuition.wizard.title")} />}>
        <View className="flex-1 items-center justify-center gap-3 px-6">
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

  const stepIndex = WIZARD_ORDER.indexOf(state.step);
  const isLast = state.step === "review";
  const values = state.values;

  const submit = () => {
    const input = requirementInputFrom(values);
    create.mutate(input, {
      onSuccess: () => {
        dispatch({ type: "reset" });
        router.replace("/marketplace/requirements");
      },
      onError: () => {
        // Offline (§8): the post queues with the banner — never silently lost.
        queueRequirementPost(input);
        setQueuedNotice(true);
      },
    });
  };

  return (
    <Screen header={<ScreenHeader title={t("tuition.wizard.title")} />}>
      <View className="flex-1 gap-4 px-4 pb-6 pt-2">
        <View className="gap-2" accessibilityRole="progressbar" accessibilityLabel={t("tuition.wizard.step", { n: stepIndex + 1 })}>
          <Text variant="muted">{t("tuition.wizard.step", { n: stepIndex + 1 })}</Text>
          <View className="flex-row gap-1">
            {WIZARD_ORDER.map((step, i) => (
              <View
                key={step}
                className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </View>
        </View>

        {state.errorKey ? (
          <Text role="alert" className="text-sm text-destructive">
            {t(state.errorKey as Parameters<typeof t>[0])}
          </Text>
        ) : null}
        {queuedNotice ? (
          <Text role="status" className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {t("tuition.wizard.queued")}
          </Text>
        ) : null}

        {state.step === "subjects" ? (
          <View className="gap-4">
            <Text variant="lead">{t("tuition.wizard.subjects_q")}</Text>
            <SubjectChips
              selected={values.subjects ?? []}
              onToggle={(subject) => {
                dispatch({
                  type: "set",
                  patch: {
                    subjects: (values.subjects ?? []).includes(subject)
                      ? values.subjects?.filter((s) => s !== subject)
                      : [...(values.subjects ?? []), subject],
                  },
                });
              }}
              errorKey={state.errorKey}
            />
            <Text variant="lead">{t("tuition.wizard.class_q")}</Text>
            <ClassChips
              selected={values.classLevel ? [values.classLevel] : []}
              onToggle={(level) => {
                dispatch({ type: "set", patch: { classLevel: level } });
              }}
            />
          </View>
        ) : null}

        {state.step === "budget" ? (
          <View className="gap-4">
            <Text variant="lead">{t("tuition.wizard.budget_q")}</Text>
            <View className="flex-row items-center gap-3">
              <LabeledNumberInput
                label={t("tuition.wizard.budget_min")}
                value={values.budgetMin}
                onChange={(budgetMin) => { dispatch({ type: "set", patch: { budgetMin } }); }}
              />
              <Text className="text-muted-foreground">–</Text>
              <LabeledNumberInput
                label={t("tuition.wizard.budget_max")}
                value={values.budgetMax}
                onChange={(budgetMax) => { dispatch({ type: "set", patch: { budgetMax } }); }}
              />
            </View>
            {values.budgetMin !== undefined && values.budgetMax !== undefined && values.budgetMin <= values.budgetMax ? (
              <BudgetText min={values.budgetMin} max={values.budgetMax} />
            ) : null}
            <Text variant="lead">{t("tuition.wizard.gender_q")}</Text>
            <SegmentedPill
              segments={TUITION_GENDER_PREFS.map((value) => ({
                value,
                label: t(`tuition.wizard.gender.${value}` as Parameters<typeof t>[0]),
              }))}
              value={values.genderPref ?? "any"}
              onChange={(genderPref) => { dispatch({ type: "set", patch: { genderPref } }); }}
              accessibilityLabel={t("tuition.wizard.gender_q")}
            />
          </View>
        ) : null}

        {state.step === "location" ? (
          <View className="gap-4">
            <Text variant="lead">{t("tuition.wizard.area_q")}</Text>
            <TextInput
              value={values.locationArea ?? ""}
              onChangeText={(text) => { dispatch({ type: "set", patch: { locationArea: text } }); }}
              placeholder={t("tuition.location.area_ph")}
              accessibilityLabel={t("tuition.wizard.area_q")}
              className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
            />
            <Button
              variant="outline"
              onPress={() => { dispatch({
                  type: "set",
                  patch: { lat: values.lat ?? 23.7806, lng: values.lng ?? 90.4074 },
                }); }
              }
            >
              <Text>{values.lat && values.lng ? "✓" : t("tuition.wizard.pick_pin")}</Text>
            </Button>
            <Text variant="muted">{t("tuition.location.hint")}</Text>
            <Text variant="lead">{t("tuition.wizard.schedule_q")}</Text>
            <TextInput
              value={values.scheduleNote ?? ""}
              onChangeText={(text) => { dispatch({ type: "set", patch: { scheduleNote: text } }); }}
              placeholder={t("tuition.wizard.schedule_ph")}
              accessibilityLabel={t("tuition.wizard.schedule_q")}
              multiline
              className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
            />
          </View>
        ) : null}

        {state.step === "review" ? (
          <View className="gap-3">
            <Text variant="lead">{t("tuition.wizard.review_title")}</Text>
            <ReviewRow label={t("tuition.wizard.subjects_q")} value={(values.subjects ?? []).map((s) => t(`tuition.subject.${s}` as Parameters<typeof t>[0])).join(", ")} />
            <ReviewRow label={t("tuition.wizard.class_q")} value={values.classLevel ? t(`tuition.class.${values.classLevel}` as Parameters<typeof t>[0]) : ""} />
            {values.budgetMin !== undefined && values.budgetMax !== undefined ? (
              <ReviewRow label={t("tuition.wizard.budget_q")} value={`${bnNumber(values.budgetMin)}–${bnNumber(values.budgetMax)} ৳`} />
            ) : null}
            <ReviewRow label={t("tuition.wizard.gender_q")} value={t(`tuition.wizard.gender.${values.genderPref ?? "any"}` as Parameters<typeof t>[0])} />
            <ReviewRow label={t("tuition.wizard.area_q")} value={values.locationArea ?? ""} />
            <ReviewRow label={t("tuition.wizard.schedule_q")} value={values.scheduleNote ?? "—"} />
            <Button
              variant="ghost"
              onPress={() => {
                dispatch({ type: "goto", step: "subjects" });
              }}
            >
              <Text>{t("tuition.wizard.review_edit")}</Text>
            </Button>
          </View>
        ) : null}

        <View className="mt-auto flex-row gap-2">
          {stepIndex > 0 ? (
            <Button variant="outline" className="flex-1" onPress={() => { dispatch({ type: "back" }); }}>
              <Text>{t("tuition.wizard.back")}</Text>
            </Button>
          ) : null}
          {isLast ? (
            <Button className="flex-1" disabled={create.isPending} onPress={() => { setConfirmOpen(true); }}>
              <Text>{t("tuition.wizard.post")}</Text>
            </Button>
          ) : (
            <Button className="flex-1" onPress={() => { dispatch({ type: "next" }); }}>
              <Text>{t("tuition.wizard.next")}</Text>
            </Button>
          )}
        </View>
      </View>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("tuition.wizard.post")}
        description={`${values.locationArea ?? ""} · ${bnNumber(values.budgetMin ?? 0)}–${bnNumber(values.budgetMax ?? 0)} ৳`}
        confirmLabel={t("tuition.wizard.post")}
        onConfirm={() => {
          setConfirmOpen(false);
          submit();
        }}
      />
    </Screen>
  );
}

function LabeledNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
}) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <TextInput
        value={value === undefined ? "" : String(value)}
        onChangeText={(text) => {
          const parsed = Number.parseInt(text.replace(/[^\d]/g, ""), 10);
          onChange(Number.isNaN(parsed) ? undefined : parsed);
        }}
        keyboardType="number-pad"
        accessibilityLabel={label}
        className="rounded-xl border border-border bg-background px-3 py-2.5 tabular-nums text-foreground"
      />
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4 rounded-xl border border-border p-3">
      <Text className="text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-right font-medium text-foreground">{value}</Text>
    </View>
  );
}
