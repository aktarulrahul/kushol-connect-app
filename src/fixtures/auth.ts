// ─── THE STAGE-2 AUTH SEAM ──────────────────────────────────────────────────────────────────
// Every auth/hierarchy call in the app imports from this file ONLY. When the real api lands,
// this single file is rewritten to call the generated client (createApiClient from @/api/client)
// — no call site changes (03 `05-app-tasks.md` §4 "generated OpenAPI client → api").
//
// Types come only from the api's OpenAPI spec (src/api/schema.gen.ts) so the swap is type-checked.
// One deliberate exception, awaited in the spec: the P1 device list (no endpoint in the spec yet).
// It carries a local interim type marked `TODO(schema)` and collapses into a schema.gen.ts type
// when that lands.
//
// Mock behaviour is clearly fictional ("Demo High School" — never a real school/person,
// prompt.txt §12) and driven by a flag switcher + simulated latency for demo and tests.
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];
export type User = Schemas["User"];
export type Locale = Schemas["Locale"];
export type UserRole = Schemas["UserRole"];
export type OtpRequestInput = Schemas["OtpRequestInput"];
export type OtpSendResult = Schemas["OtpSendResult"]["data"];
export type OtpVerifyInput = Schemas["OtpVerifyInput"];
export type OtpVerifyResult = Schemas["OtpVerifyResult"]["data"];
export type PasswordLoginInput = Schemas["PasswordLoginInput"];
export type PasswordLoginResult = Schemas["PasswordLoginResult"]["data"];
export type RegisterInput = Schemas["RegisterInput"];
export type RegisterResult = Schemas["RegisterResult"]["data"];
export type MeUpdateInput = Schemas["MeUpdateInput"];
export type LogoutInput = Schemas["LogoutInput"];
export type RefreshInput = Schemas["RefreshInput"];
export type RefreshResult = Schemas["RefreshResult"]["data"];
export type VerificationRequestItem = Schemas["VerificationRequestItem"];
export type HierarchyCity = Schemas["HierarchyCity"];
export type HierarchySchool = Schemas["HierarchySchool"];
export type HierarchySection = Schemas["HierarchySection"];
export type SchoolRequestInput = Schemas["SchoolRequestInput"];
export type SchoolRequestCreated = Schemas["SchoolRequestCreated"]["data"];

/** Every seam call resolves with `T` or rejects with `FixtureError` — screens catch and map. */
export type FixtureResult<T> = Promise<T>;

// ─── Errors (mirror the api's RFC-7807 `code` so screens map them to i18n keys) ─────────────

export type FixtureErrorCode =
  "OFFLINE" | "INVALID_OTP" | "RATE_LIMITED" | "SUSPENDED" | "UNAUTHENTICATED" | "CONFLICT";

export class FixtureError extends Error {
  constructor(
    readonly code: FixtureErrorCode,
    readonly retryAfterSeconds?: number,
  ) {
    super(`fixture:${code}`);
    this.name = "FixtureError";
  }
}

// ─── Flag switcher (demo/testing) ────────────────────────────────────────────────────────────

/**
 * One active scenario at a time. `success` is the golden path; the others force the API-side
 * failure states the screens must survive (01-user-stories.md §7).
 */
export const FIXTURE_MODES = [
  "success",
  "invalid_otp",
  "rate_limited",
  "suspended",
  "unknown_phone",
  "sms_delayed",
  "offline",
] as const;
export type FixtureMode = (typeof FIXTURE_MODES)[number];

let mode: FixtureMode = "success";
let schoolRequest: SchoolRequestFlag = "success";
const listeners = new Set<(mode: FixtureMode) => void>();

/** Forces the `POST /hierarchy/school-requests` outcome independently of the auth `mode`. */
export const SCHOOL_REQUEST_FLAGS = ["success", "conflict"] as const;
export type SchoolRequestFlag = (typeof SCHOOL_REQUEST_FLAGS)[number];

export const fixtureFlags = {
  get mode(): FixtureMode {
    return mode;
  },
  set(next: FixtureMode): void {
    mode = next;
    for (const listener of listeners) listener(mode);
  },
  get schoolRequest(): SchoolRequestFlag {
    return schoolRequest;
  },
  setSchoolRequest(next: SchoolRequestFlag): void {
    schoolRequest = next;
  },
  reset(): void {
    mode = "success";
    schoolRequest = "success";
    for (const listener of listeners) listener(mode);
  },
  subscribe(listener: (mode: FixtureMode) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Simulated network latency — jittered so loading states are real on device. */
const latency = async (base = 350): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, base + Math.random() * base));
};

function requireOnline(): void {
  if (mode === "offline") throw new FixtureError("OFFLINE");
}

// ─── In-memory session state ─────────────────────────────────────────────────────────────────

let sessionSeq = 0;
let currentUser: User | null = null;
let currentTokens: RefreshResult | null = null;
let openRequest: VerificationRequestItem | null = null;
/** Phones that finished `/auth/otp/verify` with purpose `register` — register re-checks this. */
const verifiedForRegister = new Set<string>();
/** Phone → the code the (simulated) SMS carried; any code is accepted unless the flag says no. */
const sentCodes = new Map<string, string>();

export function fixtureSession(): { user: User | null; tokens: RefreshResult | null } {
  return { user: currentUser, tokens: currentTokens };
}

/** Demo-only: simulates the School Admin approving the request in 07 (mid-session gate open). */
export function fixtureApproveCurrentUser(): void {
  if (!currentUser || currentUser.status !== "PENDING") return;
  currentUser = { ...currentUser, status: "VERIFIED" };
  if (openRequest) openRequest = { ...openRequest, status: "APPROVED" };
}

/** Demo-only: flips the current request to REJECTED with a reason (rejected + resubmit path). */
export function fixtureRejectCurrentUser(
  reason = "নাম ও আইডি মিলছে না — ঠিক করে আবার জমা দিন",
): void {
  if (!currentUser || !openRequest) return;
  openRequest = { ...openRequest, status: "REJECTED", decisionReason: reason };
}

/** Clears every mutable state (tests). */
export function resetFixtureAuth(): void {
  sessionSeq = 0;
  schoolRequestSeq = 0;
  currentUser = null;
  currentTokens = null;
  openRequest = null;
  verifiedForRegister.clear();
  sentCodes.clear();
  devices = [deviceTemplate("current")];
  fixtureFlags.reset();
}

function issueTokens(): RefreshResult {
  sessionSeq += 1;
  return {
    accessToken: `access_demo_${String(sessionSeq)}`,
    refreshToken: `refresh_demo_${String(sessionSeq)}`,
  };
}

function demoUser(input: {
  role: UserRole;
  status: User["status"];
  fullName: string;
  locale: Locale;
  phone?: string;
  schoolId?: string | null;
}): User {
  return {
    id: `user_demo_${String(++sessionSeq)}`,
    role: input.role,
    status: input.status,
    locale: input.locale,
    fullName: input.fullName,
    ...(input.phone ? { maskedPhone: maskPhone(input.phone) } : {}),
    schoolId: input.schoolId ?? null,
    isAmbassador: false,
    plan: "free",
  };
}

function maskPhone(phone: string): string {
  return phone.length < 6 ? "+8801XXXXXX789" : `+8801${phone.slice(-7, -4)}XXX${phone.slice(-3)}`;
}

// ─── Auth fixtures (typed from the spec) ─────────────────────────────────────────────────────

/** POST /auth/otp/request — 202, enumeration-safe: always answers sent. */
export async function requestOtp(input: OtpRequestInput): Promise<OtpSendResult> {
  await latency();
  requireOnline();
  if (mode === "rate_limited") throw new FixtureError("RATE_LIMITED", 60);
  const target = input.phone ?? input.email ?? "";
  const code = String(100000 + Math.floor(Math.random() * 900000));
  sentCodes.set(target, code);
  return {
    sentAt: new Date().toISOString(),
    cooldownSeconds: 60,
    channel: input.phone ? "sms" : "email",
  };
}

/** POST /auth/otp/resend — identical contract to request. */
export async function resendOtp(input: OtpRequestInput): Promise<OtpSendResult> {
  return requestOtp(input);
}

/** POST /auth/otp/verify — login returns tokens; register/link return `{status:"verified"}`. */
export async function verifyOtp(input: OtpVerifyInput): Promise<OtpVerifyResult> {
  await latency();
  requireOnline();
  const target = input.phone ?? input.email ?? "";
  if (mode === "suspended") throw new FixtureError("SUSPENDED");
  if (mode === "invalid_otp" || sentCodes.get(target) === undefined) {
    throw new FixtureError("INVALID_OTP");
  }
  if (input.purpose === "login") {
    if (mode === "unknown_phone") return { status: "unknown_phone" };
    // A real login on a known phone — demo lands a VERIFIED teacher in the tabs.
    const user = demoUser({
      role: "teacher",
      status: "VERIFIED",
      fullName: "ডেমো শিক্ষক",
      locale: "bn",
      phone: input.phone,
    });
    currentTokens = issueTokens();
    currentUser = user;
    return { status: "ok", ...currentTokens, user };
  }
  if (input.phone) verifiedForRegister.add(input.phone);
  return { status: "verified" };
}

/** POST /auth/register — account PENDING + open verification request (+ app tokens). */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  await latency(500);
  requireOnline();
  if (!input.phone || !verifiedForRegister.has(input.phone)) {
    throw new FixtureError("INVALID_OTP");
  }
  if (mode === "suspended") throw new FixtureError("SUSPENDED");
  const user = demoUser({
    role: input.role,
    status: "PENDING",
    fullName: input.fullName,
    locale: input.locale,
    phone: input.phone,
    schoolId: input.schoolId,
  });
  const tokens = issueTokens();
  currentUser = user;
  currentTokens = tokens;
  openRequest = {
    id: `vr_demo_${String(sessionSeq)}`,
    user: { fullName: input.fullName, role: user.role, phoneMasked: user.maskedPhone },
    status: "PENDING",
    evidence:
      input.role === "guardian"
        ? { studentCode: input.studentCode, relation: input.relation }
        : undefined,
    createdAt: new Date().toISOString(),
    reminderCount: 0,
  };
  return { user, ...tokens, verificationRequest: openRequest };
}

/** POST /auth/login/password — enumeration-safe; app receives tokens. */
export async function loginPassword(input: PasswordLoginInput): Promise<PasswordLoginResult> {
  await latency(500);
  requireOnline();
  if (mode === "suspended") throw new FixtureError("SUSPENDED");
  if (input.password.length < 10) throw new FixtureError("UNAUTHENTICATED");
  const user = demoUser({
    role: "teacher",
    status: "VERIFIED",
    fullName: "ডেমো শিক্ষক",
    locale: "bn",
  });
  const tokens = issueTokens();
  currentUser = user;
  currentTokens = tokens;
  return { user, ...tokens };
}

/** GET /me — the cached account; UNAUTHENTICATED when signed out. */
export async function getMe(): Promise<User> {
  await latency(180);
  requireOnline();
  if (!currentUser) throw new FixtureError("UNAUTHENTICATED");
  return currentUser;
}

/** PATCH /me — display name and/or locale (role/status immutable). */
export async function patchMe(input: MeUpdateInput): Promise<User> {
  await latency();
  requireOnline();
  if (!currentUser) throw new FixtureError("UNAUTHENTICATED");
  currentUser = {
    ...currentUser,
    ...(input.locale ? { locale: input.locale } : {}),
    ...(input.fullName ? { fullName: input.fullName } : {}),
  };
  return currentUser;
}

/** The signed-in user's own join request (rejected reason + resubmit path — 05 §2.4). */
export async function getMyVerificationRequest(): Promise<VerificationRequestItem | null> {
  await latency(180);
  requireOnline();
  return currentUser ? openRequest : null;
}

/** POST /auth/logout — local clear always works; the server revoke retries once on reconnect. */
export async function logout(): Promise<void> {
  await latency(200);
  currentUser = null;
  currentTokens = null;
  openRequest = null;
}

/** POST /auth/logout-all — every session and family revoked (audited server-side). */
export async function logoutAll(): Promise<void> {
  await logout();
}

/** POST /auth/refresh — single-use rotation; replaying a revoked token revokes the whole family. */
export async function refreshTokens(input: RefreshInput): Promise<RefreshResult> {
  await latency(200);
  requireOnline();
  if (!currentTokens || input.refreshToken !== currentTokens.refreshToken) {
    // Reuse detection (INV-4 / BR-012): the family dies, both parties re-login.
    currentUser = null;
    currentTokens = null;
    openRequest = null;
    throw new FixtureError("UNAUTHENTICATED");
  }
  currentTokens = issueTokens();
  return currentTokens;
}

// ─── Hierarchy fixtures (owner requirement 2026-10-01 — master data typed from the spec) ─────
// Shapes mirror `GET /hierarchy/cities|cities/{id}/schools|schools/{id}/sections`: the page
// payload is scoped by the path, so the returned rows carry no parent ids — the fixture keeps
// them on its internal rows only to apply the scoping the real api does.

const CITIES: HierarchyCity[] = [
  { id: "city_dhaka", nameBn: "ঢাকা", nameEn: "Dhaka", isLaunchCity: true },
  { id: "city_chattogram", nameBn: "চট্টগ্রাম", nameEn: "Chattogram", isLaunchCity: false },
];

/** `HierarchySchool` + the scoping key the list endpoint takes as its path param. */
type SchoolRow = HierarchySchool & { cityId: string };

const SCHOOLS: SchoolRow[] = [
  {
    id: "school_demo_high",
    cityId: "city_dhaka",
    nameBn: "ডেমো উচ্চ বিদ্যালয়",
    nameEn: "Demo High School",
  },
  {
    id: "school_demo_model",
    cityId: "city_dhaka",
    nameBn: "নমুনা মডেল স্কুল",
    nameEn: "Sample Model School",
  },
  {
    id: "school_demo_college",
    cityId: "city_chattogram",
    nameBn: "ডেমো কলেজ",
    nameEn: "Demo College",
  },
  {
    id: "school_demo_public",
    cityId: "city_chattogram",
    nameBn: "ডেমো পাবলিক স্কুল",
    nameEn: "Demo Public School",
  },
];

/** `HierarchySection` + the scoping key the list endpoint takes as its path param. */
type SectionRow = HierarchySection & { schoolId: string };

const SECTIONS: SectionRow[] = [
  { id: "sec_6_a_demo_high", schoolId: "school_demo_high", classLevel: "6", name: "A", sessionYear: 2026 },
  { id: "sec_6_b_demo_high", schoolId: "school_demo_high", classLevel: "6", name: "B", sessionYear: 2026 },
  { id: "sec_9_a_demo_high", schoolId: "school_demo_high", classLevel: "9", name: "A", sessionYear: 2026 },
  { id: "sec_9_b_demo_high", schoolId: "school_demo_high", classLevel: "9", name: "B", sessionYear: 2026 },
  { id: "sec_10_a_demo_high", schoolId: "school_demo_high", classLevel: "10", name: "A", sessionYear: 2026 },
  { id: "sec_7_a_demo_model", schoolId: "school_demo_model", classLevel: "7", name: "A", sessionYear: 2026 },
  { id: "sec_8_b_demo_model", schoolId: "school_demo_model", classLevel: "8", name: "B", sessionYear: 2026 },
  { id: "sec_9_a_demo_college", schoolId: "school_demo_college", classLevel: "9", name: "A", sessionYear: 2026 },
  { id: "sec_6_a_demo_public", schoolId: "school_demo_public", classLevel: "6", name: "A", sessionYear: 2026 },
  { id: "sec_10_a_demo_public", schoolId: "school_demo_public", classLevel: "10", name: "A", sessionYear: 2026 },
  { id: "sec_10_b_demo_public", schoolId: "school_demo_public", classLevel: "10", name: "B", sessionYear: 2026 },
];

/** GET /hierarchy/cities — launch cities first (Dhaka opens the rollout). */
export async function listCities(): FixtureResult<HierarchyCity[]> {
  await latency(250);
  requireOnline();
  return [...CITIES].sort((a, b) => Number(b.isLaunchCity) - Number(a.isLaunchCity));
}

/** GET /hierarchy/cities/{cityId}/schools */
export async function listSchools(cityId: string): FixtureResult<HierarchySchool[]> {
  await latency(250);
  requireOnline();
  return SCHOOLS.filter((school) => school.cityId === cityId).map((school) => ({
    id: school.id,
    nameBn: school.nameBn,
    nameEn: school.nameEn,
  }));
}

/** GET /hierarchy/schools/{schoolId}/sections — the class dropdown derives from `classLevel`. */
export async function listSections(schoolId: string): FixtureResult<HierarchySection[]> {
  await latency(250);
  requireOnline();
  return SECTIONS.filter((section) => section.schoolId === schoolId).map((section) => ({
    id: section.id,
    classLevel: section.classLevel,
    name: section.name,
    sessionYear: section.sessionYear,
  }));
}

// ─── School requests (owner requirement 2026-10-01 — signup when the school is missing) ──────

let schoolRequestSeq = 0;

/**
 * POST /hierarchy/school-requests — queues the institution for the application admin, who
 * connects the POC to onboard it (approve/reject). The user cannot finish registration until
 * the institution exists; CONFLICT means a request for it is already in flight.
 */
export async function createSchoolRequest(
  input: SchoolRequestInput,
): FixtureResult<SchoolRequestCreated> {
  await latency(500);
  requireOnline();
  if (fixtureFlags.schoolRequest === "conflict") throw new FixtureError("CONFLICT");
  schoolRequestSeq += 1;
  return { id: `sr_demo_${String(schoolRequestSeq)}`, status: "PENDING" };
}

// ─── SSO fixtures (real OIDC via expo auth-session arrives with integration — 05 §2.5) ──────

export type SsoProvider = "google" | "github";
export type SsoIntent = "login" | "link";
export type SsoOutcome =
  | { outcome: "signed_in"; user: User; tokens: RefreshResult }
  | { outcome: "needs_registration"; provider: SsoProvider; email: string }
  | { outcome: "linked"; user: User };

/**
 * Simulates the provider round-trip the system browser would perform (`kusholconnect://` return;
 * Expo Go names it `exp+kushol-connect://`). SSO authenticates, never verifies (BR-006): a
 * provider-verified email matching an existing account links silently, a new one continues to
 * registration at the hierarchy step.
 */
export async function completeSsoReturn(input: {
  provider: SsoProvider;
  intent: SsoIntent;
}): Promise<SsoOutcome> {
  await latency(600);
  requireOnline();
  if (mode === "suspended") throw new FixtureError("SUSPENDED");
  if (input.intent === "link") {
    if (!currentUser) throw new FixtureError("UNAUTHENTICATED");
    return { outcome: "linked", user: currentUser };
  }
  if (!currentUser) {
    return { outcome: "needs_registration", provider: input.provider, email: "demo@gmail.com" };
  }
  const tokens = currentTokens ?? issueTokens();
  currentTokens = tokens;
  return { outcome: "signed_in", user: currentUser, tokens };
}

// ─── Device list (P1 — TODO(schema): no endpoint in the spec yet; interim local type) ───────

export type DeviceSession = {
  id: string;
  label: string;
  lastActiveAt: string;
  current: boolean;
};

let deviceSeq = 0;
let devices: DeviceSession[] = [deviceTemplate("current")];

function deviceTemplate(kind: "current" | "other"): DeviceSession {
  deviceSeq += 1;
  return {
    id: `device_demo_${String(deviceSeq)}`,
    label: kind === "current" ? "এই ডিভাইস (ডেমো)" : "ডেমো ট্যাবলেট",
    lastActiveAt: new Date().toISOString(),
    current: kind === "current",
  };
}

export async function getDevices(): Promise<DeviceSession[]> {
  await latency(200);
  requireOnline();
  if (!currentUser) throw new FixtureError("UNAUTHENTICATED");
  return devices;
}

/** Revokes one device's session (single-device revoke per row — IDT-US-012). */
export async function revokeDevice(deviceId: string): Promise<void> {
  await latency(200);
  requireOnline();
  if (!currentUser) throw new FixtureError("UNAUTHENTICATED");
  if (devices.find((d) => d.id === deviceId)?.current) {
    throw new FixtureError("CONFLICT");
  }
  devices = devices.filter((d) => d.id !== deviceId);
}
