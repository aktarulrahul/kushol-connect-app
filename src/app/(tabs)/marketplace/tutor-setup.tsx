// Tutor profile editor (TUT-AP-008): draft-safe form with the contact-info guard messaging;
// evidence + submit live on the evidence screen; status tracker included (TUT-AP-010).
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { ClassChips, SubjectChips } from "@/components/tuition/bits";
import { useT } from "@/i18n/locale-provider";
import { useSaveTutorProfile, useMyTutorProfile } from "@/lib/tuition/use-tuition";
import { tutorProfileForm, type TutorProfileFormValues } from "@/schemas/tuition";

export default function TutorSetupScreen() {
  const t = useT();
  const toast = useToast();
  const profile = useMyTutorProfile();
  const save = useSaveTutorProfile();
  const [values, setValues] = useState<Partial<TutorProfileFormValues>>({});
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const patch = (p: Partial<TutorProfileFormValues>) => {
    setValues((prev) => ({ ...prev, ...p }));
    setErrorKey(null);
  };

  const saveDraft = () => {
    const parsed = tutorProfileForm.safeParse(values);
    if (!parsed.success) {
      setErrorKey(parsed.error.issues[0]?.message ?? "validation.tuition.university_length");
      return;
    }
    save.mutate(parsed.data, {
      onSuccess: () => { toast({ title: t("tuition.setup.saved"), variant: "success" }); },
    });
  };

  const trackerStatus = profile.data?.status ?? "draft";

  return (
    <Screen header={<ScreenHeader title={t("tuition.setup.title")} />}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-2">
        <View className="gap-2 rounded-2xl border border-border bg-muted/30 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("tuition.tracker.title")}
          </Text>
          <Text className="font-semibold text-foreground">
            {trackerStatus === "verified"
              ? `✓ ${t("tuition.tracker.verified")}`
              : trackerStatus === "pending_review"
                ? t("tuition.tracker.pending")
                : trackerStatus === "rejected"
                  ? t("tuition.tracker.rejected")
                  : t("tuition.tracker.draft")}
          </Text>
          {profile.data?.rejectionNote ? (
            <>
              <Text className="text-sm text-destructive">
                {t("tuition.tracker.reason", { reason: profile.data.rejectionNote })}
              </Text>
              <Button variant="outline" onPress={() => { router.push("/marketplace/tutor-setup/evidence"); }}>
                <Text>{t("tuition.tracker.resubmit")}</Text>
              </Button>
            </>
          ) : null}
          {trackerStatus === "draft" ? (
            <Button variant="outline" onPress={() => { router.push("/marketplace/tutor-setup/evidence"); }}>
              <Text>{t("tuition.evidence.title")}</Text>
            </Button>
          ) : null}
        </View>

        {errorKey ? (
          <Text role="alert" className="text-sm text-destructive">
            {t(errorKey as Parameters<typeof t>[0])}
          </Text>
        ) : null}

        <Field label={t("tuition.setup.university")}>
          <TextInput
            value={values.university ?? ""}
            onChangeText={(university) => { patch({ university }); }}
            accessibilityLabel={t("tuition.setup.university")}
            className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
          />
        </Field>

        <Field label={t("tuition.wizard.subjects_q")}>
          <SubjectChips
            selected={values.subjects ?? []}
            onToggle={(subject) => { patch({
                subjects: (values.subjects ?? []).includes(subject)
                  ? values.subjects?.filter((s) => s !== subject)
                  : [...(values.subjects ?? []), subject],
              }); }
            }
          />
        </Field>

        <Field label={t("tuition.setup.classes_taught")}>
          <ClassChips
            selected={values.classesTaught ?? []}
            onToggle={(level) => { patch({
                classesTaught: (values.classesTaught ?? []).includes(level)
                  ? values.classesTaught?.filter((c) => c !== level)
                  : [...(values.classesTaught ?? []), level],
              }); }
            }
          />
        </Field>

        <Field label={t("tuition.setup.bio_bn")}>
          <TextInput
            value={values.bioBn ?? ""}
            onChangeText={(bioBn) => { patch({ bioBn }); }}
            multiline
            accessibilityLabel={t("tuition.setup.bio_bn")}
            className="min-h-20 rounded-xl border border-border bg-background px-4 py-3 text-foreground"
          />
        </Field>

        <Field label={t("tuition.setup.bio_en")}>
          <TextInput
            value={values.bioEn ?? ""}
            onChangeText={(bioEn) => { patch({ bioEn }); }}
            multiline
            accessibilityLabel={t("tuition.setup.bio_en")}
            className="min-h-20 rounded-xl border border-border bg-background px-4 py-3 text-foreground"
          />
        </Field>

        <Field label={t("tuition.setup.rate_hint")}>
          <TextInput
            value={values.hourlyRateHint === undefined ? "" : String(values.hourlyRateHint)}
            onChangeText={(text) => {
              const parsed = Number.parseInt(text.replace(/[^\d]/g, ""), 10);
              patch({ hourlyRateHint: Number.isNaN(parsed) ? undefined : parsed });
            }}
            keyboardType="number-pad"
            accessibilityLabel={t("tuition.setup.rate_hint")}
            className="rounded-xl border border-border bg-background px-4 py-3 tabular-nums text-foreground"
          />
        </Field>

        <Field label={t("tuition.setup.availability")}>
          <TextInput
            value={values.availability ?? ""}
            onChangeText={(availability) => { patch({ availability }); }}
            accessibilityLabel={t("tuition.setup.availability")}
            className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
          />
        </Field>

        <Field label={t("tuition.setup.area")}>
          <Pressable
            accessibilityRole="button"
            onPress={() => { router.push("/(modals)/location-picker"); }}
            className="rounded-xl border border-border bg-background px-4 py-3"
          >
            <Text className={values.locationArea ? "text-foreground" : "text-muted-foreground"}>
              {values.locationArea ?? t("tuition.location.area_ph")}
            </Text>
          </Pressable>
        </Field>

        <Button onPress={saveDraft} disabled={save.isPending}>
          <Text>{t("tuition.setup.save_draft")}</Text>
        </Button>
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      {children}
    </View>
  );
}
