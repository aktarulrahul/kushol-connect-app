import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import GroupRoute from "@/app/groups/[id]";
import type { User } from "@/fixtures/auth";
import { resetChatFixtures, type ChatGroup } from "@/fixtures/chat";
import { useAuthStore } from "@/lib/auth/auth-store";
import { groupSettingsRights, type GroupSettingsEdit } from "@/lib/chat/group-settings";
import { useChatState } from "@/lib/chat/chat-state";
import { renderUi } from "@/test/render";

import { GroupChatScreen } from "./group-chat-screen";
import { GroupSettingsSheet } from "./group-settings-sheet";

// 05 G-28 (owner 2026-10-18) — the app's "Edit group" sheet, matching the web group settings
// dialog: photo change/remove, name (Kushol admins, custom groups) and description.

let mockRouteId = "grp_official_10a";
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: mockRouteId }),
}));

const kusholAdmin: User = {
  id: "user_kushol_admin",
  role: "super_admin",
  status: "VERIFIED",
  locale: "en",
  fullName: "Kushol Admin",
  maskedPhone: "+8801XXXXXX013",
  schoolId: null,
  isAmbassador: false,
  plan: "pro",
};

const club: ChatGroup = {
  id: "grp_club_science",
  kind: "custom",
  name: "Science Club",
  description: "Experiments",
  status: "active",
  myRole: "moderator",
  memberCount: 12,
  unreadCount: 0,
  createdAt: "2026-09-01T08:00:00.000Z",
};

async function renderSheet(
  group: ChatGroup,
  accountRole: string | undefined,
  onSave = jest.fn<Promise<boolean>, [GroupSettingsEdit]>(() => Promise.resolve(true)),
) {
  const onOpenChange = jest.fn();
  const view = await renderUi(
    <GroupSettingsSheet
      open
      onOpenChange={onOpenChange}
      group={group}
      title={group.name ?? ""}
      avatarKind={group.kind === "official" ? "official" : "group"}
      rights={groupSettingsRights(group, accountRole)}
      onSave={onSave}
    />,
    { locale: "en" },
  );
  return { view, onSave, onOpenChange };
}

const saveButton = () => screen.getByRole("button", { name: "Save" });

beforeEach(() => {
  resetChatFixtures();
  useChatState.setState({ drafts: {}, outgoing: [], typing: {} });
  useAuthStore.setState({ me: null });
  mockRouteId = "grp_official_10a";
});

describe("GroupSettingsSheet", () => {
  it("lets a Kushol admin rename a custom group and edit its description", async () => {
    const { onSave, onOpenChange } = await renderSheet(club, "super_admin");
    const name = screen.getByLabelText("Group name");
    expect(name.props.editable).toBe(true);
    expect(saveButton()).toBeDisabled();
    await fireEvent.changeText(name, "  Physics Club ");
    await fireEvent.changeText(screen.getByLabelText("Description"), "Friday labs");
    await fireEvent.press(saveButton());
    expect(onSave).toHaveBeenCalledWith({ name: "Physics Club", description: "Friday labs" });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows the name read-only with the reason to a group admin", async () => {
    const { onSave } = await renderSheet(club, "teacher");
    expect(screen.getByLabelText("Group name").props.editable).toBe(false);
    expect(screen.getByText("Only Kushol admins can change the group name")).toBeOnTheScreen();
    expect(screen.getByLabelText("Description").props.editable).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("Description"), "");
    await fireEvent.press(saveButton());
    expect(onSave).toHaveBeenCalledWith({ description: "" });
  });

  it("keeps an official group's name on its section, even for a Kushol admin", async () => {
    await renderSheet({ ...club, kind: "official", name: "Class Ten Science" }, "super_admin");
    expect(screen.getByLabelText("Group name").props.editable).toBe(false);
    expect(screen.getByText("Class group names follow their section")).toBeOnTheScreen();
  });

  it("picks a new photo and sends it with the save", async () => {
    const { onSave } = await renderSheet({ ...club, photoAssetId: undefined }, "teacher");
    expect(screen.queryByText("Remove photo")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Change group photo" }));
    expect(await screen.findByText("Remove photo")).toBeOnTheScreen();
    await fireEvent.press(saveButton());
    expect(onSave).toHaveBeenCalledWith({
      photo: expect.objectContaining({ kind: "image" }) as unknown,
    });
  });

  it("removes the current photo", async () => {
    const { onSave } = await renderSheet(
      { ...club, photoAssetId: "asset_demo_photo" },
      "school_admin",
    );
    await fireEvent.press(screen.getByText("Remove photo"));
    expect(screen.queryByText("Remove photo")).toBeNull();
    await fireEvent.press(saveButton());
    expect(onSave).toHaveBeenCalledWith({ photo: null });
  });

  it("refuses a name outside 3–60 characters before saving", async () => {
    const { onSave } = await renderSheet(club, "super_admin");
    await fireEvent.changeText(screen.getByLabelText("Group name"), "ab");
    await fireEvent.press(saveButton());
    expect(screen.getByRole("alert")).toHaveTextContent("The group name needs 3–60 characters");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("stays open when the save fails", async () => {
    const { onSave, onOpenChange } = await renderSheet(
      club,
      "teacher",
      jest.fn<Promise<boolean>, [GroupSettingsEdit]>(() => Promise.resolve(false)),
    );
    await fireEvent.changeText(screen.getByLabelText("Description"), "Friday labs");
    await fireEvent.press(saveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(saveButton()).toBeEnabled();
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

// The entry point: chat info → "Edit group" → save; the route's group row refreshes from the list.
describe("Edit group from chat info", () => {
  const openInfo = async () => {
    const [infoButton] = screen.getAllByRole("button", { name: "Chat info" });
    if (!infoButton) throw new Error("no Chat info button");
    await fireEvent.press(infoButton);
  };

  it("lets the room's moderator change the description; the info sheet shows it", async () => {
    await renderUi(<GroupRoute />, { locale: "en" });
    expect(
      await screen.findByText("দশম শ্রেণি · বিজ্ঞান (ডেমো)", {}, { timeout: 4000 }),
    ).toBeOnTheScreen();
    await openInfo();
    await fireEvent.press(await screen.findByRole("button", { name: "Edit group" }));
    expect(await screen.findByText("Edit group")).toBeOnTheScreen();
    expect(screen.getByText("Only Kushol admins can change the group name")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Description"), "Homework every Friday");
    await fireEvent.press(saveButton());
    expect(await screen.findByText("Group updated", {}, { timeout: 4000 })).toBeOnTheScreen();
    await openInfo();
    expect(
      await screen.findByText("Homework every Friday", {}, { timeout: 4000 }),
    ).toBeOnTheScreen();
  });

  it("lets a Kushol admin rename a club; the header title follows", async () => {
    mockRouteId = "grp_club_science"; // the demo teacher is a plain member here
    useAuthStore.setState({ me: kusholAdmin });
    await renderUi(<GroupRoute />, { locale: "en" });
    expect(
      await screen.findByText("বিজ্ঞান ক্লাব (ডেমো)", {}, { timeout: 4000 }),
    ).toBeOnTheScreen();
    await openInfo();
    await fireEvent.press(await screen.findByRole("button", { name: "Edit group" }));
    await fireEvent.changeText(await screen.findByLabelText("Group name"), "Physics Club (demo)");
    await fireEvent.press(saveButton());
    // The header title comes from the refetched list row — the rename reached the seam.
    expect(await screen.findByText("Physics Club (demo)", {}, { timeout: 4000 })).toBeOnTheScreen();
  });

  it("offers no Edit group to a plain member or in a DM", async () => {
    mockRouteId = "grp_club_science";
    const { unmount } = await renderUi(<GroupRoute />, { locale: "en" });
    expect(
      await screen.findByText("বিজ্ঞান ক্লাব (ডেমো)", {}, { timeout: 4000 }),
    ).toBeOnTheScreen();
    await openInfo();
    expect(await screen.findByText("Community club")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Edit group" })).toBeNull();
    await unmount();

    await renderUi(
      <GroupChatScreen
        groupId="grp_dm_karim"
        title="Karim"
        avatarKind="dm"
        peerId="user_demo_karim"
      />,
      { locale: "en" },
    );
    await openInfo();
    expect(await screen.findByText("Direct message")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Edit group" })).toBeNull();
  });
});
