import {
  ChatFixtureError,
  editChatMessage,
  MAX_PINNED_MESSAGES,
  resetChatFixtures,
  sendChatMessage,
  setChatMessagePinned,
} from "./chat";

// Fixture-only edit/pin calls (Spartens channel parity, 05 08-gaps G-7).
describe("chat fixture: edit and pin", () => {
  beforeEach(() => {
    resetChatFixtures();
  });

  it("edits an own text message and marks it edited", async () => {
    const edited = await editChatMessage("msg_102", "  আজ সন্ধ্যায় দেব।  ");
    expect(edited.body).toBe("আজ সন্ধ্যায় দেব।");
    expect(edited.editedAt).toBeDefined();
  });

  it("refuses editing someone else's message, a non-text message and blank text", async () => {
    await expect(editChatMessage("msg_101", "x")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(editChatMessage("msg_103", "x")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(editChatMessage("msg_102", "   ")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("pins and unpins for a room moderator", async () => {
    const pinned = await setChatMessagePinned("msg_101", true);
    expect(pinned.pinnedAt).toBeDefined();
    const unpinned = await setChatMessagePinned("msg_101", false);
    expect(unpinned.pinnedAt).toBeUndefined();
  });

  it("refuses pins from plain members", async () => {
    await expect(setChatMessagePinned("msg_301", true)).rejects.toBeInstanceOf(ChatFixtureError);
  });

  it(`caps a room at ${String(MAX_PINNED_MESSAGES)} pins`, async () => {
    // A room with no seeded pins: fill it, then one more is refused.
    const ids: string[] = [];
    for (let i = 0; i < MAX_PINNED_MESSAGES + 1; i++) {
      const sent = await sendChatMessage({
        groupId: "grp_official_9b",
        kind: "text",
        body: `pin ${String(i)}`,
        clientMsgId: `00000000-0000-4000-8000-0000000007${String(i).padStart(2, "0")}`,
      });
      ids.push(sent.id);
    }
    for (const id of ids.slice(0, MAX_PINNED_MESSAGES)) await setChatMessagePinned(id, true);
    await expect(setChatMessagePinned(ids[MAX_PINNED_MESSAGES] ?? "", true)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  }, 20_000);
});
