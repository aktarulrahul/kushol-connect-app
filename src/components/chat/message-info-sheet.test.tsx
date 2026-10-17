import { fireEvent, screen } from "@testing-library/react-native";

import type { ChatMessage } from "@/fixtures/chat";
import * as liveChatModule from "@/lib/chat/live-chat";
import { renderUi } from "@/test/render";

import { MessageInfoSheet } from "./message-actions";

// 2026-10-17 — the Message info sheet on Android edge-to-edge (owner screenshot: the sheet
// floated above a dimmed strip of the composer) and its WhatsApp layout.

const mine: ChatMessage = {
  id: "msg_102",
  groupId: "grp_official_10a",
  senderId: "user_demo_teacher",
  senderName: "Demo Teacher",
  kind: "text",
  body: "Exam routine is attached",
  clientMsgId: "00000000-0000-4000-8000-000000000102",
  createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
};

describe("MessageInfoSheet", () => {
  it("renders in the app's own full-window layer (no separate Android dialog window)", async () => {
    const onOpenChange = jest.fn();
    await renderUi(<MessageInfoSheet message={mine} open onOpenChange={onOpenChange} />, {
      locale: "en",
    });
    expect(screen.getByTestId("sheet-overlay")).toHaveStyle({
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
    // The backdrop covers everything (composer included) and closes the sheet. It sits outside
    // the accessibilityViewIsModal panel, so screen readers skip it (they use the escape gesture).
    await fireEvent.press(screen.getByLabelText("Close", { includeHiddenElements: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("is not mounted while closed", async () => {
    await renderUi(<MessageInfoSheet message={mine} open={false} onOpenChange={jest.fn()} />, {
      locale: "en",
    });
    expect(screen.queryByTestId("sheet-overlay")).toBeNull();
  });

  it("shows the message on top and who has seen it", async () => {
    await renderUi(<MessageInfoSheet message={mine} open onOpenChange={jest.fn()} />, {
      locale: "en",
    });
    expect(screen.getByText("Message info")).toBeOnTheScreen();
    expect(screen.getByText("Exam routine is attached")).toBeOnTheScreen();
    expect(screen.getByText("Seen by")).toBeOnTheScreen();
    expect(await screen.findAllByText(/\d{2}:\d{2}/)).not.toHaveLength(0);
  });

  it("has a proper empty state when nobody has read it yet", async () => {
    const peer: ChatMessage = { ...mine, id: "msg_unknown", senderId: "user_demo_karim" };
    await renderUi(<MessageInfoSheet message={peer} open onOpenChange={jest.fn()} />, {
      locale: "en",
    });
    expect(await screen.findByText("No read receipts for this message")).toBeOnTheScreen();
  });
});

// 05 · 2026-10-17 — live Message info: read by, delivered to, not reached yet, reactions.
describe("MessageInfoSheet (live)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lists readers, delivered-only members, the pending count and who reacted", async () => {
    jest.spyOn(liveChatModule, "chatLiveModeSync").mockReturnValue(true);
    jest.spyOn(liveChatModule.liveChat, "messageInfo").mockResolvedValue({
      receipts: [
        { userId: "u1", name: "Rina", status: "seen", at: "2026-10-17T09:05:00Z" },
        { userId: "u2", name: "Anis", status: "delivered", at: "2026-10-17T09:01:00Z" },
      ],
      pending: 2,
      reactors: [{ userId: "u1", name: "Rina", emoji: "❤️", at: "2026-10-17T09:06:00Z" }],
    });
    await renderUi(<MessageInfoSheet message={mine} open onOpenChange={jest.fn()} />, {
      locale: "en",
    });
    expect(await screen.findByText("Anis")).toBeTruthy();
    expect(screen.getAllByText("Rina")).toHaveLength(2);
    expect(screen.getByText("2 member(s) haven't received it yet")).toBeTruthy();
    expect(screen.getByText("Reactions")).toBeTruthy();
    expect(screen.getByLabelText("❤️")).toBeTruthy();
  });
});
