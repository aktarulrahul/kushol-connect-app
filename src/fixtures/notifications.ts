// ─── THE STAGE-2 NOTIFICATIONS SEAM ───────────────────────────────────────────────────────────
// Fake I/O for fixture sessions (demo login, dev switcher, Maestro fixture mode). Live sessions
// go through `@/lib/notifications/backend` → the generated client; the pure model (types,
// classes, channels) lives in `@/lib/notifications/model` and is shared by both paths.
import { ChatFixtureError } from "@/fixtures/chat";
import {
  channelFor,
  NOTIFICATION_CLASSES,
  type Delivery,
  type DeliveryPage,
  type DevicePlatform,
  type DeviceRegistered,
  type ForegroundPayload,
  type NotificationClass,
  type PreferenceRow,
} from "@/lib/notifications/model";

export type { Delivery, DeliveryPage, DevicePlatform, DeviceRegistered, NotificationClass, PreferenceRow };
export { channelFor, NOTIFICATION_CLASSES };
export type { ForegroundPayload };

// ─── Flag switcher (demo/testing) ────────────────────────────────────────────────────────────

export const NTF_FIXTURE_MODES = [
  "success",
  "offline",
  "rate_limited",
  "not_found",
] as const;
export type NtfFixtureMode = (typeof NTF_FIXTURE_MODES)[number];

const listeners = new Set<(mode: NtfFixtureMode) => void>();
let mode: NtfFixtureMode = "success";

export const ntfFixtureFlags = {
  get mode(): NtfFixtureMode {
    return mode;
  },
  set(next: NtfFixtureMode): void {
    mode = next;
    for (const listener of listeners) listener(next);
  },
  reset(): void {
    mode = "success";
  },
  subscribe(listener: (mode: NtfFixtureMode) => void): () => void {
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

// ─── In-memory state ─────────────────────────────────────────────────────────────────────────

type DeviceRow = { id: string; platform: DevicePlatform; appVersion: string; lastSeenAt: string };

let deviceSeq = 0;
let devices: DeviceRow[] = [];
const prefs = new Map<NotificationClass, boolean>(NOTIFICATION_CLASSES.map((c) => [c, false]));
let deliverySeq = 0;

/** Demo deliveries covering every status for the history screen review. */
let deliveries: Delivery[] = [];

function seedDemoDeliveries(): void {
  const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
  deliveries = [
    {
      id: "dlv_demo_1", class: "notices", payloadKey: "notifications.notice_new",
      topicName: "school-school_demo_high", deepLink: "/notices/ntc_demo_1",
      status: "opened", sentAt: iso(300), openedAt: iso(298), createdAt: iso(300),
    },
    {
      id: "dlv_demo_2", class: "chat", payloadKey: "notifications.dm_new",
      deepLink: "/messages/user_demo_karim", status: "delivered",
      sentAt: iso(30), createdAt: iso(30),
    },
    {
      id: "dlv_demo_3", class: "campaigns", payloadKey: "notifications.campaign_new",
      topicName: "city-city_dhaka", deepLink: "/", status: "sent",
      sentAt: iso(60 * 26), createdAt: iso(60 * 26),
    },
  ];
}

// ─── Seam functions (typed from the spec) ─────────────────────────────────────────────────────

/**
 * POST /notifications/devices — idempotent upsert by token (NTF-BR-002); pending users register
 * fine but subscribe no topics until verification (NTF-BR-001 → topics.backfill).
 */
export async function registerDevice(input: {
  token: string;
  platform: DevicePlatform;
  appVersion?: string;
}, verified: boolean): Promise<DeviceRegistered> {
  await latency();
  requireOnline();
  if (!input.token || input.token.length > 4096 || /\s/.test(input.token)) {
    throw new ChatFixtureError("VALIDATION_FAILED");
  }
  const existing = devices.find((d) => d.id === input.token);
  const lastSeenAt = new Date().toISOString();
  if (existing) {
    existing.lastSeenAt = lastSeenAt;
    existing.appVersion = input.appVersion ?? existing.appVersion;
    return toRegistered(existing, verified);
  }
  deviceSeq += 1;
  const row: DeviceRow = {
    id: `ntf_dev_${String(deviceSeq)}`,
    platform: input.platform,
    appVersion: input.appVersion ?? "",
    lastSeenAt,
  };
  devices.push(row);
  return toRegistered(row, verified);
}

function toRegistered(row: DeviceRow, verified: boolean): DeviceRegistered {
  return {
    id: row.id,
    platform: row.platform,
    appVersion: row.appVersion,
    lastSeenAt: row.lastSeenAt,
    topics: verified ? ["school-school_demo_high", "city-city_dhaka", "section-sec_10_a_demo_high"] : [],
  };
}

/** DELETE /notifications/devices/{id} — logout cleanup; caller-owned rows only. */
export async function deleteDevice(deviceId: string): Promise<void> {
  await latency(200);
  requireOnline();
  if (mode === "not_found" || !devices.some((d) => d.id === deviceId)) {
    throw new ChatFixtureError("NOT_FOUND");
  }
  devices = devices.filter((d) => d.id !== deviceId);
}

/** GET /notifications/preferences — the three rows, lazy-created unmuted (INV-5). */
export async function getPreferences(): Promise<PreferenceRow[]> {
  await latency(180);
  requireOnline();
  return NOTIFICATION_CLASSES.map((classId) => ({ class: classId, muted: prefs.get(classId) ?? false }));
}

/** PATCH /notifications/preferences — single-class toggle (NTF-BR-004). */
export async function patchPreference(classId: NotificationClass, muted: boolean): Promise<PreferenceRow[]> {
  await latency(220);
  requireOnline();
  if (!NOTIFICATION_CLASSES.includes(classId)) {
    throw new ChatFixtureError("VALIDATION_FAILED");
  }
  prefs.set(classId, muted);
  return NOTIFICATION_CLASSES.map((c) => ({ class: c, muted: prefs.get(c) ?? false }));
}

/** GET /notifications/deliveries — the caller's rows, newest first, paged. */
export async function listDeliveries(page = 1, pageSize = 20): Promise<DeliveryPage> {
  await latency(220);
  requireOnline();
  const start = (page - 1) * pageSize;
  const data = deliveries.slice(start, start + pageSize).map((d) => ({ ...d }));
  return { data, page: { number: page, size: pageSize, total: deliveries.length } };
}

/** POST /notifications/deliveries/{id}/opened — write-once, idempotent (INV-6). */
export async function markOpened(deliveryId: string): Promise<void> {
  await Promise.resolve();
  requireOnline();
  const row = deliveries.find((d) => d.id === deliveryId);
  if (!row) throw new ChatFixtureError("NOT_FOUND");
  if (row.topicName) throw new ChatFixtureError("CONFLICT"); // topic rows are fire-and-forget
  if (!row.openedAt) row.openedAt = new Date().toISOString();
  row.status = "opened";
}

/** POST /admin/notifications/test — pilot tooling (visible type=test, rate-limited). */
export async function sendTestPush(input: {
  class: NotificationClass;
  target: "self" | "section";
  sectionId?: string;
}): Promise<{ deliveryIds: string[]; devices: number }> {
  await latency(400);
  requireOnline();
  if (mode === "rate_limited") throw new ChatFixtureError("RATE_LIMITED");
  if (input.target === "section" && !input.sectionId) {
    throw new ChatFixtureError("VALIDATION_FAILED");
  }
  const deliveryIds = [`dlv_demo_${String(++deliverySeq + 3)}`, `dlv_demo_${String(++deliverySeq + 3)}`];
  return { deliveryIds, devices: input.target === "self" ? 1 : 38 };
}

/** Simulates a foreground push arriving (the banner review path, NTF-AP-006). */
export function simulateForegroundPush(payload: {
  deliveryId: string;
  class: NotificationClass;
  payloadKey: string;
  deepLink: string;
}): void {
  for (const listener of foregroundListeners) listener(payload);
}

const foregroundListeners = new Set<(payload: ForegroundPayload) => void>();
/** Subscribe to simulated foreground pushes (the banner binds this in Stage 2). */
export function subscribeForeground(listener: (payload: ForegroundPayload) => void): () => void {
  foregroundListeners.add(listener);
  return () => {
    foregroundListeners.delete(listener);
  };
}

/** Clears mutable seam state (tests only). */
export function resetNotificationFixtures(): void {
  mode = "success";
  devices = [];
  deliverySeq = 0;
  prefs.clear();
  NOTIFICATION_CLASSES.forEach((c) => prefs.set(c, false));
  seedDemoDeliveries();
}

// Seed on import so the history screen always has reviewable rows.
seedDemoDeliveries();
