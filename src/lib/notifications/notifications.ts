// Notifications client state (NTF-AP-002..009): channels, permission flow, registration,
// preferences, foreground banner, deep links. Stage 5: live sessions resolve the native FCM push
// token (expo-notifications `getDevicePushTokenAsync` — ADR-3) and subscribe to real foreground
// pushes; fixture sessions keep the simulated seam. All I/O goes through the backend selector.
import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";

import {
  isLiveSession,
  NOTIFICATION_CLASSES,
  ntfFixtureFlags,
  registerDevice,
  channelFor,
  type ForegroundPayload,
  type NotificationClass,
} from "@/lib/notifications/backend";
import { subscribeForeground } from "@/fixtures/notifications";
import { useAuthStore } from "@/lib/auth/auth-store";

// ─── NTF-AP-001 · Android channels (ONE per class, bn+en names — OQ-2) ────────────────────────

/** Registers the three channels at app start (Android only; iOS uses permission categories). */
export async function ensureNotificationChannels(locale: "bn" | "en"): Promise<void> {
  if (Platform.OS !== "android") return;
  for (const classId of NOTIFICATION_CLASSES) {
    const channel = channelFor(classId);
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: locale === "bn" ? channel.nameBn : channel.nameEn,
      importance:
        channel.importance === "HIGH"
          ? Notifications.AndroidImportance.HIGH
          : Notifications.AndroidImportance.DEFAULT,
      sound: channel.importance === "HIGH" ? "default" : undefined,
    });
  }
}

// ─── NTF-AP-003 · device registration (native FCM token; fixture token for demo sessions) ──────

/**
 * The registration token for this session: the native FCM/APNs push token from
 * `getDevicePushTokenAsync` when live (requires the owner-provided Firebase config — null and a
 * silent skip before it exists, §8 degraded), the demo token for fixture sessions.
 */
export async function resolveDeviceToken(): Promise<string | null> {
  if (!(await isLiveSession())) {
    const user = useAuthStore.getState().me;
    return user ? `fcm_demo_${user.id}` : null;
  }
  try {
    const push = await Notifications.getDevicePushTokenAsync();
    return typeof push.data === "string" && push.data.length > 0 ? push.data : null;
  } catch {
    // No Firebase config on this build (owner-provided google-services.json pending, gap G-6):
    // registration is skipped — in-app still works (NTF §7 edge 4).
    return null;
  }
}

/** Registers the device after sign-in; silent — push must never block or noisily fail. */
export async function registerCurrentDevice(locale: "bn" | "en"): Promise<void> {
  try {
    await ensureNotificationChannels(locale);
    const user = useAuthStore.getState().me;
    if (!user) return;
    const token = await resolveDeviceToken();
    if (!token) return;
    await registerDevice(
      {
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        appVersion: Constants.expoConfig?.version ?? "",
      },
      user.status === "VERIFIED",
    );
  } catch {
    // Degraded, never fatal (NTF §7): registration retries on next foreground.
  }
}

// ─── Stage 5 · foreground runtime (handler + live listener + heartbeat) ────────────────────────

let runtimeAttached = false;

/**
 * One-time push runtime (call from the root layout): foreground pushes render the in-app banner
 * only (no tray duplicate — 05 §2.3), live foreground pushes are mapped from payload schema v1,
 * and app-foreground heartbeats refresh `last_seen_at` (NTF-BE-001).
 */
export function attachNotificationsRuntime(locale: "bn" | "en"): void {
  if (runtimeAttached) return;
  runtimeAttached = true;

  void ensureNotificationChannels(locale);

  Notifications.setNotificationHandler({
    // Foreground: never a tray duplicate — the in-app banner renders instead (05 §2.3).
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
  });

  Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as {
      class?: string;
      key?: string;
      deepLink?: string;
      deliveryId?: string;
    };
    if (!data.class || !NOTIFICATION_CLASSES.includes(data.class as NotificationClass)) return;
    setBanner({
      deliveryId: data.deliveryId ?? "",
      class: data.class as NotificationClass,
      payloadKey: data.key ?? `notifications.${data.class === "chat" ? "dm_new" : `${data.class.slice(0, -1)}_new`}`,
      deepLink: data.deepLink ?? "/",
    });
  });

  // Foreground heartbeat: the idempotent upsert refreshes last_seen_at (NTF-BE-001).
  AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    void (async () => {
      if (!(await isLiveSession())) return;
      const token = await resolveDeviceToken();
      const user = useAuthStore.getState().me;
      if (!token || !user) return;
      await registerDevice(
        {
          token,
          platform: Platform.OS === "ios" ? "ios" : "android",
          appVersion: Constants.expoConfig?.version ?? "",
        },
        user.status === "VERIFIED",
      ).catch(() => undefined);
    })();
  });
}

/** Test-only: forget that the runtime was attached (jest). */
export function resetNotificationsRuntime(): void {
  runtimeAttached = false;
}

// ─── NTF-AP-007 · deep-link map (frozen contract — NTF-INT-007) ───────────────────────────────

export type DeepLink = { pathname: string; params: Record<string, string> } | null;

/**
 * Maps a push payload to a route (05-app §2.4 / NTF-US-004). Unknown types and missing ids fall
 * back to home — never a crash (edge #10). Module 10 adds the tuition routes (additive per
 * 06 §7: the map is additive only; unknown types keep falling back).
 */
export function deepLinkFor(payload: { payloadKey?: string; deepLink?: string }): DeepLink {
  const raw = payload.deepLink?.split("?")[0] ?? "";
  if (raw === "/marketplace/matches") return { pathname: "/marketplace/matches", params: {} };
  // Module 12 (additive per 06 §7): fee-due → pay screen; payment result → receipt.
  const invoiceMatch = raw.match(/^\/payments\/([\w-]+)$/);
  if (invoiceMatch) {
    return { pathname: "/payments/[invoiceId]", params: { invoiceId: invoiceMatch[1] ?? "" } };
  }
  const receiptMatch = raw.match(/^\/receipts\/([\w-]+)$/);
  if (receiptMatch) {
    return { pathname: "/receipts/[txnId]", params: { txnId: receiptMatch[1] ?? "" } };
  }
  // Module 11 (additive per 06 §7): order-status pushes land on the order screen.
  const orderMatch = raw.match(/^\/marketplace\/orders\/([\w-]+)$/);
  if (orderMatch) {
    return { pathname: "/marketplace/orders/[id]", params: { id: orderMatch[1] ?? "" } };
  }
  if (raw === "/marketplace/tutor-setup/evidence") {
    return { pathname: "/marketplace/tutor-setup/evidence", params: {} };
  }
  const match = raw.match(
    /^\/(notices|messages|groups|payments|tests|marketplace\/requirements|marketplace\/tutors)\/([\w-]+)$/,
  );
  if (!match) return null; // unknown → home fallback with the gentle message (edge #10)
  const kind = match[1] ?? "";
  const id = match[2] ?? "";
  if (kind === "notices") return { pathname: "/notices/[id]", params: { id } };
  if (kind === "messages") return { pathname: "/messages/[peerId]", params: { peerId: id } };
  if (kind === "groups") return { pathname: "/groups/[id]", params: { id } };
  if (kind === "marketplace/requirements") {
    return { pathname: "/marketplace/requirements/[id]", params: { id } };
  }
  if (kind === "marketplace/tutors") {
    return { pathname: "/marketplace/tutors/[id]", params: { id } };
  }
  return null; // payments/tests routes arrive with modules 10/08 — home fallback for now
}

// ─── NTF-AP-006 · foreground banner state ─────────────────────────────────────────────────────

// One banner at a time — the module-level current payload + subscriber.
let current: ForegroundPayload | null = null;
const bannerListeners = new Set<(payload: ForegroundPayload | null) => void>();

function setBanner(payload: ForegroundPayload | null): void {
  current = payload;
  for (const listener of bannerListeners) listener(payload);
}

/** The foreground banner state + actions (NTF-AP-006). */
export function useForegroundBanner(): {
  payload: ForegroundPayload | null;
  dismiss: () => void;
} {
  const [payload, setPayload] = useState<ForegroundPayload | null>(current);
  useEffect(() => {
    const unsubscribe = subscribeForeground((incoming) => {
      setPayload(incoming);
    });
    const listen = (incoming: ForegroundPayload | null) => {
      setPayload(incoming);
    };
    bannerListeners.add(listen);
    return () => {
      unsubscribe();
      bannerListeners.delete(listen);
    };
  }, []);
  const dismiss = () => {
    setBanner(null);
  };
  return { payload, dismiss };
}

/** Pushes one simulated foreground banner (dev switcher + Stage-2 review). */
export function pushDemoBanner(classId: NotificationClass = "notices"): void {
  setBanner({
    deliveryId: "dlv_demo_2",
    class: classId,
    payloadKey: classId === "chat" ? "notifications.dm_new" : "notifications.notice_new",
    deepLink: classId === "chat" ? "/messages/user_demo_karim" : "/notices/ntc_demo_1",
  });
}

export { ntfFixtureFlags };

/** Clears the banner singleton (tests). */
export function resetNotificationLib(): void {
  setBanner(null);
}
