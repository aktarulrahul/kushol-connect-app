import { useRouter } from "expo-router";
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
import { useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { color } from "@/theme/tokens";
import {
  FixtureError,
  loginPassword,
  requestOtp,
  type OtpVerifyResult,
  type User,
} from "@/fixtures/auth";
import { isBdPhone, normalizePhone } from "@/schemas/register";

// Returning users (IDT-US-003/-004/-005): phone OTP by default, email+password for staff, SSO
// row. After a successful login the route depends on status — PENDING opens the friendly pending
// screen (PendingNotice routing), VERIFIED goes straight to the tabs.
type LoginTab = "phone" | "password";

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
  const toast = useToast();
  const signIn = useAuthStore((s) => s.signIn);
  const [tab, setTab] = useState<LoginTab>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const sendLoginCode = async () => {
    if (!isBdPhone(phone)) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    try {
      await requestOtp({ phone: normalizePhone(phone), purpose: "login" });
      setOtpStage(true);
    } catch (error) {
      toast({
        title: t(
          error instanceof FixtureError && error.code === "OFFLINE"
            ? "auth.otp.needs_internet"
            : "errors.network",
        ),
        variant: "error",
      });
    }
  };

  const onVerified = (result: OtpVerifyResult) => {
    if (result.status === "unknown_phone" || !result.user) {
      toast({ title: t("auth.otp.unknown_phone"), variant: "warning" });
      setOtpStage(false);
      return;
    }
    signIn(result.user, {
      accessToken: result.accessToken ?? "",
      refreshToken: result.refreshToken ?? "",
    });
    routeFor(router, result.user);
  };

  const submitPassword = async () => {
    setSigningIn(true);
    setPasswordError(null);
    try {
      const result = await loginPassword({ email: email.trim(), password });
      signIn(result.user, {
        accessToken: result.accessToken ?? "",
        refreshToken: result.refreshToken ?? "",
      });
      routeFor(router, result.user);
    } catch (error) {
      if (error instanceof FixtureError && error.code === "SUSPENDED") {
        setPasswordError(t("auth.suspended"));
      } else if (error instanceof FixtureError && error.code === "OFFLINE") {
        setPasswordError(t("auth.otp.needs_internet"));
      } else {
        // Enumeration-safe: identical generic error for unknown account and wrong password.
        setPasswordError(t("errors.unauthenticated"));
      }
    } finally {
      setSigningIn(false);
    }
  };

  const startSso = (provider: "google" | "github") => {
    router.push(`/auth/sso/return?provider=${provider}&intent=login`);
  };

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
          { value: "password", label: t("auth.login.tab_password") },
        ]}
      />

      {tab === "phone" ? (
        otpStage ? (
          <OtpVerify
            phone={normalizePhone(phone)}
            purpose="login"
            autoSend
            onVerified={onVerified}
          />
        ) : (
          <View className="gap-4">
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
            <Button size="lg" className="self-stretch" onPress={() => void sendLoginCode()}>
              <Text>{t("auth.login.send_code")}</Text>
            </Button>
          </View>
        )
      ) : (
        <View className="gap-4">
          <TextField
            label={t("auth.login.email")}
            value={email}
            onChangeText={setEmail}
            required
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            label={t("auth.login.password")}
            value={password}
            onChangeText={setPassword}
            error={passwordError ?? undefined}
            description={t("auth.login.password_hint")}
            required
            secureTextEntry
          />
          <Button
            size="lg"
            className="self-stretch"
            loading={signingIn}
            disabled={signingIn}
            onPress={() => void submitPassword()}
          >
            <Text>{t("auth.login.sign_in")}</Text>
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
