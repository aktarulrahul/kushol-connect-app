// Live notifications client (Stage 5): every call goes through the generated openapi-fetch
// client (`liveAuth()`) — never hand-rolled fetch. Problem codes map to the same vocabulary the
// fixture seam uses, so the screens' error handling is backend-agnostic. `client` is injectable
// so unit tests never touch the network.
import { isProblem, type ApiClient } from "@/api/client";
import type {
  DeliveryPage,
  DevicePlatform,
  DeviceRegistered,
  NotificationClass,
  PreferenceRow,
} from "@/lib/notifications/model";

/** Same code strings as the fixture seam (`OFFLINE`, `NOT_FOUND`, `CONFLICT`, …). */
export class NotificationsApiError extends Error {
  constructor(readonly code: string) {
    super(`notifications api: ${code}`);
    this.name = "NotificationsApiError";
  }
}

type Client = Pick<ApiClient, "GET" | "POST" | "PATCH" | "DELETE">;

type Result<T> = { data?: T; error?: unknown; response: Response };

function err(code: string): NotificationsApiError {
  return new NotificationsApiError(code);
}

/**
 * Transport failures (fetch rejects — offline, DNS) surface as the seam's `OFFLINE` code; every
 * consumer already treats it as degraded, never fatal (NTF §8).
 */
async function call<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch {
    throw err("OFFLINE");
  }
}

function problemCode(error: unknown, response: Response): string {
  if (isProblem(error)) return error.code;
  return `HTTP_${String(response.status)}`;
}

/** Register (or refresh) this device's native FCM token — idempotent upsert (NTF-BR-002). */
export async function registerDeviceLive(
  input: { token: string; platform: DevicePlatform; appVersion?: string },
  client: Client,
): Promise<DeviceRegistered> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/notifications/devices", { body: input }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** Logout cleanup. 404 is treated as success — DELETE is idempotent (06 §6 seam table). */
export async function deleteDeviceLive(deviceId: string, client: Client): Promise<void> {
  const { error, response } = await call(() =>
    client.DELETE("/api/v1/notifications/devices/{deviceId}", {
      params: { path: { deviceId } },
    }),
  );
  if (response.ok) return;
  if (isProblem(error) && (error.code === "NOT_FOUND" || error.code === "TENANT_MISMATCH")) return;
  throw err(problemCode(error, response));
}

/** GET /notifications/preferences — always exactly the three rows (INV-5). */
export async function getPreferencesLive(client: Client): Promise<PreferenceRow[]> {
  const { data, error, response } = await call(() => client.GET("/api/v1/notifications/preferences"));
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** PATCH /notifications/preferences — single-class toggle (NTF-BR-004). */
export async function patchPreferenceLive(
  classId: NotificationClass,
  muted: boolean,
  client: Client,
): Promise<PreferenceRow[]> {
  const { data, error, response } = await call(() =>
    client.PATCH("/api/v1/notifications/preferences", {
      body: { class: classId, muted },
    }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}

/** GET /notifications/deliveries — own rows, newest first, paged. */
export async function listDeliveriesLive(
  page: number,
  pageSize: number,
  client: Client,
): Promise<DeliveryPage> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/notifications/deliveries", {
      params: { query: { page, pageSize } },
    }),
  );
  if (data) return data;
  throw err(problemCode(error, response));
}

/**
 * POST /notifications/deliveries/{id}/opened — write-once, idempotent (INV-6). `CONFLICT`
 * (topic rows, terminal failed) resolves silently per the 06 §6 seam contract.
 */
export async function markOpenedLive(deliveryId: string, client: Client): Promise<void> {
  const { error, response } = await call(() =>
    client.POST("/api/v1/notifications/deliveries/{deliveryId}/opened", {
      params: { path: { deliveryId } },
    }),
  );
  if (response.ok) return;
  if (isProblem(error) && error.code === "CONFLICT") return;
  throw err(problemCode(error, response));
}

/** POST /admin/notifications/test — pilot tooling; visibly marked type=test (NTF-BR-007). */
export async function sendTestPushLive(
  input: { class: NotificationClass; target: "self" | "section"; sectionId?: string },
  client: Client,
): Promise<{ deliveryIds: string[]; devices: number }> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/admin/notifications/test", { body: input }),
  );
  if (data) return data.data;
  throw err(problemCode(error, response));
}
