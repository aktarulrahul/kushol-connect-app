// Conversation chrome in the Spartens ChannelHeader language (owner 2026-10-09): back circle Â·
// centred avatar + name (tap â†’ chat info) Â· info circle; the pinned-message bar under it; the
// chat-info sheet (with "Edit group" for those who may change the group settings and the
// "Starred messages" row, owner 2026-10-19).
import { useState } from "react";
import { ArrowLeft, AtSign, ChevronRight, Info, Pencil, Pin, Star } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatAvatar, type ChatAvatarKind } from "@/components/chat/chat-avatar";
import { toBnDigits } from "@/components/chat/group-row";
import { GroupSettingsSheet } from "@/components/chat/group-settings-sheet";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Icon } from "@/components/ui/icon";
import { CircleAction } from "@/components/ui/screen-header";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { ChatRosterMember } from "@/fixtures/chat";
import { useLocale, useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  groupSettingsRights,
  groupSettingsSaveError,
  NO_GROUP_SETTINGS_RIGHTS,
  useSaveGroupSettings,
  type GroupSettingsEdit,
} from "@/lib/chat/group-settings";
import { useChatGroupMembers, useChatGroups } from "@/lib/chat/use-chat";
import { cn } from "@/lib/utils";

export function ChannelHeader({
  title,
  subtitle,
  subtitleActive = false,
  avatarKind,
  avatarId,
  photoAssetId,
  imageUri,
  onBack,
  onOpenInfo,
}: {
  title: string;
  subtitle?: string;
  /** Teal subtitle (typingâ€¦ / online) instead of muted. */
  subtitleActive?: boolean;
  avatarKind: ChatAvatarKind;
  avatarId: string;
  /** Group photo (set from the web console's group settings). */
  photoAssetId?: string | undefined;
  imageUri?: string | null;
  onBack: () => void;
  onOpenInfo: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <GlassSurface
      variant="light"
      className="border-b border-border"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-1">
        <CircleAction
          icon={ArrowLeft}
          accessibilityLabel={t("common.actions.back")}
          onPress={onBack}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${t("chat.header.info")}`}
          onPress={onOpenInfo}
          className="min-w-0 flex-1 flex-row items-center justify-center gap-2"
        >
          <ChatAvatar
            kind={avatarKind}
            id={avatarId}
            name={title}
            size="md"
            photoAssetId={photoAssetId}
            imageUri={imageUri}
          />
          <View className="min-w-0 shrink">
            <Text numberOfLines={1} className="text-base font-medium leading-6 text-foreground">
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                className={cn(
                  "text-xs leading-4",
                  subtitleActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <CircleAction icon={Info} accessibilityLabel={t("chat.header.info")} onPress={onOpenInfo} />
      </View>
    </GlassSurface>
  );
}

/** Pinned-message strip (Spartens PinnedMessage): tap jumps to the pin and advances to the next. */
export function PinnedBar({
  previews,
  activeIndex,
  onPress,
}: {
  previews: readonly string[];
  activeIndex: number;
  onPress: () => void;
}) {
  const t = useT();
  if (previews.length === 0) return null;
  const index = activeIndex % previews.length;
  const preview = previews[index] ?? "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("chat.pinned.label")}: ${preview}`}
      onPress={onPress}
      className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-1.5 active:bg-muted"
    >
      {previews.length > 1 ? (
        <View className="items-center justify-center gap-0.5" accessibilityElementsHidden>
          {previews.map((_, i) => (
            <View
              key={i}
              className={cn("size-1 rounded-full", i === index ? "bg-primary" : "bg-border")}
            />
          ))}
        </View>
      ) : null}
      <View className="size-8 items-center justify-center rounded-full bg-muted">
        <Icon as={Pin} size={16} className="text-muted-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-medium leading-4 text-primary">{t("chat.pinned.label")}</Text>
        <Text numberOfLines={1} className="text-sm leading-5 text-foreground">
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

/** Mentioned-message strip: tap jumps to the mention and advances to the next. */
export function MentionBar({
  previews,
  activeIndex,
  onPress,
}: {
  previews: readonly string[];
  activeIndex: number;
  onPress: () => void;
}) {
  const t = useT();
  if (previews.length === 0) return null;
  const index = activeIndex % previews.length;
  const preview = previews[index] ?? "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mention: ${preview}`}
      onPress={onPress}
      className="flex-row items-center gap-2 border-b border-[#00a884]/20 bg-[#f4fbf7] px-4 py-1.5 active:bg-[#e7fce3]"
    >
      {previews.length > 1 ? (
        <View className="items-center justify-center gap-0.5" accessibilityElementsHidden>
          {previews.map((_, i) => (
            <View
              key={i}
              className={cn("size-1 rounded-full", i === index ? "bg-[#00a884]" : "bg-border")}
            />
          ))}
        </View>
      ) : null}
      <View className="size-8 items-center justify-center rounded-full bg-[#00a884]/15">
        <Icon as={AtSign} size={16} className="text-[#00a884]" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-semibold leading-4 text-[#00a884]">
          {t("notifications.banner.chat.mention") ?? "You were mentioned"}
        </Text>
        <Text numberOfLines={1} className="text-sm leading-5 text-foreground">
          {preview}
        </Text>
      </View>
      <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
    </Pressable>
  );
}

type ChatInfoSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  avatarKind: ChatAvatarKind;
  /** The group id for groups; the peer's id in a DM. */
  avatarId: string;
  /** Group photo (group settings â€” web console or the app's Edit group sheet). */
  photoAssetId?: string | undefined;
  imageUri?: string | null;
  /** Lines under the name â€” kind, member count, presence. */
  details: readonly string[];
  /**
   * "Starred messages" row (owner 2026-10-19): opens the screen's starred sheet. The count is
   * the loaded stars (`starredMore` â‡’ older pages exist, shown as "N+").
   */
  onOpenStarred?: (() => void) | undefined;
  starredCount?: number | undefined;
  starredMore?: boolean | undefined;
};

export function ChatInfoSheet(props: ChatInfoSheetProps) {
  return props.avatarKind === "dm" ? <ChatInfoBody {...props} imageUri={props.imageUri} /> : <GroupInfoSheet {...props} imageUri={props.imageUri} />;
}

/**
 * Groups (05 G-28): "Edit group" for an account that may change the settings â€” rights from the
 * cached group row and the account role â€” opening the group settings sheet; the save refreshes
 * the list, the title and the avatars.
 */
function GroupInfoSheet(props: ChatInfoSheetProps) {
  const t = useT();
  const toast = useToast();
  const groupId = props.avatarId;
  const group = useChatGroups().data?.find((g) => g.id === groupId);
  const accountRole = useAuthStore((s) => s.me?.role);
  const rights = group ? groupSettingsRights(group, accountRole) : NO_GROUP_SETTINGS_RIGHTS;
  const saveSettings = useSaveGroupSettings(groupId);
  const [editOpen, setEditOpen] = useState(false);
  const { onOpenChange } = props;
  // Members with their profile photos (owner 2026-10-20) — fetched while the sheet is open.
  const roster = useChatGroupMembers(groupId, props.open);

  const save = (edit: GroupSettingsEdit): Promise<boolean> =>
    saveSettings
      .mutateAsync(edit)
      .then(() => {
        toast({ title: t("chat.settings.saved"), variant: "success" });
        return true;
      })
      .catch((error: unknown) => {
        toast({ title: t(groupSettingsSaveError(error)), variant: "error" });
        return false;
      });

  return (
    <>
      <ChatInfoBody
        {...props}
        members={roster.data}
        onEdit={
          rights.canRename || rights.canEditInfo
            ? () => {
                onOpenChange(false);
                setEditOpen(true);
              }
            : undefined
        }
      />
      <GroupSettingsSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        group={group}
        title={props.title}
        avatarKind={props.avatarKind}
        rights={rights}
        onSave={save}
      />
    </>
  );
}

function ChatInfoBody({
  open,
  onOpenChange,
  title,
  avatarKind,
  avatarId,
  details,
  photoAssetId,
  imageUri,
  onEdit,
  onOpenStarred,
  starredCount,
  starredMore = false,
  members,
}: ChatInfoSheetProps & {
  onEdit?: (() => void) | undefined;
  members?: ReadonlyArray<ChatRosterMember> | undefined;
}) {
  const t = useT();
  const { locale } = useLocale();
  const countLabel =
    starredCount === undefined
      ? ""
      : `${toBnDigits(String(starredCount), locale)}${starredMore ? "+" : ""}`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.header.info")}>
      <View className="items-center gap-2 pb-2">
        <ChatAvatar
          kind={avatarKind}
          id={avatarId}
          name={title}
          size="xl"
          photoAssetId={photoAssetId}
          imageUri={imageUri}
        />
        <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
        {details.map((line) => (
          <Text key={line} className="text-center text-sm text-muted-foreground">
            {line}
          </Text>
        ))}
        {onEdit ? (
          <Button variant="outline" size="sm" className="mt-2 rounded-full" onPress={onEdit}>
            <Icon as={Pencil} size={14} className="text-foreground" />
            <Text>{t("chat.settings.edit")}</Text>
          </Button>
        ) : null}
      </View>
      {onOpenStarred ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            countLabel ? `${t("chat.starred.title")}, ${countLabel}` : t("chat.starred.title")
          }
          onPress={onOpenStarred}
          className="mb-2 mt-1 flex-row items-center gap-3 rounded-xl border border-border px-3 py-3 active:bg-muted"
        >
          <View className="size-8 items-center justify-center rounded-full bg-primary-soft">
            <Icon as={Star} size={16} className="text-primary" />
          </View>
          <Text className="min-w-0 flex-1 text-base text-foreground">
            {t("chat.starred.title")}
          </Text>
          {countLabel ? (
            <Text className="text-sm text-muted-foreground">{countLabel}</Text>
          ) : null}
          <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
        </Pressable>
      ) : null}
      {members && members.length > 0 ? (
        <View className="mt-2 gap-1">
          <Text className="px-1 pb-1 text-xs font-medium text-muted-foreground">
            {t("chat.group.members_count", { count: toBnDigits(String(members.length), locale) })}
          </Text>
          {members.map((member) => (
            <View key={member.userId} className="flex-row items-center gap-3 px-1 py-1.5">
              <UserAvatar
                name={member.name}
                id={member.userId}
                size="md"
                placeholder="person"
                uri={member.avatarUrl}
              />
              <Text className="min-w-0 flex-1 text-base text-foreground" numberOfLines={1}>
                {member.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}
