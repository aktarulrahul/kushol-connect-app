// The notifications backend selector (Stage 5): one import surface for every consumer. A live
// session (real JWT in the token store) goes through the generated client (`live.ts`); a fixture
// session (`access_demo_*`, dev switcher, Maestro fixture mode) keeps the Stage-2 fixtures. This
// is the only file screens/lib import — swapping a call site means changing nothing hereafter.
import type { ApiClient } from "@/api/client";
import {
  deleteDevice as deleteDeviceFixture,
  getPreferences as getPreferencesFixture,
  listDeliveries as listDeliveriesFixture,
  markOpened as markOpenedFixture,
  ntfFixtureFlags,
  patchPreference as patchPreferenceFixture,
  registerDevice as registerDeviceFixture,
  sendTestPush as sendTestPushFixture,
} from "@/fixtures/notifications";
import { isFixtureAccessToken } from "@/lib/auth/session-restore";
import { liveAuth } from "@/lib/auth/live-session";
import { tokenStore } from "@/lib/auth/token-store";
import {
  deleteDeviceLive,
  getPreferencesLive,
  listDeliveriesLive,
  markOpenedLive,
  patchPreferenceLive,
  registerDeviceLive,
  sendTestPushLive,
} from "@/lib/notifications/live";
import {
  channelFor,
  NOTIFICATION_CLASSES,
  type DeliveryPage,
  type DevicePlatform,
  type DeviceRegistered,
  type ForegroundPayload,
  type NotificationClass,
  type PreferenceRow,
} from "@/lib/notifications/model";

export { channelFor, NOTIFICATION_CLASSES, ntfFixtureFlags };
export type {
  DeliveryPage,
  DevicePlatform,
  DeviceRegistered,
  ForegroundPayload,
  NotificationClass,
  PreferenceRow,
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

export async function registerDevice(
  input: { token: string; platform: DevicePlatform; appVersion?: string },
  verified: boolean,
): Promise<DeviceRegistered> {
  if (await isLiveSession()) {
    return registerDeviceLive(input, liveClient());
  }
  return registerDeviceFixture(input, verified);
}

export async function deleteDevice(deviceId: string): Promise<void> {
  if (await isLiveSession()) {
    await deleteDeviceLive(deviceId, liveClient());
    return;
  }
  await deleteDeviceFixture(deviceId);
}

export async function getPreferences(): Promise<PreferenceRow[]> {
  if (await isLiveSession()) {
    return getPreferencesLive(liveClient());
  }
  return getPreferencesFixture();
}

export async function patchPreference(
  classId: NotificationClass,
  muted: boolean,
): Promise<PreferenceRow[]> {
  if (await isLiveSession()) {
    return patchPreferenceLive(classId, muted, liveClient());
  }
  return patchPreferenceFixture(classId, muted);
}

export async function listDeliveries(page = 1, pageSize = 20): Promise<DeliveryPage> {
  if (await isLiveSession()) {
    return listDeliveriesLive(page, pageSize, liveClient());
  }
  return listDeliveriesFixture(page, pageSize);
}

export async function markOpened(deliveryId: string): Promise<void> {
  if (await isLiveSession()) {
    await markOpenedLive(deliveryId, liveClient());
    return;
  }
  await markOpenedFixture(deliveryId);
}

export async function sendTestPush(input: {
  class: NotificationClass;
  target: "self" | "section";
  sectionId?: string;
}): Promise<{ deliveryIds: string[]; devices: number }> {
  if (await isLiveSession()) {
    return sendTestPushLive(input, liveClient());
  }
  return sendTestPushFixture(input);
}
