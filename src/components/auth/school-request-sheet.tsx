import { useState } from "react";
import { View } from "react-native";

import { Sheet } from "@/components/ui/sheet";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import type { CatalogKey } from "@/i18n";
import { useT } from "@/i18n/locale-provider";
import { createSchoolRequest, FixtureError, type SchoolRequestInput } from "@/fixtures/auth";
import { normalizePhone } from "@/schemas/register";
import {
  emptySchoolRequestForm,
  SCHOOL_REQUEST_TYPES,
  validateSchoolRequest,
  type SchoolRequestErrors,
  type SchoolRequestForm,
} from "@/schemas/school-request";

// "Can't find your school?" (owner requirement 2026-10-01): the user submits the institution's
// details and the application admin approves/rejects it, connecting the POC to onboard it. The
// user cannot finish registration until the institution exists — after the confirmation state
// they return to the hierarchy step with a notice, and the flow continues normally for
// existing schools.

function requestErrorKey(error: unknown): CatalogKey {
  if (error instanceof FixtureError && error.code === "OFFLINE") return "auth.otp.needs_internet";
  if (error instanceof FixtureError && error.code === "CONFLICT") {
    return "auth.school_request.conflict";
  }
  return "errors.network";
}

function SchoolRequestSheet({
  open,
  onOpenChange,
  cityId,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefilled from the chosen city (never typed). */
  cityId: string;
  /** Fired when the back-from-confirmation button returns the user to the hierarchy step. */
  onSent: () => void;
}) {
  // Mounted only while open: the Sheet is a Modal with entering-only animations, so an instant
  // unmount on close is invisible, and every open starts from a pristine form/stage — no
  // reset effect needed.
  if (!open) return null;
  return <SchoolRequestSheetBody onOpenChange={onOpenChange} cityId={cityId} onSent={onSent} />;
}

function SchoolRequestSheetBody({
  onOpenChange,
  cityId,
  onSent,
}: {
  onOpenChange: (open: boolean) => void;
  cityId: string;
  onSent: () => void;
}) {
  const t = useT();
  const [stage, setStage] = useState<"form" | "success">("form");
  const [form, setForm] = useState<SchoolRequestForm>(() => emptySchoolRequestForm(cityId));
  const [errors, setErrors] = useState<SchoolRequestErrors>({});
  const [formError, setFormError] = useState<CatalogKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField =
    <K extends keyof SchoolRequestForm>(field: K) =>
    (value: SchoolRequestForm[K]) => {
      setForm((previous) => ({ ...previous, [field]: value }));
    };

  const submit = async () => {
    const found = validateSchoolRequest(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const input: SchoolRequestInput = {
        name: form.name.trim(),
        type: form.type,
        cityId: form.cityId,
        pocName: form.pocName.trim(),
        pocPhone: normalizePhone(form.pocPhone),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.pocEmail.trim() ? { pocEmail: form.pocEmail.trim() } : {}),
      };
      await createSchoolRequest(input);
      setStage("success");
    } catch (error) {
      setFormError(requestErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  };

  const backToHierarchy = () => {
    onOpenChange(false);
    onSent();
  };

  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={
        stage === "form" ? t("auth.school_request.title") : t("auth.school_request.success_title")
      }
      description={
        stage === "form" ? t("auth.school_request.hint") : t("auth.school_request.success_body")
      }
      footer={
        stage === "form" ? (
          <Button
            size="lg"
            loading={submitting}
            disabled={submitting}
            onPress={() => void submit()}
            testID="school-request-submit"
          >
            <Text>{t("auth.school_request.submit")}</Text>
          </Button>
        ) : (
          <Button size="lg" onPress={backToHierarchy} testID="school-request-back">
            <Text>{t("auth.school_request.back")}</Text>
          </Button>
        )
      }
    >
      {stage === "form" ? (
        <View className="gap-4">
          <TextField
            label={t("auth.school_request.name")}
            value={form.name}
            onChangeText={setField("name")}
            error={errors.name ? t(errors.name) : undefined}
            required
            testID="school-request-name"
          />
          <View className="gap-1.5">
            <Text variant="label">{t("auth.school_request.type")}</Text>
            <SegmentedPill
              accessibilityLabel={t("auth.school_request.type")}
              value={form.type}
              onChange={(type) => {
                setField("type")(type);
              }}
              segments={SCHOOL_REQUEST_TYPES.map((type) => ({
                value: type,
                label: t(
                  type === "school"
                    ? "auth.school_request.type_school"
                    : "auth.school_request.type_college",
                ),
              }))}
            />
          </View>
          <TextField
            label={t("auth.school_request.address")}
            value={form.address}
            onChangeText={setField("address")}
            error={errors.address ? t(errors.address) : undefined}
            multiline
          />
          <TextField
            label={t("auth.school_request.poc_name")}
            value={form.pocName}
            onChangeText={setField("pocName")}
            error={errors.poc_name ? t(errors.poc_name) : undefined}
            required
            testID="school-request-poc-name"
          />
          <TextField
            label={t("auth.school_request.poc_phone")}
            value={form.pocPhone}
            onChangeText={setField("pocPhone")}
            error={errors.poc_phone ? t(errors.poc_phone) : undefined}
            description={t("auth.contact.phone_hint")}
            required
            keyboardType="number-pad"
            autoComplete="tel"
            testID="school-request-poc-phone"
          />
          <TextField
            label={t("auth.school_request.poc_email")}
            value={form.pocEmail}
            onChangeText={setField("pocEmail")}
            error={errors.poc_email ? t(errors.poc_email) : undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {formError ? (
            <Text variant="error" accessibilityLiveRegion="polite">
              {t(formError)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

export { SchoolRequestSheet };
