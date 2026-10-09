import type { ChatMessage } from "@/fixtures/chat";

import {
  firstUnreadId,
  isEmojiOnly,
  isSameDay,
  messagePreview,
  sortMessagesAsc,
} from "./message-utils";

const msg = (id: string, minute: number, senderId = "peer", extra: Partial<ChatMessage> = {}) =>
  ({
    id,
    groupId: "g",
    senderId,
    senderName: senderId,
    kind: "text",
    body: id,
    clientMsgId: `00000000-0000-4000-8000-${id.padStart(12, "0")}`,
    createdAt: new Date(Date.UTC(2026, 9, 9, 8, minute)).toISOString(),
    ...extra,
  }) as ChatMessage;

describe("sortMessagesAsc", () => {
  it("orders oldest → newest whatever the page order", () => {
    const sorted = sortMessagesAsc([msg("c", 3), msg("a", 1), msg("b", 2)]);
    expect(sorted.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});

describe("isSameDay", () => {
  it("compares calendar days", () => {
    expect(isSameDay("2026-10-09T08:00:00.000Z", "2026-10-09T09:00:00.000Z")).toBe(true);
    expect(isSameDay("2026-10-01T08:00:00.000Z", "2026-10-09T08:00:00.000Z")).toBe(false);
  });
});

describe("firstUnreadId", () => {
  const history = [msg("1", 1), msg("2", 2, "me"), msg("3", 3), msg("4", 4), msg("5", 5)];

  it("marks the first of the last N incoming messages", () => {
    expect(firstUnreadId(history, 2, "me")).toBe("4");
    expect(firstUnreadId(history, 3, "me")).toBe("3");
  });

  it("returns null when nothing is unread and clamps big counts", () => {
    expect(firstUnreadId(history, 0, "me")).toBeNull();
    expect(firstUnreadId(history, 99, "me")).toBe("1");
  });
});

describe("isEmojiOnly", () => {
  it("accepts one to three emoji, including joined and variant forms", () => {
    expect(isEmojiOnly("👍")).toBe(true);
    expect(isEmojiOnly("❤️")).toBe(true);
    expect(isEmojiOnly(" 😂😂😂 ")).toBe(true);
    expect(isEmojiOnly("🇧🇩")).toBe(true);
  });

  it("rejects text, mixed content, empty and long emoji runs", () => {
    expect(isEmojiOnly("hello")).toBe(false);
    expect(isEmojiOnly("ঠিক আছে 👍")).toBe(false);
    expect(isEmojiOnly("")).toBe(false);
    expect(isEmojiOnly(undefined)).toBe(false);
    expect(isEmojiOnly("😂😂😂😂")).toBe(false);
  });
});

describe("messagePreview", () => {
  const labels = { image: "Photo", pdf: "PDF", voice: "Voice", sticker: "Sticker" };

  it("summarises each kind in one line", () => {
    expect(messagePreview(msg("t", 1, "p", { body: "hi" }), labels)).toBe("hi");
    expect(messagePreview(msg("i", 1, "p", { kind: "image", body: "" }), labels)).toBe("Photo");
    expect(messagePreview(msg("v", 1, "p", { kind: "voice" }), labels)).toBe("Voice");
    expect(messagePreview(msg("s", 1, "p", { kind: "sticker" }), labels)).toBe("Sticker");
    expect(
      messagePreview(
        msg("d", 1, "p", {
          kind: "pdf",
          media: {
            assetId: "a",
            kind: "pdf",
            mime: "application/pdf",
            sizeBytes: 1,
            fileName: "syllabus.pdf",
            status: "confirmed",
          },
        }),
        labels,
      ),
    ).toBe("syllabus.pdf");
  });
});
