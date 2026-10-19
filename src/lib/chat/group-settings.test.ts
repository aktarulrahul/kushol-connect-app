import type * as ChatSeam from "@/fixtures/chat";
import {
  ChatFixtureError,
  listChatGroups,
  resetChatFixtures,
  updateChatGroup,
  type ChatGroup,
} from "@/fixtures/chat";
import { DEMO_MAGIC, mediaFixtures } from "@/fixtures/media";

import {
  groupSettingsRights,
  groupSettingsSaveError,
  readGroupSettingsDraft,
  saveGroupSettings,
} from "./group-settings";

// 05 G-28 (owner 2026-10-18) — group settings on the app: who may change what (the api's
// CanRenameGroup / CanEditGroupInfo) and the PATCH a save sends (photo upload first).

jest.mock("@/fixtures/chat", () => {
  const actual = jest.requireActual<typeof ChatSeam>("@/fixtures/chat");
  return { ...actual, updateChatGroup: jest.fn(actual.updateChatGroup) };
});

const custom = { kind: "custom", myRole: "member", status: "active" } as const;
const official = { kind: "official", myRole: "moderator", status: "active" } as const;

const groupById = async (id: string): Promise<ChatGroup | undefined> =>
  (await listChatGroups()).find((g) => g.id === id);

beforeEach(() => {
  resetChatFixtures();
  jest.mocked(updateChatGroup).mockClear();
});

describe("groupSettingsRights", () => {
  it("lets a Kushol admin rename custom groups and edit the photo and description", () => {
    expect(groupSettingsRights(custom, "super_admin")).toEqual({
      canRename: true,
      renameHint: null,
      canEditInfo: true,
    });
  });

  it("keeps official names on the section, even for a Kushol admin", () => {
    expect(groupSettingsRights(official, "super_admin")).toEqual({
      canRename: false,
      renameHint: "chat.settings.name_follows_section",
      canEditInfo: true,
    });
  });

  it("gives group admins and the School Admin the photo and description, not the name", () => {
    const moderator = groupSettingsRights({ ...custom, myRole: "moderator" }, "teacher");
    const owner = groupSettingsRights({ ...custom, myRole: "owner" }, "student");
    const schoolAdmin = groupSettingsRights(custom, "school_admin");
    for (const rights of [moderator, owner, schoolAdmin]) {
      expect(rights).toEqual({
        canRename: false,
        renameHint: "chat.settings.name_kushol_admins",
        canEditInfo: true,
      });
    }
  });

  it("gives plain members, DMs and archived groups nothing", () => {
    const none = { canRename: false, canEditInfo: false };
    expect(groupSettingsRights(custom, "teacher")).toMatchObject(none);
    expect(groupSettingsRights(custom, undefined)).toMatchObject(none);
    expect(groupSettingsRights({ ...custom, kind: "dm" }, "super_admin")).toMatchObject(none);
    expect(groupSettingsRights({ ...custom, status: "archived" }, "super_admin")).toMatchObject(
      none,
    );
  });
});

describe("readGroupSettingsDraft", () => {
  const current = { name: "Science Club", description: "Experiments" };
  const all = groupSettingsRights(custom, "super_admin");

  it("keeps only the changed fields, trimmed", () => {
    expect(
      readGroupSettingsDraft(
        current,
        { name: " Science Club ", description: " Labs on Friday ", photo: undefined },
        all,
      ),
    ).toEqual({ edit: { description: "Labs on Friday" }, error: null });
    expect(
      readGroupSettingsDraft(current, { name: "Science Club", description: "", photo: null }, all),
    ).toEqual({ edit: { description: "", photo: null }, error: null });
  });

  it("drops fields this account may not change", () => {
    const moderator = groupSettingsRights({ ...custom, myRole: "moderator" }, "teacher");
    expect(
      readGroupSettingsDraft(
        current,
        { name: "Renamed Club", description: "Experiments", photo: undefined },
        moderator,
      ).edit,
    ).toEqual({});
  });

  it("checks the 3–60 character name in code points", () => {
    expect(
      readGroupSettingsDraft(
        current,
        { name: "ab", description: "Experiments", photo: undefined },
        all,
      ).error,
    ).toBe("chat.settings.error_name");
    expect(
      readGroupSettingsDraft(
        current,
        { name: "ক্লাব", description: "Experiments", photo: undefined },
        all,
      ).error,
    ).toBeNull();
  });
});

describe("saveGroupSettings (demo)", () => {
  it("uploads a new photo and sends its confirmed asset id with the description", async () => {
    const group = await saveGroupSettings("grp_club_science", {
      description: "Friday labs",
      photo: { kind: "image", headerBytes: DEMO_MAGIC.jpeg, sizeBytes: 90_000 },
    });
    const assetId = group.photoAssetId ?? "";
    expect(assetId).not.toBe("");
    expect(mediaFixtures.kindOf(assetId)).toBe("image");
    expect(jest.mocked(updateChatGroup)).toHaveBeenCalledWith("grp_club_science", {
      description: "Friday labs",
      photoAssetId: assetId,
    });
    expect(await groupById("grp_club_science")).toMatchObject({
      description: "Friday labs",
      photoAssetId: assetId,
    });
  });

  it('removes the photo and clears the description with ""', async () => {
    await saveGroupSettings("grp_club_science", {
      description: "Friday labs",
      photo: { kind: "image", headerBytes: DEMO_MAGIC.png, sizeBytes: 90_000 },
    });
    await saveGroupSettings("grp_club_science", { description: "", photo: null });
    expect(jest.mocked(updateChatGroup).mock.calls[1]?.[1]).toEqual({
      description: "",
      photoAssetId: "",
    });
    const group = await groupById("grp_club_science");
    expect(group?.description).toBeUndefined();
    expect(group?.photoAssetId).toBeUndefined();
  });

  it("renames custom groups only", async () => {
    await saveGroupSettings("grp_club_science", { name: "  Physics Club  " });
    expect(jest.mocked(updateChatGroup)).toHaveBeenCalledWith("grp_club_science", {
      name: "  Physics Club  ",
    });
    expect((await groupById("grp_club_science"))?.name).toBe("Physics Club");
    await expect(
      saveGroupSettings("grp_official_10a", { name: "Renamed class" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("puts the seeded settings back on reset", async () => {
    await saveGroupSettings("grp_club_science", { name: "Physics Club", description: "Labs" });
    resetChatFixtures();
    const group = await groupById("grp_club_science");
    expect(group?.name).toBe("বিজ্ঞান ক্লাব (ডেমো)");
    expect(group?.description).toBeUndefined();
  });
});

describe("groupSettingsSaveError", () => {
  it("maps api refusals onto the toast copy", () => {
    expect(groupSettingsSaveError(new ChatFixtureError("CONFLICT"))).toBe(
      "chat.settings.error_conflict",
    );
    expect(groupSettingsSaveError(new ChatFixtureError("FORBIDDEN"))).toBe("chat.errors.forbidden");
    expect(groupSettingsSaveError(new ChatFixtureError("OFFLINE"))).toBe(
      "chat.settings.save_failed",
    );
    expect(groupSettingsSaveError(new Error("boom"))).toBe("chat.settings.save_failed");
  });
});
