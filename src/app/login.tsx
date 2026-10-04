import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { OtpVerify } from "@/components/auth/otp-verify";
import { AuthIllustration } from "@/components/auth/auth-illustration";
import { Button } from "@/components/ui/button";
import { GitHubMark, GoogleMark } from "@/components/ui/brand-marks";
import { Screen } from "@/components/ui/screen";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useLocale, useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { requestOtpLive } from "@/lib/auth/live-otp";
import { color } from "@/theme/tokens";
import { FixtureError, type OtpVerifyResult, type User } from "@/fixtures/auth";
import { isBdPhone, normalizePhone } from "@/schemas/register";
import { z } from "zod";

// Returning users (IDT-US-003/-004/-005): phone OTP by default, email OTP for staff — login is
// passwordless (owner decision 2026-10-02) — plus the SSO row. After a successful login the route
// depends on status — PENDING opens the friendly pending screen (PendingNotice routing), VERIFIED
// goes straight to the tabs.
type LoginTab = "phone" | "email";

function routeFor(router: ReturnType<typeof useRouter>, user: User): void {
  if (user.status === "PENDING") {
    router.replace("/verification-pending");
    return;
  }
  router.replace("/chat");
}

function LoginScreen() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const signIn = useAuthStore((s) => s.signIn);
  const me = useAuthStore((s) => s.me);
  const status = useAuthStore((s) => s.status);
  const [tab, setTab] = useState<LoginTab>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);

  const normalizedEmail = () => email.trim().toLowerCase();

  const validEmail = () => z.email().safeParse(normalizedEmail()).success;

  const sendLoginCode = async () => {
    if (tab === "phone" && !isBdPhone(phone)) {
      setPhoneError(true);
      return;
    }
    if (tab === "email" && !validEmail()) {
      setEmailError(true);
      return;
    }
    setPhoneError(false);
    setEmailError(false);
    try {
      if (tab === "phone") {
        await requestOtpLive({ phone: normalizePhone(phone), purpose: "login" }, locale);
      } else {
        await requestOtpLive({ email: normalizedEmail(), purpose: "login" }, locale);
      }
      setOtpStage(true);
    } catch (error) {
      if (error instanceof FixtureError && error.code === "OFFLINE") {
        toast({ title: t("auth.otp.needs_internet"), variant: "error" });
        return;
      }
      if (error instanceof FixtureError && error.code === "RATE_LIMITED") {
        toast({
          title: t("auth.otp.rate_limited", { seconds: error.retryAfterSeconds ?? 60 }),
          variant: "error",
        });
        return;
      }
      toast({ title: t("errors.network"), variant: "error" });
    }
  };

  const onVerified = (result: OtpVerifyResult) => {
    if (result.status === "unknown_phone" || result.status === "unknown_email" || !result.user) {
      toast({
        title: t(
          result.status === "unknown_email" ? "auth.otp.unknown_email" : "auth.otp.unknown_phone",
        ),
        variant: "warning",
      });
      setOtpStage(false);
      return;
    }
    signIn(result.user, {
      accessToken: result.accessToken ?? "",
      refreshToken: result.refreshToken ?? "",
    });
    routeFor(router, result.user);
  };

  const startSso = (provider: "google" | "github") => {
    router.push(`/auth/sso/return?provider=${provider}&intent=login`);
  };

  // Restore still running: stay blank (root splash already covers cold start). A finished
  // restore with a session must not sit on the login form — even when `me` is briefly null.
  if (status === "idle" || status === "checking") return null;
  if (status === "authed") {
    return <Redirect href={me?.status === "PENDING" ? "/verification-pending" : "/chat"} />;
  }

  return (
    <Screen className="justify-center gap-6">
      <AuthIllustration variant="hero" />
      <View className="gap-2">
        <Text variant="h1">{t("auth.login.title")}</Text>
      </View>

      <SegmentedPill
        accessibilityLabel={t("auth.login.title")}
        value={tab}
        onChange={setTab}
        segments={[
          { value: "phone", label: t("auth.login.tab_phone") },
          { value: "email", label: t("auth.login.tab_email") },
        ]}
      />

      {otpStage ? (
        <OtpVerify
          {...(tab === "phone" ? { phone: normalizePhone(phone) } : { email: normalizedEmail() })}
          purpose="login"
          autoSend={false}
          onVerified={onVerified}
        />
      ) : (
        <View className="gap-4">
          {tab === "phone" ? (
            <TextField
              label={t("auth.contact.phone")}
              value={phone}
              onChangeText={(next) => {
                setPhone(next);
                setPhoneError(false);
              }}
              error={phoneError ? t("validation.phone.invalid") : undefined}
              description={t("auth.contact.phone_hint")}
              keyboardType="number-pad"
              autoComplete="tel"
            />
          ) : (
            <TextField
              label={t("auth.login.email")}
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                setEmailError(false);
              }}
              error={emailError ? t("validation.email.invalid") : undefined}
              description={t("auth.login.email_hint")}
              required
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          )}
          <Button size="lg" className="self-stretch" onPress={() => void sendLoginCode()}>
            <Text>{t("auth.login.send_code")}</Text>
          </Button>
        </View>
      )}

      <View className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text variant="caption">{t("auth.login.sso_hint")}</Text>
          <View className="h-px flex-1 bg-border" />
        </View>
        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              startSso("google");
            }}
          >
            <GoogleMark size={18} />
            <Text>{t("auth.sso.google")}</Text>
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              startSso("github");
            }}
          >
            <GitHubMark size={18} fill={color.foreground} />
            <Text>{t("auth.sso.github")}</Text>
          </Button>
        </View>
        <Button
          variant="link"
          className="self-center"
          onPress={() => {
            router.push("/register");
          }}
          testID="login-register-hint"
        >
          <Text>{t("auth.login.register_hint")}</Text>
        </Button>
      </View>
    </Screen>
  );
}

export default LoginScreen;
