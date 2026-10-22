import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Store } from "lucide-react-native";

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
import {
  FixtureError,
  signInAsDemoPartner,
  type OtpSendResult,
  type OtpVerifyResult,
  type User,
} from "@/fixtures/auth";
import { isBdPhone, normalizePhone } from "@/schemas/register";
import { z } from "zod";

// Returning users (IDT-US-003/-004/-005): phone OTP by default, email OTP for staff — login is
// passwordless (owner decision 2026-10-02) — plus the SSO row. Phone (SMS) OTP exists only here in
// the app; the api refuses it for web clients (owner rule 2026-10-17). The send button makes the
// first request, and its result starts OtpVerify's resend cooldown. After a successful login the
// route depends on status — PENDING opens the friendly pending screen (PendingNotice routing),
// VERIFIED goes straight to the tabs.
type LoginTab = "phone" | "email";

function routeFor(router: ReturnType<typeof useRouter>, user: User): void {
  if (user.status === "PENDING") {
    router.replace("/verification-pending");
    return;
  }
  if (user.role === "partner" || user.role === "vendor") {
    router.replace("/partner-program");
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
  // The first send's result; null while the user is still entering the phone or email.
  const [sent, setSent] = useState<OtpSendResult | null>(null);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);

  const normalizedEmail = () => email.trim().toLowerCase();

  const validEmail = () => z.email().safeParse(normalizedEmail()).success;

  const switchTab = (next: LoginTab) => {
    setTab(next);
    setSent(null); // a code belongs to one target — the other tab starts from entry
  };

  const sendLoginCode = async () => {
    if (sending) return;
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
    setSending(true);
    try {
      const result =
        tab === "phone"
          ? await requestOtpLive({ phone: normalizePhone(phone), purpose: "login" }, locale)
          : await requestOtpLive({ email: normalizedEmail(), purpose: "login" }, locale);
      setSent(result);
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
    } finally {
      setSending(false);
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
      setSent(null);
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

  // Fixture demo persona (2026-10-21): one tap signs the partner in and lands the program
  // console — task assignment, review, store toggle and the order feed.
  const [partnerLoading, setPartnerLoading] = useState(false);
  const signInAsPartner = async () => {
    if (partnerLoading) return;
    setPartnerLoading(true);
    try {
      const result = await signInAsDemoPartner();
      if (!result.user) return;
      signIn(result.user, {
        accessToken: result.accessToken ?? "",
        refreshToken: result.refreshToken ?? "",
      });
      routeFor(router, result.user);
    } catch (error) {
      if (error instanceof FixtureError && error.code === "OFFLINE") {
        toast({ title: t("auth.otp.needs_internet"), variant: "error" });
        return;
      }
      toast({ title: t("errors.network"), variant: "error" });
    } finally {
      setPartnerLoading(false);
    }
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
        onChange={switchTab}
        segments={[
          { value: "phone", label: t("auth.login.tab_phone") },
          { value: "email", label: t("auth.login.tab_email") },
        ]}
      />

      {sent ? (
        <View className="gap-2">
          <OtpVerify
            key={tab === "phone" ? normalizePhone(phone) : normalizedEmail()}
            {...(tab === "phone" ? { phone: normalizePhone(phone) } : { email: normalizedEmail() })}
            purpose="login"
            autoSend={false}
            initialSend={sent}
            onVerified={onVerified}
          />
          <Button
            variant="link"
            className="self-center"
            onPress={() => {
              setSent(null);
            }}
            testID="login-change-target"
          >
            <Text>{t(tab === "phone" ? "auth.otp.change_phone" : "auth.otp.change_email")}</Text>
          </Button>
        </View>
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
          <Button
            size="lg"
            className="self-stretch"
            loading={sending}
            onPress={() => void sendLoginCode()}
            testID="login-send-code"
          >
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
          variant="outline"
          className="self-stretch"
          loading={partnerLoading}
          onPress={() => void signInAsPartner()}
          testID="login-demo-partner"
        >
          <Store aria-hidden size={18} color={color.foreground} />
          <Text>{t("auth.login.demo_partner_btn")}</Text>
        </Button>
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
