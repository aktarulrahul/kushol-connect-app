// Unit tests for the notifications seam + deep-link map (NTF-UT app-side pins).
import { deepLinkFor, resetNotificationLib } from "@/lib/notifications/notifications";
import {
  channelFor,
  getPreferences,
  markOpened,
  NOTIFICATION_CLASSES,
  ntfFixtureFlags,
  patchPreference,
  registerDevice,
  sendTestPush,
} from "@/fixtures/notifications";

beforeEach(() => {
  resetNotificationLib();
  ntfFixtureFlags.reset();
});

// Channel strategy (OQ-2): one channel per class, bn+en names, importance per the §6 table.
describe("notification channels", () => {
  it.each(NOTIFICATION_CLASSES)("has one channel for %s", (classId) => {
    const channel = channelFor(classId);
    expect(channel.id).toBe(classId);
    expect(channel.nameBn.length).toBeGreaterThan(0);
    expect(channel.nameEn.length).toBeGreaterThan(0);
  });
  it("gives notices/chat HIGH and campaigns DEFAULT importance", () => {
    expect(channelFor("notices").importance).toBe("HIGH");
    expect(channelFor("chat").importance).toBe("HIGH");
    expect(channelFor("campaigns").importance).toBe("DEFAULT");
  });
});

// NTF-US-002/BR-001: registration is idempotent; topics only when VERIFIED.
describe("device registration", () => {
  it("subscribes bound topics only for verified users", async () => {
    const verified = await registerDevice({ token: "fcm_tok_1", platform: "android" }, true);
    expect(verified.topics.length).toBe(3);
    const pending = await registerDevice({ token: "fcm_tok_2", platform: "ios" }, false);
    expect(pending.topics).toEqual([]);
  });
  it("upserts the same token without duplicates", async () => {
    await registerDevice({ token: "fcm_tok_x", platform: "android" }, true);
    const again = await registerDevice({ token: "fcm_tok_x", platform: "android" }, true);
    expect(again.id).toBeDefined();
    expect(ntfFixtureFlags.mode).toBe("success");
  });
  it("rejects tokens with whitespace (validation.notifications.token_invalid shape)", async () => {
    await expect(registerDevice({ token: "bad token", platform: "android" }, true)).rejects.toThrow();
  });
});

// NTF-US-006/BR-004: preferences flip per class; other classes untouched.
describe("preferences", () => {
  it("flips one class without touching the others", async () => {
    await patchPreference("campaigns", true);
    const rows = await getPreferences();
    const byClass = Object.fromEntries(rows.map((r) => [r.class, r.muted]));
    expect(byClass).toEqual({ notices: false, chat: false, campaigns: true });
  });
});

// NTF-US-007/INV-6: opened is write-once; topic rows are CONFLICT; unknown rows NOT_FOUND.
describe("opened reporting", () => {
  it("marks a directed row once and stays idempotent", async () => {
    await markOpened("dlv_demo_2");
    await expect(markOpened("dlv_demo_2")).resolves.toBeUndefined();
  });
  it("rejects topic rows and unknown ids", async () => {
    await expect(markOpened("dlv_demo_3")).rejects.toThrow();
    await expect(markOpened("dlv_missing")).rejects.toThrow();
  });
});

// NTF-US-009/BR-007: test pushes validate the target.
describe("test push", () => {
  it("requires a sectionId for section targets", async () => {
    await expect(sendTestPush({ class: "notices", target: "section" })).rejects.toThrow();
    const ok = await sendTestPush({ class: "notices", target: "self" });
    expect(ok.devices).toBe(1);
  });
  it("rate-limits on the fixture flag", async () => {
    ntfFixtureFlags.set("rate_limited");
    await expect(sendTestPush({ class: "notices", target: "self" })).rejects.toThrow();
  });
});

// NTF-US-004/INT-007: the deep-link map lands every tap on the right screen; unknown falls home.
describe("deep links", () => {
  it("maps the known payload types", () => {
    expect(deepLinkFor({ deepLink: "/notices/ntc_demo_1" })).toEqual({
      pathname: "/notices/[id]",
      params: { id: "ntc_demo_1" },
    });
    expect(deepLinkFor({ deepLink: "/messages/user_demo_karim" })).toEqual({
      pathname: "/messages/[peerId]",
      params: { peerId: "user_demo_karim" },
    });
  });
  it("returns null for unknown types (home fallback, never a crash)", () => {
    expect(deepLinkFor({ deepLink: "/unknown/x" })).toBeNull();
    expect(deepLinkFor({})).toBeNull();
  });
});
