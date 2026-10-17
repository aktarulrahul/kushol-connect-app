import type { ChatGroup } from "@/fixtures/chat";
import { forwardTargets } from "@/components/chat/forward-sheet";

import { mapEvent, toReceipt } from "./live-chat";
import { forwardLabelKey, forwardLimit, isoAtOrBefore, receiptState } from "./receipts";

// 05 · 2026-10-17 — WhatsApp receipts (sent → delivered → seen), forward rules, the live
// receipt / delivered mapping and the forward target list.

describe("isoAtOrBefore", () => {
  it("orders variable-length fractions by time, not by string", () => {
    // String order says ".1234Z" > ".123456Z"; in time it is earlier.
    expect(isoAtOrBefore("2026-10-17T09:00:00.1234Z", "2026-10-17T09:00:00.123456Z")).toBe(true);
    expect(isoAtOrBefore("2026-10-17T09:00:00.123457Z", "2026-10-17T09:00:00.123456Z")).toBe(false);
    expect(isoAtOrBefore("2026-10-17T15:00:00+06:00", "2026-10-17T09:00:00Z")).toBe(true);
    expect(isoAtOrBefore("garbage", "2026-10-17T09:00:00Z")).toBe(false);
  });
});

describe("receiptState", () => {
  const at = "2026-10-17T09:00:00.5Z";
  it("climbs sent → delivered → seen with the history horizons", () => {
    expect(receiptState(at)).toBe("sent");
    expect(receiptState(at, undefined, "2026-10-17T09:00:01Z")).toBe("delivered");
    expect(receiptState(at, "2026-10-17T09:00:01Z", "2026-10-17T09:00:01Z")).toBe("seen");
    expect(receiptState(at, "2026-10-17T08:00:00Z", "2026-10-17T08:00:00Z")).toBe("sent");
  });
});

describe("forward rules", () => {
  it("labels forwarded copies and caps the chats per forward", () => {
    expect(forwardLabelKey(undefined)).toBeNull();
    expect(forwardLabelKey(1)).toBe("chat.forward.label");
    expect(forwardLabelKey(5)).toBe("chat.forward.label_many");
    expect(forwardLimit(0)).toBe(5);
    expect(forwardLimit(5)).toBe(1);
  });

  it("offers active chats other than the source room", () => {
    const group = (id: string, status: ChatGroup["status"]): ChatGroup => ({
      id,
      kind: "custom",
      status,
      myRole: "member",
      memberCount: 3,
      unreadCount: 0,
      createdAt: "2026-10-17T08:00:00Z",
    });
    const targets = forwardTargets(
      [group("g1", "active"), group("g2", "active"), group("g3", "archived")],
      "g1",
    );
    expect(targets.map((g) => g.id)).toEqual(["g2"]);
  });
});

describe("live receipts mapping", () => {
  it("maps api receipt rows onto the sheet's seen / delivered rows", () => {
    expect(
      toReceipt({
        userId: "u1",
        name: "Rina",
        status: "read",
        readAt: "2026-10-17T09:05:00Z",
        deliveredAt: "2026-10-17T09:01:00Z",
      }),
    ).toEqual({ userId: "u1", name: "Rina", status: "seen", at: "2026-10-17T09:05:00Z" });
    expect(
      toReceipt({
        userId: "u2",
        name: "Anis",
        status: "delivered",
        deliveredAt: "2026-10-17T09:02:00Z",
      }),
    ).toEqual({ userId: "u2", name: "Anis", status: "delivered", at: "2026-10-17T09:02:00Z" });
    expect(toReceipt({ userId: "u3", name: "Mitu", status: "delivered" }).at).toBe("");
  });

  it("parses message.delivered frames and forward / quote fields on messages", () => {
    expect(
      mapEvent({
        type: "message.delivered",
        groupId: "g1",
        userId: "u2",
        lastDeliveredMessageId: "m9",
      }),
    ).toEqual({
      type: "message.delivered",
      groupId: "g1",
      userId: "u2",
      lastDeliveredMessageId: "m9",
    });
    const mapped = mapEvent({
      type: "message.new",
      message: {
        id: "m1",
        groupId: "g1",
        senderId: "u2",
        senderName: "Rina",
        kind: "text",
        body: "See above",
        clientMsgId: "c1",
        replyTo: "m0",
        replyKind: "deleted",
        forwardCount: 2,
        createdAt: "2026-10-17T09:00:00Z",
      },
    });
    expect(mapped).toMatchObject({
      type: "message.new",
      message: { replyKind: "deleted", forwardCount: 2 },
    });
  });
});
