import { fireEvent, screen } from "@testing-library/react-native";

import { resetChatFixtures, type ChatGroup } from "@/fixtures/chat";
import { useChatState } from "@/lib/chat/chat-state";
import { renderUi } from "@/test/render";

import { GroupChatScreen } from "./group-chat-screen";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Conversation screen over the Stage-2 fixtures (Spartens channel parity, owner 2026-10-09).
const room: ChatGroup = {
  id: "grp_official_10a",
  kind: "official",
  name: "Class Ten Science (demo)",
  status: "active",
  myRole: "moderator",
  memberCount: 38,
  unreadCount: 2,
  createdAt: "2026-09-01T08:00:00.000Z",
};

describe("GroupChatScreen", () => {
  beforeEach(() => {
    resetChatFixtures();
    useChatState.setState({ drafts: {}, outgoing: [], typing: {} });
  });

  it("shows the header, the pinned bar, the unread pill and the history", async () => {
    await renderUi(
      <GroupChatScreen
        groupId={room.id}
        group={room}
        title={room.name ?? ""}
        memberCount={room.memberCount}
        avatarKind="official"
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Class Ten Science (demo)")).toBeOnTheScreen();
    expect(
      await screen.findByText("কেউ খাতা জমা দেয়নি?", {}, { timeout: 4000 }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Pinned message")).toBeOnTheScreen();
    expect(screen.getAllByText("অর্ধবার্ষিক-সিলেবাস.pdf").length).toBeGreaterThan(0);
    expect(screen.getByText("2 new unread messages")).toBeOnTheScreen();
  });

  it("keeps composer text as the chat's draft", async () => {
    await renderUi(
      <GroupChatScreen groupId={room.id} group={room} title="Room" avatarKind="official" />,
      { locale: "en" },
    );
    await fireEvent.changeText(screen.getByLabelText("Write a message…"), "half done");
    expect(useChatState.getState().drafts[room.id]).toBe("half done");
  });

  it("opens the chat info sheet from the header", async () => {
    await renderUi(
      <GroupChatScreen
        groupId={room.id}
        group={room}
        title="Room"
        memberCount={38}
        avatarKind="official"
      />,
      { locale: "en" },
    );
    const [infoButton] = screen.getAllByRole("button", { name: "Chat info" });
    if (!infoButton) throw new Error("no Chat info button");
    await fireEvent.press(infoButton);
    expect(await screen.findByText("Official group")).toBeOnTheScreen();
  });
});
