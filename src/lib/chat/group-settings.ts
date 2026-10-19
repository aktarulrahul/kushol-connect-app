// Group settings (05 G-28 · owner 2026-10-18, the web console's group settings dialog on the app):
// who may change a group's photo, name and description, the draft checks, and the save — a new
// photo uploads first and its confirmed asset id goes into the PATCH. Rights mirror the api's
// UpdateGroup (CanRenameGroup / CanEditGroupInfo); the api re-checks every field.
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  ChatFixtureError,
  updateChatGroup,
  type ChatGroup,
  type ChatGroupUpdateInput,
} from "@/fixtures/chat";
import { uploadMedia, type MediaPick } from "@/lib/chat/media-pipeline";
import { runeLength } from "@/lib/chat/poll";
import { chatKeys } from "@/lib/chat/use-chat";

export const GROUP_NAME_MIN = 3;
export const GROUP_NAME_MAX = 60;
export const GROUP_DESCRIPTION_MAX = 500;

export type GroupSettingsRights = {
  /** The name: Kushol admins, custom groups only — official groups keep the section's name. */
  canRename: boolean;
  /** Why the name is read-only, when it is (an i18n key). */
  renameHint: "chat.settings.name_follows_section" | "chat.settings.name_kushol_admins" | null;
  /** Photo and description: the group's owner/moderator, the School Admin or a Kushol admin. */
  canEditInfo: boolean;
};

/** DMs, and rooms whose group row is not loaded yet. */
export const NO_GROUP_SETTINGS_RIGHTS: GroupSettingsRights = {
  canRename: false,
  renameHint: null,
  canEditInfo: false,
};

/** Rights of the signed-in account (`accountRole` = its UserRole) on one group's settings. */
export function groupSettingsRights(
  group: Pick<ChatGroup, "kind" | "myRole" | "status">,
  accountRole: string | undefined,
): GroupSettingsRights {
  const settable = group.kind !== "dm" && group.status !== "archived";
  const kusholAdmin = accountRole === "super_admin";
  const canRename = settable && kusholAdmin && group.kind === "custom";
  const canEditInfo =
    settable &&
    (group.myRole === "owner" ||
      group.myRole === "moderator" ||
      accountRole === "school_admin" ||
      kusholAdmin);
  return {
    canRename,
    renameHint: canRename
      ? null
      : kusholAdmin
        ? "chat.settings.name_follows_section"
        : "chat.settings.name_kushol_admins",
    canEditInfo,
  };
}

/** The changed fields of one save: a pick = new photo, null = remove the current photo. */
export type GroupSettingsEdit = { name?: string; description?: string; photo?: MediaPick | null };

export type GroupSettingsDraft = {
  name: string;
  description: string;
  /** undefined = unchanged. */
  photo: MediaPick | null | undefined;
};

export type GroupSettingsError = "chat.settings.error_name" | "chat.settings.error_description";

/** The fields this account changed (trimmed), plus the first rule they break, if any. */
export function readGroupSettingsDraft(
  current: { name: string; description: string },
  draft: GroupSettingsDraft,
  rights: GroupSettingsRights,
): { edit: GroupSettingsEdit; error: GroupSettingsError | null } {
  const name = draft.name.trim();
  const description = draft.description.trim();
  const edit: GroupSettingsEdit = {
    ...(rights.canRename && name !== current.name.trim() ? { name } : {}),
    ...(rights.canEditInfo && description !== current.description.trim() ? { description } : {}),
    ...(rights.canEditInfo && draft.photo !== undefined ? { photo: draft.photo } : {}),
  };
  const nameLength = runeLength(name);
  if (edit.name !== undefined && (nameLength < GROUP_NAME_MIN || nameLength > GROUP_NAME_MAX)) {
    return { edit, error: "chat.settings.error_name" };
  }
  if (edit.description !== undefined && runeLength(description) > GROUP_DESCRIPTION_MAX) {
    return { edit, error: "chat.settings.error_description" };
  }
  return { edit, error: null };
}

/** Uploads a new photo (its confirmed asset id), then PATCHes only the changed fields. */
export async function saveGroupSettings(
  groupId: string,
  edit: GroupSettingsEdit,
): Promise<ChatGroup> {
  const body: ChatGroupUpdateInput = {
    ...(edit.name !== undefined ? { name: edit.name } : {}),
    ...(edit.description !== undefined ? { description: edit.description } : {}),
  };
  if (edit.photo === null) {
    body.photoAssetId = "";
  } else if (edit.photo) {
    const asset = await uploadMedia(edit.photo);
    body.photoAssetId = asset.assetId;
  }
  return updateChatGroup(groupId, body);
}

/** The save as a mutation: the list (titles, descriptions) and the group avatars refresh. */
export function useSaveGroupSettings(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (edit: GroupSettingsEdit) => saveGroupSettings(groupId, edit),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.groups });
      void queryClient.invalidateQueries({ queryKey: ["chat_group_photo"] });
    },
  });
}

/** Toast copy for a failed save. */
export function groupSettingsSaveError(
  error: unknown,
): "chat.settings.error_conflict" | "chat.errors.forbidden" | "chat.settings.save_failed" {
  const code = error instanceof ChatFixtureError ? error.code : null;
  if (code === "CONFLICT") return "chat.settings.error_conflict";
  if (code === "FORBIDDEN") return "chat.errors.forbidden";
  return "chat.settings.save_failed";
}
