import {
  OTP_DELAYED_AFTER_MS,
  canResend,
  cooldownSecondsLeft,
  initialOtpState,
  isCodeDead,
  isSmsDelayed,
  otpReducer,
  rateLimitSecondsLeft,
} from "./otp-state";

// IDT-AP-006 — OTP state machine: 60 s cooldown, delayed-SMS after 15 s, rate-limit lockout that
// a tick releases, dead code after 3 attempts.

describe("otpReducer", () => {
  it("walks idle → sending → sent with a cooldown", () => {
    let state = otpReducer(initialOtpState, { type: "send_started" });
    expect(state.phase).toBe("sending");

    state = otpReducer(state, { type: "send_succeeded", now: 0, cooldownSeconds: 60 });
    expect(state.phase).toBe("sent");
    expect(state.sentAt).toBe(0);
    expect(cooldownSecondsLeft(state, 30_000)).toBe(30);
  });

  it("rate-limits a send and releases the lockout on a later tick", () => {
    let state = otpReducer(initialOtpState, { type: "send_started" });
    state = otpReducer(state, { type: "send_rate_limited", now: 0, retryAfterSeconds: 60 });
    expect(state.phase).toBe("rate_limited");
    expect(rateLimitSecondsLeft(state, 10_000)).toBe(50);
    expect(canResend(state, 10_000)).toBe(false);

    state = otpReducer(state, { type: "tick", now: 60_000 });
    expect(state.phase).toBe("sent");
    expect(rateLimitSecondsLeft(state, 60_000)).toBe(0);
    expect(canResend(state, 60_000)).toBe(true);
  });

  it("counts failed verifies and kills the code after 3 attempts", () => {
    let state = otpReducer(initialOtpState, { type: "send_succeeded", now: 0 });
    state = otpReducer(state, { type: "verify_started" });
    state = otpReducer(state, { type: "verify_failed" });
    state = otpReducer(state, { type: "verify_failed" });
    expect(state.phase).toBe("invalid");
    expect(isCodeDead(state)).toBe(false);

    state = otpReducer(state, { type: "verify_started" });
    state = otpReducer(state, { type: "verify_failed" });
    expect(isCodeDead(state)).toBe(true);
  });

  it("resets to idle after a successful verify", () => {
    let state = otpReducer(initialOtpState, { type: "send_succeeded", now: 0 });
    state = otpReducer(state, { type: "verify_started" });
    state = otpReducer(state, { type: "verify_succeeded" });
    expect(state).toEqual(initialOtpState);
  });
});

describe("selectors", () => {
  const sent = otpReducer(initialOtpState, { type: "send_succeeded", now: 0 });

  it("reports the resend cooldown as over once it elapses", () => {
    expect(cooldownSecondsLeft(sent, 59_500)).toBe(1);
    expect(cooldownSecondsLeft(sent, 60_000)).toBe(0);
    expect(canResend(sent, 60_000)).toBe(true);
    expect(canResend(sent, 0)).toBe(false);
  });

  it("flags the SMS as delayed 15 s after the send", () => {
    expect(isSmsDelayed(sent, OTP_DELAYED_AFTER_MS - 1)).toBe(false);
    expect(isSmsDelayed(sent, OTP_DELAYED_AFTER_MS)).toBe(true);
    expect(isSmsDelayed(initialOtpState, 999_999)).toBe(false);
  });

  it("blocks resend while a send or verify is in flight", () => {
    const sending = otpReducer(sent, { type: "send_started" });
    expect(canResend(sending, 999_999)).toBe(false);
    const verifying = otpReducer(sent, { type: "verify_started" });
    expect(canResend(verifying, 999_999)).toBe(false);
  });
});
