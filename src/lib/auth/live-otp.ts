import { createApiClient, isProblem, type ApiClient, type Locale } from "@/api/client";
import {
  FixtureError,
  type OtpRequestInput,
  type OtpSendResult,
  type OtpVerifyInput,
  type OtpVerifyResult,
} from "@/fixtures/auth";

// Live OTP transport for passwordless email login. The Stage-2 fixture seam never leaves
// the device, so an address entered on the login screen produced no message. Phone
// registration stays on the fixture until the rest of the seam is swapped.

type OtpClient = Pick<ApiClient, "POST">;

function clientFor(locale: Locale | undefined, client?: OtpClient): OtpClient {
  return client ?? createApiClient(locale ? { locale } : {});
}

function mapProblem(error: unknown, response: Response, verify: boolean): Error {
  if (!isProblem(error)) return new FixtureError("OFFLINE");
  if (error.code === "RATE_LIMITED") {
    const retry = Number(response.headers.get("Retry-After"));
    return new FixtureError("RATE_LIMITED", Number.isFinite(retry) && retry > 0 ? retry : 60);
  }
  if (error.code === "SUSPENDED") return new FixtureError("SUSPENDED");
  // Wrong, expired, or exhausted codes are VALIDATION_FAILED on verify (one generic message).
  if (verify && error.code === "VALIDATION_FAILED") return new FixtureError("INVALID_OTP");
  return new Error(error.code);
}

/** POST /auth/otp/request — the api queues auth.otp_email and the worker sends it. */
export async function requestOtpLive(
  input: OtpRequestInput,
  locale?: Locale,
  client?: OtpClient,
): Promise<OtpSendResult> {
  const api = clientFor(locale, client);
  try {
    const { data, error, response } = await api.POST("/api/v1/auth/otp/request", { body: input });
    if (!data) throw mapProblem(error, response, false);
    return data.data;
  } catch (error) {
    if (error instanceof FixtureError) throw error;
    if (error instanceof Error && error.message !== "Failed to fetch" && error.message !== "Network request failed") {
      throw error;
    }
    throw new FixtureError("OFFLINE");
  }
}

/** POST /auth/otp/verify — checks the code the email actually carried. */
export async function verifyOtpLive(
  input: OtpVerifyInput,
  locale?: Locale,
  client?: OtpClient,
): Promise<OtpVerifyResult> {
  const api = clientFor(locale, client);
  try {
    const { data, error, response } = await api.POST("/api/v1/auth/otp/verify", { body: input });
    if (!data) throw mapProblem(error, response, true);
    return data.data;
  } catch (error) {
    if (error instanceof FixtureError) throw error;
    if (error instanceof Error && error.message !== "Failed to fetch" && error.message !== "Network request failed") {
      throw error;
    }
    throw new FixtureError("OFFLINE");
  }
}
