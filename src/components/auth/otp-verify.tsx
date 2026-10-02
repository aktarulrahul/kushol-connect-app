import { Keyframe, ReduceMotion } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { OtpInput } from "@/components/ui/otp-input";
import { Text } from "@/components/ui/text";
import type { TFunction } from "@/i18n";
import { useLocale, useT } from "@/i18n/locale-provider";
import { FixtureError, requestOtp, type OtpVerifyResult, verifyOtp } from "@/fixtures/auth";
import { requestOtpLive, verifyOtpLive } from "@/lib/auth/live-otp";
import {
  canResend,
  cooldownSecondsLeft,
  initialOtpState,
  isCodeDead,
  isSmsDelayed,
  otpReducer,
  rateLimitSecondsLeft,
} from "@/lib/auth/otp-state";

// Shared OTP send/verify UI (IDT-AP-006, used by onboarding + login): 6 boxes with auto-advance;
// 60 s resend countdown (bn numerals via t()); delayed-SMS notice 15 s after the send; rate-limit
// lockout with countdown; wrong codes shake twice (static border under reduced motion) then clear
// + refocus; a dead code after 3 attempts offers resend; offline refuses with
// "এর জন্য ইন্টারনেট লাগবে" — auth never queues silently (01 §7 #8).
const shake = new Keyframe({
  0: { translateX: 0 },
  25: { translateX: -6 },
  50: { translateX: 6 },
  75: { translateX: -3 },
  100: { translateX: 0 },
})
  .duration(200)
  .reduceMotion(ReduceMotion.System);

function errorNotice(error: unknown, t: TFunction): string {
  if (error instanceof FixtureError) {
    switch (error.code) {
      case "OFFLINE":
        return t("auth.otp.needs_internet");
      case "SUSPENDED":
        return t("auth.suspended");
      case "RATE_LIMITED":
        return t("auth.otp.rate_limited", { seconds: error.retryAfterSeconds ?? 60 });
      default:
        break;
    }
  }
  return t("errors.network");
}

function OtpVerify({
  phone,
  email,
  purpose,
  autoSend = false,
  live = false,
  onVerified,
}: {
  /** Normalized E.164 phone — exactly one of phone/email. */
  phone?: string;
  /** Lowercase email target — exactly one of phone/email (passwordless staff login, owner
   * decision 2026-10-02). */
  email?: string;
  purpose: "login" | "register";
  /** Send the first code on mount (onboarding flow). Login sends from its own button. */
  autoSend?: boolean;
  /** Email login talks to the api so the worker can deliver the message. Phone stays on the fixture. */
  live?: boolean;
  /** Called after `verifyOtp` succeeds — `unknown_phone`/`unknown_email` arrive here for login
   * routing. */
  onVerified: (result: OtpVerifyResult) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [state, dispatch] = useReducer(otpReducer, initialOtpState);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const sentOnce = useRef(false);

  const send = useCallback(async () => {
    dispatch({ type: "send_started" });
    setNotice(null);
    try {
      const body = phone ? { phone, purpose } : { email: email ?? "", purpose };
      const result = live ? await requestOtpLive(body, locale) : await requestOtp(body);
      sentOnce.current = true;
      dispatch({
        type: "send_succeeded",
        now: Date.now(),
        cooldownSeconds: result.cooldownSeconds,
      });
      dispatch({ type: "tick", now: Date.now() });
    } catch (error) {
      if (error instanceof FixtureError && error.code === "RATE_LIMITED") {
        dispatch({
          type: "send_rate_limited",
          now: Date.now(),
          retryAfterSeconds: error.retryAfterSeconds ?? 60,
        });
      } else {
        dispatch({ type: "send_failed" });
      }
      setNotice(errorNotice(error, t));
    }
  }, [phone, email, purpose, t, live, locale]);

  useEffect(() => {
    if (autoSend && !sentOnce.current) {
      sentOnce.current = true;
      void send();
    }
  }, [autoSend, send]);

  // 1 s tick drives the cooldown, the rate-limit lockout and the 15 s delayed-SMS notice.
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: "tick", now: Date.now() });
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const verify = async () => {
    setNotice(null);
    dispatch({ type: "verify_started" });
    try {
      const result = live
        ? await verifyOtpLive(
            phone
              ? { phone, otpCode: code, purpose }
              : { email: email ?? "", otpCode: code, purpose },
            locale,
          )
        : await verifyOtp({ phone, email, otpCode: code, purpose });
      dispatch({ type: "verify_succeeded" });
      onVerified(result);
    } catch (error) {
      const nextAttempts = state.attempts + 1;
      dispatch({ type: "verify_failed" });
      setCode("");
      setNotice(
        error instanceof FixtureError && error.code === "INVALID_OTP"
          ? isCodeDead({ ...state, attempts: nextAttempts })
            ? t("auth.otp.expired")
            : t("auth.otp.invalid")
          : errorNotice(error, t),
      );
    }
  };

  const now = state.lastTick;
  const resendIn = cooldownSecondsLeft(state, now);
  const lockedFor = rateLimitSecondsLeft(state, now);
  const delayed = isSmsDelayed(state, now);

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text variant="lead">{phone ? t("auth.otp.prompt") : t("auth.otp.prompt_email")}</Text>
        <Text variant="muted">
          {phone
            ? t("auth.otp.sent_to", { phone })
            : t("auth.otp.sent_to_email", { email: email ?? "" })}
        </Text>
      </View>

      <NativeOnlyAnimatedView
        key={`otp-${String(state.attempts)}`}
        entering={state.phase === "invalid" ? shake : undefined}
      >
        <OtpInput
          value={code}
          onChange={setCode}
          accessibilityLabel={t("auth.otp.code_label")}
          invalid={state.phase === "invalid"}
          autoFocus
        />
      </NativeOnlyAnimatedView>

      {state.phase === "invalid" ? (
        <Text variant="error" accessibilityLiveRegion="polite">
          {isCodeDead(state) ? t("auth.otp.expired") : (notice ?? t("auth.otp.invalid"))}
        </Text>
      ) : notice ? (
        <Text variant="error" accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}

      {delayed && lockedFor === 0 ? (
        <View className="gap-1 rounded-lg bg-warning-soft p-3" accessibilityLiveRegion="polite">
          <Text variant="small">{phone ? t("auth.sms_delayed") : t("auth.email_delayed")}</Text>
          <Button
            variant="link"
            className="self-start px-0"
            onPress={() => {
              router.push("/(onboarding)/sso");
            }}
          >
            <Text>{t("auth.login.sso_hint")}</Text>
          </Button>
        </View>
      ) : null}

      <View className="gap-3">
        <Button
          size="lg"
          className="self-stretch"
          disabled={code.length < 6 || state.phase === "verifying"}
          loading={state.phase === "verifying"}
          onPress={() => void verify()}
        >
          <Text>{t("auth.otp.verify")}</Text>
        </Button>
        <Button
          variant="ghost"
          disabled={!canResend(state, now)}
          loading={state.phase === "sending"}
          onPress={() => void send()}
        >
          <Text>
            {lockedFor > 0
              ? t("auth.otp.rate_limited", { seconds: lockedFor })
              : resendIn > 0
                ? t("auth.otp.resend_in", { seconds: resendIn })
                : t("auth.otp.resend")}
          </Text>
        </Button>
      </View>
    </View>
  );
}

export { OtpVerify };
