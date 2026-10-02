import { renderUi } from "@/test/render";
import { fireEvent, screen } from "@testing-library/react-native";

import { ChatAvatar, chatAvatarKind } from "./chat-avatar";
import { GroupRow, toBnDigits } from "./group-row";
import type { ChatGroup } from "@/fixtures/chat";
import { avatarPalette, avatarTintFor } from "@/theme/tokens";

describe("chatAvatarKind", () => {
  it("maps API kinds to dm / official / group silhouettes", () => {
    expect(chatAvatarKind("dm")).toBe("dm");
    expect(chatAvatarKind("official")).toBe("official");
    expect(chatAvatarKind("custom")).toBe("group");
  });
});

describe("avatarTintFor", () => {
  it("is stable for the same seed and varies across ids", () => {
    expect(avatarTintFor("user_a")).toEqual(avatarTintFor("user_a"));
    expect(avatarPalette).toContainEqual(avatarTintFor("user_a"));
    // Different seeds should not always collide on the first swatch.
    const colors = ["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => avatarTintFor(s).bg);
    expect(new Set(colors).size).toBeGreaterThan(1);
  });
});

describe("GroupRow avatar", () => {
  const dm: ChatGroup = {
    id: "grp_dm_demo",
    kind: "dm",
    status: "active",
    myRole: "member",
    memberCount: 2,
    unreadCount: 0,
    createdAt: "2026-10-01T10:00:00.000Z",
    peer: { userId: "user_demo_peer", name: "Demo Peer" },
  };

  const group: ChatGroup = {
    id: "grp_club_science",
    kind: "custom",
    schoolId: "sch_demo",
    name: "Demo Science Club",
    status: "active",
    myRole: "member",
    memberCount: 12,
    unreadCount: 2,
    createdAt: "2026-10-01T10:00:00.000Z",
    lastMessagePreview: "নমুনা: আগামীকাল মিটিং",
    lastMessageAt: "2026-10-01T12:24:00.000Z",
  };

  it("renders a named DM avatar without initials text", async () => {
    const onPress = jest.fn();
    await renderUi(<GroupRow group={dm} onPress={onPress} online={false} />, { locale: "en" });
    expect(screen.getByRole("image", { name: "Demo Peer" })).toBeOnTheScreen();
    expect(screen.queryByText("DP")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Demo Peer" }));
    expect(onPress).toHaveBeenCalledWith(dm);
  });

  it("renders a named group avatar and bn unread digits", async () => {
    await renderUi(<GroupRow group={group} onPress={jest.fn()} />, { locale: "bn" });
    expect(screen.getByRole("image", { name: "Demo Science Club" })).toBeOnTheScreen();
    expect(screen.queryByText("DS")).toBeNull();
    expect(screen.getByText(toBnDigits(2))).toBeOnTheScreen();
  });
});

describe("ChatAvatar", () => {
  it("exposes an accessible name for dm and group kinds", async () => {
    await renderUi(
      <>
        <ChatAvatar kind="dm" id="user_1" name="Demo One" size="sm" />
        <ChatAvatar kind="group" id="grp_1" name="Demo Group" size="sm" />
        <ChatAvatar kind="official" id="grp_off" name="Demo Official" size="sm" />
      </>,
      { locale: "en" },
    );
    expect(screen.getByRole("image", { name: "Demo One" })).toBeOnTheScreen();
    expect(screen.getByRole("image", { name: "Demo Group" })).toBeOnTheScreen();
    expect(screen.getByRole("image", { name: "Demo Official" })).toBeOnTheScreen();
  });
});
