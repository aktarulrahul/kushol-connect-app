// ─── THE STAGE-2 TUITION SEAM (app) ───────────────────────────────────────────────────────────
// Every marketplace call imports from this file ONLY (one-file swap onto the generated client in
// Stage 5 — same story as auth/chat/notifications). Types from the generated spec; behaviour
// clearly fake; all demo data fictional ("ডেমো", prompt.txt §12).
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];

export type TuitionSubject = Schemas["TuitionSubjectKey"];
export type TuitionClassLevel = Schemas["TuitionClassLevel"];
export type GenderPref = Schemas["TuitionGenderPref"];
export type RequirementStatus = Schemas["TuitionRequirementStatus"];
export type TutorStatus = Schemas["TuitionTutorStatus"];
export type MatchStatus = Schemas["TuitionMatchStatus"];
export type Requirement = Schemas["TuitionRequirement"];
export type RequirementInput = Schemas["TuitionRequirementInput"];
export type TutorCard = Schemas["TuitionTutorCard"];
export type TutorDetail = Schemas["TuitionTutorDetail"];
export type TutorProfile = Schemas["TuitionTutorProfile"];
export type PosterMatch = Schemas["TuitionPosterMatch"];
export type TutorMatch = Schemas["TuitionTutorMatch"];
export type ChatHandle = Schemas["TuitionChatHandle"];

import { ChatFixtureError } from "@/fixtures/chat";

// ─── Flag switcher (dev/testing) ──────────────────────────────────────────────────────────────

export const TUITION_FIXTURE_MODES = [
  "success",
  "offline",
  "not_verified",
  "conflict",
] as const;
export type TuitionFixtureMode = (typeof TUITION_FIXTURE_MODES)[number];

const listeners = new Set<(mode: TuitionFixtureMode) => void>();
let mode: TuitionFixtureMode = "success";

function setMode(next: TuitionFixtureMode): void {
  mode = next;
  for (const listener of listeners) listener(next);
}

export const tuitionFixtureFlags = {
  get mode(): TuitionFixtureMode {
    return mode;
  },
  set mode(next: TuitionFixtureMode) {
    setMode(next);
  },
  set(next: TuitionFixtureMode): void {
    setMode(next);
  },
  reset(): void {
    setMode("success");
    requirements = seedRequirements();
    matchesByRequirement = new Map(seedMatches());
    myMatches = seedMyMatches();
    myProfileStatus = "verified";
  },
  subscribe(listener: (mode: TuitionFixtureMode) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

const latency = async (base = 250): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, base + Math.random() * base));
};

function requireOnline(): void {
  if (mode === "offline") throw new ChatFixtureError("OFFLINE");
}

function requireVerified(): void {
  if (mode === "not_verified") throw new ChatFixtureError("NOT_VERIFIED");
}

// ─── Shared catalogs (bn-first; the api validates against the same keys) ──────────────────────

export const SUBJECTS: TuitionSubject[] = [
  "math",
  "physics",
  "chemistry",
  "biology",
  "english",
  "bangla",
  "higher_math",
  "ict",
];
export const CLASS_LEVELS: TuitionClassLevel[] = [
  "class_6",
  "class_7",
  "class_8",
  "class_9",
  "class_10",
  "ssc",
  "hsc",
];

// ─── In-memory state (fictional Demo High School data) ────────────────────────────────────────

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

const TUTOR_CARDS: TutorCard[] = [
  {
    id: "tut_demo_1",
    name: "তানভীর হাসান (ডেমো)",
    university: "ঢাকা ডেমো বিশ্ববিদ্যালয়",
    subjects: ["math", "physics"],
    classesTaught: ["class_9", "ssc"],
    hourlyRateHint: 300,
    locationArea: "মিরপুর, ঢাকা",
    verifiedAt: iso(30),
  },
  {
    id: "tut_demo_2",
    name: "সাদিয়া রহমান (ডেমো)",
    university: "চট্টগ্রাম ডেমো বিশ্ববিদ্যালয়",
    subjects: ["chemistry", "biology"],
    classesTaught: ["class_8", "class_9"],
    hourlyRateHint: 350,
    locationArea: "আগ্রাবাদ, চট্টগ্রাম",
    verifiedAt: iso(20),
  },
  {
    id: "tut_demo_3",
    name: "মেহেদী হাসান (ডেমো)",
    university: "খুলনা ডেমো বিশ্ববিদ্যালয়",
    subjects: ["higher_math", "physics"],
    classesTaught: ["hsc"],
    hourlyRateHint: 500,
    locationArea: "সোনাডাঙ্গা, খুলনা",
    verifiedAt: iso(10),
  },
];

const TUTOR_DETAIL: TutorDetail = {
  id: "tut_demo_1",
  name: "তানভীর হাসান (ডেমো)",
  university: "ঢাকা ডেমো বিশ্ববিদ্যালয়",
  subjects: ["math", "physics"],
  classesTaught: ["class_9", "ssc"],
  bioBn: "৫ বছরের টিউশন অভিজ্ঞতা — গণিত ও পদার্থবিজ্ঞানে ভীতি দূর করা-ই আমার শুরু।",
  hourlyRateHint: 300,
  availability: "শনি–বৃহস্পতি, বিকাল ৪টা–রাত ৮টা",
  locationArea: "মিরপুর, ঢাকা",
  verifiedAt: iso(30),
  contact: null,
};

let requirementSeq = 0;
function seedRequirements(): Requirement[] {
  return [
    {
      id: "req_demo_1",
      posterRole: "guardian",
      subjects: ["math"],
      classLevel: "class_9",
      budgetMin: 2000,
      budgetMax: 4000,
      genderPref: "female",
      locationArea: "মিরপুর, ঢাকা",
      lat: 23.8068,
      lng: 90.3667,
      scheduleNote: "বিকাল ৫টা–সন্ধ্যা ৭টা",
      status: "open",
      interestedCount: 1,
      expiresAt: daysAhead(11),
      createdAt: iso(3),
    },
    {
      id: "req_demo_2",
      posterRole: "guardian",
      subjects: ["english"],
      classLevel: "class_6",
      budgetMin: 1500,
      budgetMax: 2500,
      genderPref: "any",
      locationArea: "উত্তরা, ঢাকা",
      lat: 23.8709,
      lng: 90.3984,
      status: "open",
      interestedCount: 0,
      expiresAt: daysAhead(2),
      createdAt: iso(12),
    },
  ];
}

let requirements: Requirement[] = seedRequirements();

const MATCH_TUTOR: PosterMatch["tutor"] = {
  profileId: "tut_demo_1",
  name: "তানভীর হাসান (ডেমো)",
  university: "ঢাকা ডেমো বিশ্ববিদ্যালয়",
  subjects: ["math", "physics"],
  hourlyRateHint: 300,
};

const REQUIREMENT_SUMMARY: TutorMatch["requirement"] = {
  subjects: ["math"],
  classLevel: "class_9",
  budgetMin: 2000,
  budgetMax: 4000,
  genderPref: "female",
  locationArea: "মিরপুর, ঢাকা",
  scheduleNote: "বিকাল ৫টা–সন্ধ্যা ৭টা",
};

type PosterMatches = PosterMatch[];
let matchesByRequirement = new Map<string, PosterMatches>([
  [
    "req_demo_1",
    [
      {
        id: "mtc_demo_1",
        status: "interested",
        notifiedAt: iso(3),
        respondedAt: iso(2),
        tutor: MATCH_TUTOR,
        contact: null,
      },
    ],
  ],
]);

function seedMatches(): [string, PosterMatches][] {
  return [
    [
      "req_demo_1",
      [
        {
          id: "mtc_demo_1",
          status: "interested",
          notifiedAt: iso(3),
          respondedAt: iso(2),
          tutor: MATCH_TUTOR,
          contact: null,
        },
      ],
    ],
  ];
}

let myMatches: TutorMatch[] = [
  {
    id: "mtc_demo_10",
    status: "notified",
    notifiedAt: iso(1),
    requirement: REQUIREMENT_SUMMARY,
    contact: null,
  },
];

function seedMyMatches(): TutorMatch[] {
  return [
    {
      id: "mtc_demo_10",
      status: "notified",
      notifiedAt: iso(1),
      requirement: REQUIREMENT_SUMMARY,
      contact: null,
    },
  ];
}

let myProfileStatus: TutorStatus = "verified";

/** The guardian's contact revealed to the accepted tutor (INV-4 — fixture value is fictional). */
const GUARDIAN_CONTACT = { phone: "+8801XXXXXXXXX" };

// ─── Seam functions (typed from the spec) ─────────────────────────────────────────────────────

/** GET /tuition/tutors — verified only; verified chip is locked ON (TUT-BR-002). */
export async function browseTutors(filters: {
  subject?: TuitionSubject;
  area?: string;
}): Promise<TutorCard[]> {
  await latency(220);
  requireOnline();
  return TUTOR_CARDS.filter(
    (t) =>
      (!filters.subject || t.subjects.includes(filters.subject)) &&
      (!filters.area || t.locationArea?.includes(filters.area)),
  ).map((t) => ({ ...t }));
}

/** GET /tuition/tutors/{id} — public-safe; contact null unless the caller shares an accepted match. */
export async function getTutor(id: string): Promise<TutorDetail> {
  await latency(200);
  requireOnline();
  const card = TUTOR_CARDS.find((t) => t.id === id);
  if (!card) throw new ChatFixtureError("NOT_FOUND");
  const accepted = [...matchesByRequirement.values()].flat().some(
    (m) => m.tutor.profileId === id && m.status === "accepted",
  );
  return { ...TUTOR_DETAIL, id: card.id, name: card.name, contact: accepted ? { phone: "+8801XXXXXXXXX" } : null };
}

/** POST /tuition/requirements — verified gate; expires_at = now + 14d; enqueue match job. */
export async function createRequirement(input: RequirementInput): Promise<Requirement> {
  await latency(350);
  requireOnline();
  requireVerified();
  requirementSeq += 1;
  const row: Requirement = {
    id: `req_demo_new_${String(requirementSeq)}`,
    posterRole: "guardian",
    ...input,
    status: "open",
    interestedCount: 0,
    expiresAt: daysAhead(14),
    createdAt: new Date().toISOString(),
  };
  requirements = [row, ...requirements];
  return { ...row };
}

/** GET /tuition/requirements — the poster's own rows (newest first). */
export async function listMyRequirements(): Promise<Requirement[]> {
  await latency(220);
  requireOnline();
  return requirements.map((r) => ({ ...r }));
}

/** PATCH /tuition/requirements/{id} — edit while open, or close. */
export async function updateRequirement(
  id: string,
  patch: Partial<RequirementInput> & { close?: boolean },
): Promise<Requirement> {
  await latency(280);
  requireOnline();
  const row = requirements.find((r) => r.id === id);
  if (!row) throw new ChatFixtureError("NOT_FOUND");
  if (mode === "conflict" || row.status !== "open") throw new ChatFixtureError("CONFLICT");
  if (patch.close) {
    row.status = "closed";
    return { ...row };
  }
  const edits = { ...patch };
  delete edits.close;
  Object.assign(row, edits);
  return { ...row };
}

/** GET /tuition/requirements/{id}/matches — poster view; contact null until accepted (INV-4). */
export async function getRequirementMatches(requirementId: string): Promise<PosterMatch[]> {
  await latency(220);
  requireOnline();
  const rows = matchesByRequirement.get(requirementId) ?? [];
  return rows.map((m) => ({
    ...m,
    tutor: { ...m.tutor },
    contact:
      m.status === "accepted"
        ? { phone: "+8801XXXXXXXXX" }
        : null,
  }));
}

/** GET /tuition/matches — the tutor side: incoming matches + tracker. */
export async function listMyMatches(): Promise<TutorMatch[]> {
  await latency(220);
  requireOnline();
  return myMatches.map((m) => ({
    ...m,
    requirement: { ...m.requirement },
    contact: m.status === "accepted" ? GUARDIAN_CONTACT : null,
  }));
}

/** POST /tuition/matches/{id}/interest — notified → interested; refused offline (§8). */
export async function expressInterest(matchId: string): Promise<void> {
  await latency(240);
  requireOnline();
  requireVerified();
  const match = myMatches.find((m) => m.id === matchId);
  if (!match) throw new ChatFixtureError("NOT_FOUND");
  if (mode === "conflict" || match.status !== "notified") throw new ChatFixtureError("CONFLICT");
  match.status = "interested";
  match.respondedAt = new Date().toISOString();
}

/** POST /tuition/matches/{id}/accept — one-winner tx; contact + chat handle revealed. */
export async function acceptMatch(
  matchId: string,
): Promise<{ contact: { phone: string }; chat: ChatHandle }> {
  await latency(320);
  requireOnline();
  requireVerified();
  for (const [reqId, rows] of matchesByRequirement) {
    const match = rows.find((m) => m.id === matchId);
    if (!match) continue;
    if (mode === "conflict" || match.status !== "interested") throw new ChatFixtureError("CONFLICT");
    match.status = "accepted";
    match.respondedAt = new Date().toISOString();
    match.contact = GUARDIAN_CONTACT;
    match.chat = { dmGroupId: "grp_demo_dm_1" };
    const requirement = requirements.find((r) => r.id === reqId);
    if (requirement) requirement.status = "matched";
    return { contact: GUARDIAN_CONTACT, chat: match.chat };
  }
  const mine = myMatches.find((m) => m.id === matchId);
  if (!mine) throw new ChatFixtureError("NOT_FOUND");
  if (mine.status !== "interested") throw new ChatFixtureError("CONFLICT");
  mine.status = "accepted";
  mine.respondedAt = new Date().toISOString();
  mine.contact = GUARDIAN_CONTACT;
  mine.chat = { dmGroupId: "grp_demo_dm_1" };
  return { contact: GUARDIAN_CONTACT, chat: mine.chat };
}

/** POST /tuition/matches/{id}/decline — either party; counterpart notified politely. */
export async function declineMatch(matchId: string): Promise<void> {
  await latency(220);
  requireOnline();
  for (const rows of matchesByRequirement.values()) {
    const match = rows.find((m) => m.id === matchId);
    if (match) {
      if (match.status === "accepted" || match.status === "declined" || match.status === "expired") {
        throw new ChatFixtureError("CONFLICT");
      }
      match.status = "declined";
      match.respondedAt = new Date().toISOString();
      return;
    }
  }
  const mine = myMatches.find((m) => m.id === matchId);
  if (!mine) throw new ChatFixtureError("NOT_FOUND");
  if (mine.status === "accepted" || mine.status === "declined" || mine.status === "expired") {
    throw new ChatFixtureError("CONFLICT");
  }
  mine.status = "declined";
  mine.respondedAt = new Date().toISOString();
}

/** POST /tuition/tutor-profile — draft-safe upsert (one per user). */
export async function upsertTutorProfile(
  input: Schemas["TuitionTutorProfileInput"],
): Promise<TutorProfile> {
  await latency(300);
  requireOnline();
  requireVerified();
  return {
    id: "tut_demo_mine",
    status: myProfileStatus === "verified" ? "verified" : "draft",
    ...input,
    hasPendingReview: myProfileStatus === "pending_review",
    rejectionNote: myProfileStatus === "rejected" ? "জাতীয় পরিচয়পত্রের ছবি অস্পষ্ট (ডেমো)" : undefined,
    verifiedAt: myProfileStatus === "verified" ? iso(30) : undefined,
  };
}

/** POST /tuition/tutor-profile/submit-for-review — evidence complete; one pending per profile. */
export async function submitForReview(
  input: Schemas["TuitionSubmitForReviewInput"],
): Promise<TutorProfile> {
  await latency(320);
  requireOnline();
  requireVerified();
  if (input.evidenceMediaIds.length < 1) throw new ChatFixtureError("VALIDATION_FAILED");
  if (myProfileStatus === "pending_review") throw new ChatFixtureError("CONFLICT");
  myProfileStatus = "pending_review";
  return {
    id: "tut_demo_mine",
    status: "pending_review",
    university: "ঢাকা ডেমো বিশ্ববিদ্যালয়",
    subjects: ["math"],
    classesTaught: ["ssc"],
    hasPendingReview: true,
  };
}

/** GET /tuition/tutor-profile (own tracker view) — fixture adds the review-tracker state. */
export async function getMyTutorProfile(): Promise<TutorProfile> {
  await latency(200);
  requireOnline();
  return {
    id: "tut_demo_mine",
    status: myProfileStatus,
    university: "ঢাকা ডেমো বিশ্ববিদ্যালয়",
    subjects: ["math"],
    classesTaught: ["ssc"],
    hasPendingReview: myProfileStatus === "pending_review",
    rejectionNote: myProfileStatus === "rejected" ? "জাতীয় পরিচয়পত্রের ছবি অস্পষ্ট (ডেমো)" : undefined,
    verifiedAt: myProfileStatus === "verified" ? iso(30) : undefined,
  };
}

/** Clears mutable seam state (tests). */
export function resetTuitionAppFixtures(): void {
  setMode("success");
  requirementSeq = 0;
  requirements = seedRequirements();
  matchesByRequirement = new Map(seedMatches());
  myMatches = seedMyMatches();
  myProfileStatus = "verified";
}
