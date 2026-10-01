import { useRouter } from "expo-router";

import { OnboardingHeader } from "@/components/onboarding/onboarding-header";
import { useStepGuard } from "@/components/onboarding/step-guard";
import { OtpVerify } from "@/components/auth/otp-verify";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import type { CatalogKey } from "@/i18n";
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";
import { FixtureError, register } from "@/fixtures/auth";
import { normalizePhone } from "@/schemas/register";

// Step 5 — OTP + register (IDT-AP-006): verifies the phone (purpose `register`) and completes
// registration in one go — the account is created PENDING and the pending gate opens. The shared
// OtpVerify component carries the countdown / delayed-SMS / rate-limit / offline behaviour; a
// failed register (e.g. offline) keeps the draft and the verified OTP for a retry.
function registerErrorKey(error: unknown): CatalogKey {
  if (error instanceof FixtureError && error.code === "OFFLINE") return "auth.otp.needs_internet";
  return "errors.generic";
}

export default function OtpScreen() {
  const guard = useStepGuard("otp");
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const draft = useOnboardingStore((s) => s.draft);
  const signIn = useAuthStore((s) => s.signIn);
  const phone = normalizePhone(draft.phone);

  const onVerified = async () => {
    try {
      const result = await register({
        locale: draft.locale,
        role: draft.role,
        fullName: draft.fullName.trim(),
        phone,
        schoolId: draft.schoolId as string,
        sectionId: draft.sectionId as string,
        ...(draft.role === "guardian"
          ? { studentCode: draft.studentCode.trim(), relation: draft.relation ?? undefined }
          : {}),
      });
      signIn(result.user, {
        accessToken: result.accessToken ?? "",
        refreshToken: result.refreshToken ?? "",
      });
      router.replace("/verification-pending");
    } catch (error) {
      toast({ title: t(registerErrorKey(error)), variant: "error" });
    }
  };

  if (guard) return guard;
  return (
    <Screen className="pt-1">
      <OnboardingHeader title={t("auth.otp.title")} />
      <OtpVerify phone={phone} purpose="register" autoSend onVerified={() => void onVerified()} />
    </Screen>
  );
}
