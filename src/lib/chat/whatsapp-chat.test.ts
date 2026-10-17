// 05 · 2026-10-17 pins — live chat on the app: identity, attachments on R2, list previews,
// document bubbles and the gateway event mapping (message.updated / group.updated).
import type { ChatGroup, ChatMessage } from "@/fixtures/chat";

import { chatIdentityFrom } from "./chat-identity";
import { listPreview } from "./chat-list";
import { documentKindFor } from "./device-media";
import { mapEvent } from "./live-chat";
import { documentBadge, isDocumentKind, messagePreview } from "./message-utils";

const ME = "11111111-1111-7111-8111-111111111111";

describe("chat identity", () => {
  it("is the signed-in account in live sessions and the demo teacher otherwise", () => {
    const account = { id: ME, fullName: "Rahima Khatun" };
    expect(chatIdentityFrom(account, true)).toEqual({ userId: ME, name: "Rahima Khatun" });
    expect(chatIdentityFrom(account, false).userId).toBe("user_demo_teacher");
    expect(chatIdentityFrom(null, true).userId).toBe("user_demo_teacher");
  });
});

describe("documentKindFor", () => {
  it.each([
    ["notice.pdf", "application/pdf", "pdf"],
    ["routine.docx", undefined, "doc"],
    ["old.doc", "application/msword", "doc"],
    ["marks.xlsx", undefined, "sheet"],
    ["old.xls", "application/vnd.ms-excel", "sheet"],
    ["roster.csv", "text/comma-separated-values", "csv"],
    ["slides.pptx", undefined, null],
    ["virus.exe", "application/x-msdownload", null],
  ])("%s (%s) → %s", (name, mime, kind) => {
    expect(documentKindFor(name, mime)).toBe(kind);
  });
});

const labels = {
  image: "Photo",
  pdf: "PDF",
  document: "Document",
  voice: "Voice message",
  deleted: "Message deleted",
  you: "You",
};

function group(overrides: Partial<ChatGroup>): ChatGroup {
  return {
    id: "g1",
    kind: "custom",
    status: "active",
    myRole: "member",
    memberCount: 4,
    unreadCount: 0,
    createdAt: "2026-10-17T08:00:00.000Z",
    ...overrides,
  };
}

describe("listPreview", () => {
  it("keeps fixture rows (no kind) as they were", () => {
    expect(listPreview(group({ lastMessagePreview: "Motion for Friday" }), labels, ME)).toBe(
      "Motion for Friday",
    );
    expect(listPreview(group({}), labels, ME)).toBeUndefined();
  });

  it("prefixes the sender in groups and You for my own last message", () => {
    const text = { lastMessageKind: "text", lastMessagePreview: "Exam on Sunday" } as const;
    expect(
      listPreview(
        group({ ...text, lastMessageSenderId: "peer", lastMessageSenderName: "Karim Ahmed" }),
        labels,
        ME,
      ),
    ).toBe("Karim: Exam on Sunday");
    expect(listPreview(group({ ...text, lastMessageSenderId: ME }), labels, ME)).toBe(
      "You: Exam on Sunday",
    );
  });

  it("labels attachments, polls and tombstones; DMs never prefix", () => {
    const dm = group({ kind: "dm", lastMessageSenderId: "peer", lastMessageSenderName: "Karim" });
    expect(listPreview({ ...dm, lastMessageKind: "image" }, labels, ME)).toBe("📷 Photo");
    expect(
      listPreview({ ...dm, lastMessageKind: "sheet", lastMessagePreview: "Marks" }, labels, ME),
    ).toBe("📎 Marks");
    expect(listPreview({ ...dm, lastMessageKind: "voice" }, labels, ME)).toBe("🎤 Voice message");
    expect(listPreview({ ...dm, lastMessageKind: "deleted" }, labels, ME)).toBe("Message deleted");
    expect(
      listPreview(
        group({
          lastMessageKind: "poll",
          lastMessagePreview: "Trip day?",
          lastMessageSenderId: ME,
        }),
        labels,
        ME,
      ),
    ).toBe("You: 📊 Trip day?");
  });
});

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "m1",
    groupId: "g1",
    senderId: "peer",
    senderName: "Karim",
    kind: "text",
    clientMsgId: "00000000-0000-4000-8000-000000000001",
    createdAt: "2026-10-17T09:00:00.000Z",
    ...overrides,
  };
}

describe("document bubbles", () => {
  const media = (fileName?: string) => ({
    assetId: "a1",
    kind: "sheet" as const,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 2048,
    status: "confirmed" as const,
    ...(fileName ? { fileName } : {}),
  });

  it("treats PDF, Word, Excel and CSV as document cards", () => {
    expect(
      ["pdf", "doc", "sheet", "csv"].every((k) => isDocumentKind(k as ChatMessage["kind"])),
    ).toBe(true);
    expect(isDocumentKind("image")).toBe(false);
    expect(isDocumentKind("voice")).toBe(false);
  });

  it("badges by extension (PDF keeps its localized label)", () => {
    expect(documentBadge(message({ kind: "pdf" }), "পিডিএফ")).toBe("পিডিএফ");
    expect(documentBadge(message({ kind: "sheet", media: media("marks.xlsx") }), "PDF")).toBe(
      "XLSX",
    );
    expect(documentBadge(message({ kind: "csv" }), "PDF")).toBe("CSV");
    expect(documentBadge(message({ kind: "doc" }), "PDF")).toBe("DOCX");
  });

  it("previews a document by its file name", () => {
    const preview = messagePreview(message({ kind: "sheet", media: media("marks.xlsx") }), {
      image: "Photo",
      pdf: "PDF",
      document: "Document",
      voice: "Voice",
      sticker: "Sticker",
    });
    expect(preview).toBe("marks.xlsx");
  });
});

describe("gateway event mapping", () => {
  it("merges message.updated into the cache like message.new, minus per-viewer flags", () => {
    const mapped = mapEvent({
      type: "message.updated",
      groupId: "g1",
      message: {
        id: "m1",
        groupId: "g1",
        senderId: "peer",
        senderName: "Karim",
        kind: "text",
        body: "edited",
        clientMsgId: "c1",
        createdAt: "2026-10-17T09:00:00.000Z",
        editedAt: "2026-10-17T09:01:00.000Z",
        pinnedAt: "2026-10-17T09:02:00.000Z",
        reactions: [{ emoji: "👍", count: 2, mine: true }],
      },
    });
    expect(mapped?.type).toBe("message.new");
    if (mapped?.type !== "message.new") return;
    expect(mapped.message.editedAt).toBe("2026-10-17T09:01:00.000Z");
    expect(mapped.message.pinnedAt).toBe("2026-10-17T09:02:00.000Z");
    expect(mapped.message.reactions).toEqual([{ emoji: "👍", count: 2 }]);
  });

  it("maps group.updated and ignores unknown frames", () => {
    expect(mapEvent({ type: "group.updated", groupId: "g9" })).toEqual({
      type: "group.updated",
      groupId: "g9",
    });
    expect(mapEvent({ type: "something.new" })).toBeNull();
  });
});
