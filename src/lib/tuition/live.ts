// Live tuition client (Stage 5): every call goes through the generated openapi-fetch client
// (`liveAuth()`). Problem codes map to the fixture seam's vocabulary so the screens' error
// handling is backend-agnostic; transport failures surface as `OFFLINE`. `client` is injectable
// so unit tests never touch the network.
import { isProblem, type ApiClient, type Schemas } from "@/api/client";

type Requirement = Schemas["TuitionRequirement"];
type RequirementInput = Schemas["TuitionRequirementInput"];
type TutorProfile = Schemas["TuitionTutorProfile"];
type TutorDetail = Schemas["TuitionTutorDetail"];
type TutorCard = Schemas["TuitionTutorCard"];
type TutorMatch = Schemas["TuitionTutorMatch"];
type TuitionContact = Schemas["TuitionContact"];
type TuitionChatHandle = Schemas["TuitionChatHandle"];
type TutorProfileInput = Schemas["TuitionTutorProfileInput"];
type SubmitForReviewInput = Schemas["TuitionSubmitForReviewInput"];

/** Same code strings as the fixture seam (`OFFLINE`, `NOT_FOUND`, `CONFLICT`, `NOT_VERIFIED`…). */
export class TuitionApiError extends Error {
  constructor(readonly code: string) {
    super(`tuition api: ${code}`);
    this.name = "TuitionApiError";
  }
}

type Client = Pick<ApiClient, "GET" | "POST" | "PATCH">;

type Result<T> = { data?: T; error?: unknown; response: Response };

function err(code: string): TuitionApiError {
  return new TuitionApiError(code);
}

async function call<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch {
    throw err("OFFLINE"); // degraded, never fatal (10 §8)
  }
}

function problemCode(error: unknown, response: Response): string {
  if (isProblem(error)) return error.code;
  return `HTTP_${String(response.status)}`;
}

/** GET /tuition/tutors — verified only (contract-locked); same shape as the fixture seam. */
export async function browseTutorsLive(
  filters: { subject?: Schemas["TuitionSubjectKey"]; area?: string },
  client: Client,
): Promise<TutorCard[]> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/tuition/tutors", {
      params: { query: { subject: filters.subject, area: filters.area } },
    }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** GET /tuition/tutors/{id} — public-safe; contact null unless an accepted match links us. */
export async function getTutorLive(
  id: string,
  client: Client,
): Promise<TutorDetail> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/tuition/tutors/{tutorId}", { params: { path: { tutorId: id } } }),
  );
  if (data) return data;
  throw err(problemCode(error, response));
}

/** GET /tuition/requirements — the poster's rows; same array shape as the fixture seam. */
export async function listMyRequirementsLive(client: Client): Promise<Requirement[]> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/tuition/requirements", { params: { query: { page: 1, pageSize: 20 } } }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** GET /tuition/requirements/{id}/matches — poster view; contact null until accepted (INV-4). */
export async function getRequirementMatchesLive(requirementId: string, client: Client) {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/tuition/requirements/{requirementId}/matches", {
      params: { path: { requirementId } },
    }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** GET /tuition/matches — the tutor-side list. */
export async function listMyMatchesLive(client: Client): Promise<TutorMatch[]> {
  const { data, error, response } = await call(() => client.GET("/api/v1/tuition/matches"));
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** GET /tuition/tutor-profile — the caller's tracker view (status, pending flag, note). */
export async function getMyTutorProfileLive(client: Client): Promise<TutorProfile> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/tuition/tutor-profile"),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** POST /tuition/requirements — verified gate server-side; expires_at is server-computed. */
export async function createRequirementLive(
  input: RequirementInput,
  client: Client,
): Promise<Requirement> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/tuition/requirements", { body: input }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** PATCH /tuition/requirements/{id} — edit while open, or `{close:true}` (CONFLICT otherwise). */
export async function updateRequirementLive(
  id: string,
  patch: Partial<RequirementInput> & { close?: boolean },
  client: Client,
): Promise<Requirement> {
  const { data, error, response } = await call(() =>
    client.PATCH("/api/v1/tuition/requirements/{requirementId}", {
      params: { path: { requirementId: id } },
      body: patch,
    }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** POST /tuition/matches/{id}/interest — notified → interested (CONFLICT on closed/expired). */
export async function expressInterestLive(matchId: string, client: Client): Promise<void> {
  const { error, response } = await call(() =>
    client.POST("/api/v1/tuition/matches/{matchId}/interest", { params: { path: { matchId } } }),
  );
  if (response.ok) return;
  throw err(problemCode(error, response));
}

/** POST /tuition/matches/{id}/accept — one-winner tx; contact + chat handle revealed. */
export async function acceptMatchLive(
  matchId: string,
  client: Client,
): Promise<{ contact: TuitionContact; chat: TuitionChatHandle | null }> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/tuition/matches/{matchId}/accept", { params: { path: { matchId } } }),
  );
  if (data) return { contact: data.data.contact, chat: data.data.chat ?? null };
  throw err(problemCode(error, response));
}

/** POST /tuition/matches/{id}/decline — either party; terminal states CONFLICT. */
export async function declineMatchLive(matchId: string, client: Client): Promise<void> {
  const { error, response } = await call(() =>
    client.POST("/api/v1/tuition/matches/{matchId}/decline", { params: { path: { matchId } } }),
  );
  if (response.ok) return;
  throw err(problemCode(error, response));
}

/** POST /tuition/tutor-profile — draft-safe upsert (one per user). */
export async function upsertTutorProfileLive(
  input: TutorProfileInput,
  client: Client,
): Promise<TutorProfile> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/tuition/tutor-profile", { body: input }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** POST /tuition/tutor-profile/submit-for-review — evidence complete; one pending per profile. */
export async function submitForReviewLive(
  input: SubmitForReviewInput,
  client: Client,
): Promise<TutorProfile> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/tuition/tutor-profile/submit-for-review", { body: input }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}
