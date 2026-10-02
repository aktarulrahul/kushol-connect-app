// Chat list / header avatar: WhatsApp-style person or group silhouette on a hashed soft bg when
// there is no photo (COM-AP-001 / design-reference §6.2).
import { UserAvatar, type AvatarPlaceholder } from "@/components/ui/user-avatar";
import type { ChatGroupKind } from "@/fixtures/chat";

export type ChatAvatarKind = "dm" | "group" | "official";

type ChatAvatarProps = {
  kind: ChatAvatarKind;
  name: string;
  id: string;
  imageUri?: string | null;
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

export function ChatAvatar({
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
