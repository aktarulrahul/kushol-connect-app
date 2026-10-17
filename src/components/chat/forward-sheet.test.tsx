import { fireEvent, screen } from "@testing-library/react-native";

import {
  forwardChatMessage,
  listChatMessages,
  resetChatFixtures,
  type ChatMessage,
} from "@/fixtures/chat";
import { renderUi } from "@/test/render";

import { ForwardSheet } from "./forward-sheet";

// 05 · 2026-10-17 — WhatsApp forward on the app: pick chats (≤ 5, 1 when forwarded many times),
// send, and the copy carries one more hop.

const source: ChatMessage = {
  id: "msg_101",
  groupId: "grp_official_10a",
  senderId: "user_demo_karim",
  senderName: "করিম আহমেদ",
  kind: "text",
  body: "Exam routine",
  clientMsgId: "00000000-0000-4000-8000-000000000101",
  createdAt: "2026-10-17T09:00:00.000Z",
};

beforeEach(() => {
  resetChatFixtures();
});

describe("ForwardSheet", () => {
  it("lists my other active chats and sends the picked ones", async () => {
    const onSend = jest.fn((targetGroupIds: string[]) => targetGroupIds.length);
    await renderUi(
      <ForwardSheet message={source} open onOpenChange={jest.fn()} onSend={onSend} />,
      {
        locale: "en",
      },
    );
    const rows = await screen.findAllByRole("checkbox", {}, { timeout: 5_000 });
    // Source room, the pending club and the archived DM are not offered.
    expect(rows).toHaveLength(4);
    const [first, second] = rows;
    if (!first || !second) throw new Error("expected forward targets");
    await fireEvent.press(first);
    await fireEvent.press(second);
    await fireEvent.press(screen.getByText("Send (2)"));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("allows one chat at a time once a message was forwarded many times", async () => {
    await renderUi(
      <ForwardSheet
        message={{ ...source, forwardCount: 5 }}
        open
        onOpenChange={jest.fn()}
        onSend={jest.fn()}
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Forwarded many times — one chat at a time")).toBeTruthy();
    const rows = await screen.findAllByRole("checkbox", {}, { timeout: 5_000 });
    const [first, second] = rows;
    if (!first || !second) throw new Error("expected forward targets");
    await fireEvent.press(first);
    expect(second).toBeDisabled();
  });
});

describe("forwardChatMessage (demo)", () => {
  it("copies into the target chat with one more hop and refuses too many chats", async () => {
    await expect(forwardChatMessage("msg_101", ["grp_club_science"])).resolves.toBe(1);
    const page = await listChatMessages("grp_club_science");
    expect(page.data[0]?.forwardCount).toBe(1);
    await expect(
      forwardChatMessage(
        "msg_101",
        ["a", "b", "c", "d", "e", "f"].map((s) => `grp_${s}`),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
