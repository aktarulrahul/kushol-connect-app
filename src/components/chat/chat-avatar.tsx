// Chat list / header avatar: WhatsApp-style person or group silhouette on a hashed soft bg when
// there is no photo (COM-AP-001 / design-reference §6.2).
import { useQuery } from "@tanstack/react-query";

import { UserAvatar, type AvatarPlaceholder } from "@/components/ui/user-avatar";
import type { ChatGroupKind } from "@/fixtures/chat";
import { openMediaUrl } from "@/lib/chat/media-pipeline";

export type ChatAvatarKind = "dm" | "group" | "official";

type ChatAvatarProps = {
  kind: ChatAvatarKind;
  name: string;
  id: string;
  imageUri?: string | null;
  /** Group photo (05 · owner 2026-10-18): an R2 image asset, resolved to a short-lived URL. */
  photoAssetId?: string | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  verified?: boolean;
  online?: boolean;
  className?: string;
};

export function chatAvatarKind(kind: ChatGroupKind): ChatAvatarKind {
  if (kind === "dm") return "dm";
  if (kind === "official") return "official";
  return "group";
}

function placeholderFor(kind: ChatAvatarKind): AvatarPlaceholder {
  return kind === "dm" ? "person" : "group";
}

export function ChatAvatar(props: ChatAvatarProps) {
  if (props.photoAssetId && !props.imageUri) {
    return <GroupPhotoAvatar {...props} photoAssetId={props.photoAssetId} />;
  }
  return <PlainChatAvatar {...props} />;
}

/** Resolves the group photo (cached ~10 min — URLs live ≈15) and falls back to the silhouette. */
function GroupPhotoAvatar({ photoAssetId, ...props }: ChatAvatarProps & { photoAssetId: string }) {
  const photo = useQuery({
    queryKey: ["chat_group_photo", photoAssetId],
    queryFn: () => openMediaUrl(photoAssetId),
    staleTime: 10 * 60_000,
    retry: false,
  });
  return <PlainChatAvatar {...props} imageUri={photo.data ?? null} />;
}

function PlainChatAvatar({
  kind,
  name,
  id,
  imageUri,
  size = "lg",
  verified,
  online,
  className,
}: ChatAvatarProps) {
  return (
    <UserAvatar
      name={name}
      id={id}
      uri={imageUri}
      size={size}
      placeholder={placeholderFor(kind)}
      verified={verified}
      online={online}
      className={className}
    />
  );
}
