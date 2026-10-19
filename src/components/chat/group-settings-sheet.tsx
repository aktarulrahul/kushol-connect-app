// Group settings on the app (05 G-28 · owner 2026-10-18 — the web console's group settings
// dialog): change or remove the photo, rename the group (Kushol admins, custom groups) and edit its
// description. A field this account may not change stays read-only with the reason; Save sends
// only what changed and is off until something did.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Camera, Trash2 } from "lucide-react-native";

import { ChatAvatar, type ChatAvatarKind } from "@/components/chat/chat-avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import type { ChatGroup } from "@/fixtures/chat";
import { DEMO_IMAGE_DATA_URI, DEMO_MAGIC } from "@/fixtures/media";
import { useT } from "@/i18n/locale-provider";
import { pickImage, type PickOutcome } from "@/lib/chat/device-media";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  readGroupSettingsDraft,
  type GroupSettingsEdit,
  type GroupSettingsError,
  type GroupSettingsRights,
} from "@/lib/chat/group-settings";
import { chatLiveModeSync } from "@/lib/chat/live-chat";
import type { MediaPick } from "@/lib/chat/media-pipeline";

/** Demo sessions get the bundled demo picture (the fixture upload sniffs its PNG bytes). */
const DEMO_GROUP_PHOTO: MediaPick = {
  kind: "image",
  headerBytes: DEMO_MAGIC.png,
  sizeBytes: 120_000,
  fileName: "group-photo.png",
  width: 240,
  height: 320,
  uri: DEMO_IMAGE_DATA_URI,
};

/** Live sessions open the system photo picker (images ≤ 10 MB, compressed JPEG). */
function pickGroupPhoto(): Promise<PickOutcome> {
  if (chatLiveModeSync()) return pickImage();
  return Promise.resolve({ ok: true, pick: DEMO_GROUP_PHOTO });
}

export function GroupSettingsSheet({
  open,
  onOpenChange,
  group,
  title,
  avatarKind,
  rights,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ChatGroup | undefined;
  /** The name the room shows now. */
  title: string;
  avatarKind: ChatAvatarKind;
  rights: GroupSettingsRights;
  /** Saves the changed fields; resolves true on success (the sheet then closes). */
  onSave: (edit: GroupSettingsEdit) => Promise<boolean>;
}) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("chat.settings.title")}
      description={t("chat.settings.subtitle")}
    >
      {open && group ? (
        <GroupSettingsForm
          group={group}
          title={title}
          avatarKind={avatarKind}
          rights={rights}
          onCancel={() => {
            onOpenChange(false);
          }}
          onSave={onSave}
        />
      ) : null}
    </Sheet>
  );
}

type FormError =
  GroupSettingsError | "chat.settings.error_photo_size" | "chat.settings.error_photo_pick" | null;

function GroupSettingsForm({
  group,
  title,
  avatarKind,
  rights,
  onCancel,
  onSave,
}: {
  group: ChatGroup;
  title: string;
  avatarKind: ChatAvatarKind;
  rights: GroupSettingsRights;
  onCancel: () => void;
  onSave: (edit: GroupSettingsEdit) => Promise<boolean>;
}) {
  const t = useT();
  const [name, setName] = useState(title);
  const [description, setDescription] = useState(group.description ?? "");
  // undefined = unchanged · a pick = new photo · null = remove the current one
  const [photo, setPhoto] = useState<MediaPick | null | undefined>(undefined);
  const [error, setError] = useState<FormError>(null);
  const [saving, setSaving] = useState(false);

  const draft = readGroupSettingsDraft(
    { name: title, description: group.description ?? "" },
    { name, description, photo },
    rights,
  );
  const dirty = Object.keys(draft.edit).length > 0;
  const hasPhoto = photo === undefined ? Boolean(group.photoAssetId) : photo !== null;

  const choosePhoto = () => {
    pickGroupPhoto()
      .then((outcome) => {
        if (outcome.ok) {
          setError(null);
          setPhoto(outcome.pick);
        } else if (outcome.reason === "too_large") {
          setError("chat.settings.error_photo_size");
        }
      })
      .catch(() => {
        setError("chat.settings.error_photo_pick");
      });
  };

  const save = () => {
    if (draft.error) {
      setError(draft.error);
      return;
    }
    setError(null);
    setSaving(true);
    void onSave(draft.edit).then((ok) => {
      if (ok) onCancel();
      else setSaving(false);
    });
  };

  return (
    <View className="gap-4">
      <View className="items-center gap-2">
        <View>
          {photo ? (
            <ChatAvatar
              kind={avatarKind}
              id={group.id}
              name={name || title}
              size="xl"
              imageUri={photo.uri ?? null}
            />
          ) : (
            <ChatAvatar
              kind={avatarKind}
              id={group.id}
              name={name || title}
              size="xl"
              photoAssetId={photo === null ? undefined : group.photoAssetId}
            />
          )}
          {rights.canEditInfo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.settings.change_photo")}
              hitSlop={8}
              onPress={choosePhoto}
              className="absolute -bottom-1 -right-1 size-8 items-center justify-center rounded-full border-2 border-card bg-primary active:bg-primary-hover"
            >
              <Icon as={Camera} size={16} className="text-primary-foreground" />
            </Pressable>
          ) : null}
        </View>
        {rights.canEditInfo && hasPhoto ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPhoto(null);
            }}
            className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1 active:bg-muted"
          >
            <Icon as={Trash2} size={14} className="text-destructive" />
            <Text className="text-xs font-semibold text-destructive">
              {t("chat.settings.remove_photo")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">{t("chat.settings.name_label")}</Text>
        <Input
          value={name}
          onChangeText={setName}
          editable={rights.canRename}
          maxLength={GROUP_NAME_MAX}
          accessibilityLabel={t("chat.settings.name_label")}
          invalid={error === "chat.settings.error_name"}
        />
        {rights.renameHint ? (
          <Text className="text-xs text-muted-foreground">{t(rights.renameHint)}</Text>
        ) : null}
      </View>

      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">
          {t("chat.settings.description_label")}
        </Text>
        <Textarea
          value={description}
          onChangeText={setDescription}
          editable={rights.canEditInfo}
          maxLength={GROUP_DESCRIPTION_MAX}
          numberOfLines={4}
          placeholder={t("chat.settings.description_placeholder")}
          accessibilityLabel={t("chat.settings.description_label")}
          invalid={error === "chat.settings.error_description"}
        />
        <Text className="self-end text-xs text-muted-foreground">
          {`${String(description.length)}/${String(GROUP_DESCRIPTION_MAX)}`}
        </Text>
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {t(error)}
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <Button variant="outline" className="flex-1" onPress={onCancel}>
          <Text>{t("common.actions.cancel")}</Text>
        </Button>
        <Button className="flex-1" disabled={!dirty} loading={saving} onPress={save}>
          <Text>{t("common.actions.save")}</Text>
        </Button>
      </View>
    </View>
  );
}
