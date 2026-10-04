// Pure notifications model (06): classes, channel strategy, payload shapes. Typed from the
// OpenAPI spec — shared by the live client, the fixture seam and the screens. No I/O here.
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];

export type NotificationClass = Schemas["NotificationClass"];
export type PreferenceRow = Schemas["PreferenceRow"];
export type Delivery = Schemas["Delivery"];
export type DeliveryPage = Schemas["DeliveryPage"];
export type DevicePlatform = Schemas["DevicePlatform"];
export type DeviceRegistered = Schemas["DeviceRegistered"]["data"];

export const NOTIFICATION_CLASSES: NotificationClass[] = ["notices", "chat", "campaigns"];

const CHANNEL_COPY: Record<NotificationClass, { bn: string; en: string; importance: string }> = {
  notices: { bn: "নোটিশ", en: "Notices", importance: "HIGH" },
  chat: { bn: "চ্যাট", en: "Chat", importance: "HIGH" },
  campaigns: { bn: "ক্যাম্পেইন", en: "Campaigns", importance: "DEFAULT" },
};

/** Channel strategy (OQ-2): ONE channel per class, bn+en names, 1:1 with preferences. */
export function channelFor(classId: NotificationClass): {
  id: NotificationClass;
  nameBn: string;
  nameEn: string;
  importance: string;
} {
  const copy = CHANNEL_COPY[classId];
  return { id: classId, nameBn: copy.bn, nameEn: copy.en, importance: copy.importance };
}

/** The banner payload the screens render (built from push payload schema v1 — never bodies). */
export type ForegroundPayload = {
  deliveryId: string;
  class: NotificationClass;
  payloadKey: string;
  deepLink: string;
};
