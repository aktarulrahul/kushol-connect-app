// The tuition backend selector (Stage 5): one import surface for hooks/screens. A live session
// (real JWT in the token store) routes to the generated `openapi-fetch` client (`live.ts`);
// fixture sessions (`access_demo_*`, dev switcher, Maestro fixture mode) keep the Stage-2 seam —
// the same split as the notifications module's backend.ts.
import type { ApiClient } from "@/api/client";
import {
  browseTutors as browseTutorsFixture,
  createRequirement as createRequirementFixture,
  declineMatch as declineMatchFixture,
  expressInterest as expressInterestFixture,
  getMyTutorProfile as getMyTutorProfileFixture,
  getRequirementMatches as getRequirementMatchesFixture,
  getTutor as getTutorFixture,
  listMyMatches as listMyMatchesFixture,
  listMyRequirements as listMyRequirementsFixture,
  submitForReview as submitForReviewFixture,
  updateRequirement as updateRequirementFixture,
  upsertTutorProfile as upsertTutorProfileFixture,
  acceptMatch as acceptMatchFixture,
} from "@/fixtures/tuition";
import { isFixtureAccessToken } from "@/lib/auth/session-restore";
import { liveAuth } from "@/lib/auth/live-session";
import { tokenStore } from "@/lib/auth/token-store";
import {
  getRequirementMatchesLive,
  getTutorLive,
  listMyMatchesLive,
  listMyRequirementsLive,
  updateRequirementLive,
  upsertTutorProfileLive,
  submitForReviewLive,
  browseTutorsLive,
  acceptMatchLive,
  createRequirementLive,
  declineMatchLive,
  expressInterestLive,
  getMyTutorProfileLive,
} from "@/lib/tuition/live";
import type {
  PosterMatch,
  Requirement,
  RequirementInput,
  TutorCard,
  TutorMatch,
  TutorProfile,
  TuitionClassLevel,
  TuitionSubject,
} from "@/fixtures/tuition";

export type {
  Requirement,
  RequirementInput,
  TutorCard,
  TutorProfile,
  PosterMatch,
  TutorMatch,
  TuitionClassLevel,
  TuitionSubject,
};

function liveClient(): ApiClient {
  return liveAuth();
}

/** True when the stored session is a real api session (not the fixture demo login). */
export async function isLiveSession(
  store: Pick<typeof tokenStore, "get"> = tokenStore,
): Promise<boolean> {
  const tokens = await store.get();
  if (!tokens) return false;
  return !isFixtureAccessToken(tokens.accessToken);
}

export async function browseTutors(filters: {
  subject?: TuitionSubject;
  area?: string;
}): Promise<TutorCard[]> {
  if (await isLiveSession()) {
    return browseTutorsLive(filters, liveClient());
  }
  return browseTutorsFixture(filters);
}

export async function getTutor(id: string) {
  if (await isLiveSession()) {
    return getTutorLive(id, liveClient());
  }
  return getTutorFixture(id);
}

export async function listMyRequirements() {
  if (await isLiveSession()) {
    return listMyRequirementsLive(liveClient());
  }
  return listMyRequirementsFixture();
}

export async function getRequirementMatches(requirementId: string) {
  if (await isLiveSession()) {
    return getRequirementMatchesLive(requirementId, liveClient());
  }
  return getRequirementMatchesFixture(requirementId);
}

export async function listMyMatches() {
  if (await isLiveSession()) {
    return listMyMatchesLive(liveClient());
  }
  return listMyMatchesFixture();
}

export async function getMyTutorProfile() {
  if (await isLiveSession()) {
    return getMyTutorProfileLive(liveClient());
  }
  return getMyTutorProfileFixture();
}

export async function createRequirement(input: RequirementInput): Promise<Requirement> {
  if (await isLiveSession()) {
    return createRequirementLive(input, liveClient());
  }
  return createRequirementFixture(input);
}

export async function updateRequirement(
  id: string,
  patch: Partial<RequirementInput> & { close?: boolean },
): Promise<Requirement> {
  if (await isLiveSession()) {
    return updateRequirementLive(id, patch, liveClient());
  }
  return updateRequirementFixture(id, patch);
}

export async function expressInterest(matchId: string): Promise<void> {
  if (await isLiveSession()) {
    await expressInterestLive(matchId, liveClient());
    return;
  }
  await expressInterestFixture(matchId);
}

export async function acceptMatch(matchId: string) {
  if (await isLiveSession()) {
    return acceptMatchLive(matchId, liveClient());
  }
  return acceptMatchFixture(matchId);
}

export async function declineMatch(matchId: string): Promise<void> {
  if (await isLiveSession()) {
    await declineMatchLive(matchId, liveClient());
    return;
  }
  await declineMatchFixture(matchId);
}

export async function upsertTutorProfile(
  input: Parameters<typeof upsertTutorProfileFixture>[0],
): Promise<TutorProfile> {
  if (await isLiveSession()) {
    return upsertTutorProfileLive(input, liveClient());
  }
  return upsertTutorProfileFixture(input);
}

export async function submitForReview(
  input: Parameters<typeof submitForReviewFixture>[0],
): Promise<TutorProfile> {
  if (await isLiveSession()) {
    return submitForReviewLive(input, liveClient());
  }
  return submitForReviewFixture(input);
}
