import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { OnboardingHeader, stepHref } from "@/components/onboarding/onboarding-header";
import { useStepGuard } from "@/components/onboarding/step-guard";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";
import { RELATIONS, validateContact, type GuardianRelation } from "@/schemas/register";

// Step 4 — contact (IDT-AP-005): full name (2–80) + BD mobile (`^(?:\+?880|0)1[3-9]\d{8}$`);
// guardians additionally prove the link with the child's student ID (3–20) and relation. Errors
// come from `validation.*` keys; input is never lost on a failed validate (05 §3).
export default function ContactScreen() {
  const guard = useStepGuard("contact");
  const router = useRouter();
  const t = useT();
  const draft = useOnboardingStore((s) => s.draft);
  const patch = useOnboardingStore((s) => s.patch);
  const goTo = useOnboardingStore((s) => s.goTo);
  const [errors, setErrors] = useState<ReturnType<typeof validateContact>>({});
  if (guard) return guard;

  const guardian = draft.role === "guardian";

  const sendCode = () => {
    const found = validateContact({
      role: draft.role,
      fullName: draft.fullName,
      phone: draft.phone,
      studentCode: draft.studentCode,
      relation: draft.relation,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (goTo("otp")) router.push(stepHref("otp"));
  };

  return (
    <Screen className="pt-1">
      <OnboardingHeader title={t("auth.contact.title")} />
      <TextField
        label={t("auth.contact.name")}
        value={draft.fullName}
        onChangeText={(fullName) => {
          patch({ fullName });
        }}
        error={errors.full_name ? t(errors.full_name) : undefined}
        required
        autoCorrect={false}
        textContentType="name"
      />
      {draft.role !== "teacher" ? (
        <TextField
          label={t("auth.contact.phone")}
          value={draft.phone}
          onChangeText={(phone) => {
            patch({ phone });
          }}
          error={errors.phone ? t(errors.phone) : undefined}
          description={t("auth.contact.phone_hint")}
          required
          keyboardType="number-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      ) : null}
      {guardian ? (
        <View className="gap-4 rounded-lg border border-border bg-card p-4">
          <Text variant="label">{t("auth.contact.guardian_section")}</Text>
          <TextField
            label={t("auth.contact.student_code")}
            value={draft.studentCode}
            onChangeText={(studentCode) => {
              patch({ studentCode });
            }}
            error={errors.student_code ? t(errors.student_code) : undefined}
            required
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <View className="gap-1.5">
            <Text variant="label">
              {t("auth.contact.relation")}
              <Text className="text-destructive"> *</Text>
            </Text>
            <Select
              value={
                draft.relation
                  ? { value: draft.relation, label: t(`auth.relation.${draft.relation}`) }
                  : undefined
              }
              onValueChange={(option) => {
                patch({ relation: (option?.value ?? null) as GuardianRelation | null });
              }}
            >
              <SelectTrigger accessibilityLabel={t("auth.contact.relation")}>
                <SelectValue placeholder={t("validation.choose_one")} />
              </SelectTrigger>
              <SelectContent>
                {RELATIONS.map((relation) => (
                  <SelectItem
                    key={relation}
                    value={relation}
                    label={t(`auth.relation.${relation}`)}
                  >
                    {t(`auth.relation.${relation}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.relation ? <Text variant="error">{t(errors.relation)}</Text> : null}
          </View>
        </View>
      ) : null}
      <Button size="lg" className="self-stretch" onPress={sendCode}>
        <Text>{t("auth.contact.send_code")}</Text>
      </Button>
    </Screen>
  );
}
