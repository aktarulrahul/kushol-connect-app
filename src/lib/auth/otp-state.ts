// OTP screen state machine (IDT-AP-006, 05 §2.3): send → 60 s cooldown, delayed-SMS notice after
// 15 s, 3 attempts per code then it is dead, rate-limited countdown with resend disabled. Pure
// reducer + time selectors so the screen stays dumb and the rules are unit-tested.
// Times are epoch ms passed in as `now` — no hidden clock in the machine.

export const OTP_MAX_ATTEMPTS = 3;
export const OTP_DELAYED_AFTER_MS = 15_000;
export const OTP_DEFAULT_COOLDOWN_SECONDS = 60;

export type OtpPhase = "idle" | "sending" | "sent" | "verifying" | "invalid" | "rate_limited";

export type OtpState = {
  phase: OtpPhase;
  sentAt: number | null;
  cooldownEndsAt: number | null;
  rateLimitEndsAt: number | null;
  /** Failed verify attempts against the current code; ≥ OTP_MAX_ATTEMPTS means the code is dead. */
  attempts: number;
  /** Clock of the last `tick` — the screen renders countdowns from it, never Date.now(). */
  lastTick: number;
};

export type OtpEvent =
  | { type: "send_started" }
  | { type: "send_succeeded"; now: number; cooldownSeconds?: number }
  | { type: "send_rate_limited"; now: number; retryAfterSeconds: number }
  | { type: "send_failed" }
  | { type: "verify_started" }
  | { type: "verify_failed" }
  | { type: "verify_succeeded" }
  | { type: "tick"; now: number }
  | { type: "reset" };

export const initialOtpState: OtpState = {
  phase: "idle",
  sentAt: null,
  cooldownEndsAt: null,
  rateLimitEndsAt: null,
  attempts: 0,
  lastTick: 0,
};

export function otpReducer(state: OtpState, event: OtpEvent): OtpState {
  switch (event.type) {
    case "send_started":
      return { ...state, phase: "sending" };
    case "send_succeeded":
      return {
        ...state,
        phase: "sent",
        sentAt: event.now,
        cooldownEndsAt: event.now + (event.cooldownSeconds ?? OTP_DEFAULT_COOLDOWN_SECONDS) * 1000,
        rateLimitEndsAt: null,
        attempts: 0,
      };
    case "send_rate_limited":
      return {
        ...state,
        phase: "rate_limited",
        rateLimitEndsAt: event.now + event.retryAfterSeconds * 1000,
      };
    case "send_failed":
      return state.phase === "sending" ? { ...state, phase: "sent" } : state;
    case "verify_started":
      return { ...state, phase: "verifying" };
    case "verify_failed":
      return { ...state, phase: "invalid", attempts: state.attempts + 1 };
    case "verify_succeeded":
      return { ...initialOtpState };
    case "tick": {
      if (
        state.phase === "rate_limited" &&
        state.rateLimitEndsAt !== null &&
        event.now >= state.rateLimitEndsAt
      ) {
        return { ...state, phase: "sent", rateLimitEndsAt: null, lastTick: event.now };
      }
      return { ...state, lastTick: event.now };
    }
    case "reset":
      return { ...initialOtpState };
  }
}

/** Seconds left before "resend" unlocks (0 when it already has). */
export function cooldownSecondsLeft(state: OtpState, now: number): number {
  if (state.cooldownEndsAt === null) return 0;
  return Math.max(0, Math.ceil((state.cooldownEndsAt - now) / 1000));
}

/** Seconds left in a rate-limit lockout (0 when not rate-limited). */
export function rateLimitSecondsLeft(state: OtpState, now: number): number {
  if (state.rateLimitEndsAt === null) return 0;
  return Math.max(0, Math.ceil((state.rateLimitEndsAt - now) / 1000));
}

/** SMS hasn't arrived 15 s after the send — show `auth.sms_delayed` (05 §2.3). */
export function isSmsDelayed(state: OtpState, now: number): boolean {
  if (state.sentAt === null) return false;
  if (state.phase !== "sent" && state.phase !== "invalid" && state.phase !== "verifying") {
    return false;
  }
  return now - state.sentAt >= OTP_DELAYED_AFTER_MS;
}

/** Resend is offered outside cooldowns, while the flow is not mid-flight. */
export function canResend(state: OtpState, now: number): boolean {
  if (state.phase === "sending" || state.phase === "verifying") return false;
  if (rateLimitSecondsLeft(state, now) > 0) return false;
  return cooldownSecondsLeft(state, now) === 0;
}

/** The current code is dead after 3 wrong attempts — resend is the only way forward (BR-003). */
export function isCodeDead(state: OtpState): boolean {
  return state.attempts >= OTP_MAX_ATTEMPTS;
}
