import { BadgeCheck, UserRound, UsersRound } from "lucide-react-native";
import { View } from "react-native";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { avatarTintFor } from "@/theme/tokens";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Icon } from "./icon";
import { PresenceDot } from "./indicators";
import { Text } from "./text";

// Avatar with image, WhatsApp-style silhouette placeholders, or initials fallback
// (DSN-AP-014, design-reference §6.2: 48pt chat-list avatars). Initials keep whole grapheme
// clusters: "কুশল" → "কু". Dynamic soft bg from `avatarPalette` (hash of id/name).

// Hermes does not provide Intl.Segmenter on every React Native runtime — guard construction and
// fall back to code-point splitting.
const segmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : undefined;

function firstGrapheme(word: string): string {
  if (segmenter) {
    for (const { segment } of segmenter.segment(word)) return segment;
    return "";
  }
  return Array.from(word)[0] ?? "";
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return picked
    .map((w) => firstGrapheme(w ?? ""))
    .join("")
    .toLocaleUpperCase();
}

/** @deprecated Prefer `avatarTintFor` from `@/theme/tokens` — kept for call sites / tests. */
export function tintFor(seed: string) {
  return avatarTintFor(seed);
}

const SIZES = {
  xs: { box: "size-7", text: "text-[10px]", badge: 10, icon: 14 },
  sm: { box: "size-8", text: "text-xs", badge: 12, icon: 16 },
  md: { box: "size-10", text: "text-sm", badge: 14, icon: 20 },
  lg: { box: "size-12", text: "text-base", badge: 16, icon: 24 },
  xl: { box: "size-16", text: "text-xl", badge: 18, icon: 32 },
} as const;

export type AvatarPlaceholder = "initials" | "person" | "group";

type UserAvatarProps = {
  name: string;
  /** Stable seed for palette hash; falls back to `name`. Prefer chat/user id when known. */
  id?: string;
  uri?: string | null;
  size?: keyof typeof SIZES;
  /** No-photo fallback: silhouette icons (WhatsApp) or initials. Default initials. */
  placeholder?: AvatarPlaceholder;
  verified?: boolean;
  online?: boolean;
  className?: string;
};

function UserAvatar({
  name,
  id,
  uri,
  size = "md",
  placeholder = "initials",
  verified = false,
  online,
  className,
}: UserAvatarProps) {
  const t = useT();
  const s = SIZES[size];
  const tint = avatarTintFor(id ?? name);
  const label = [name, verified ? t("common.verified") : ""].filter(Boolean).join(" — ");
  const IconGlyph = placeholder === "group" ? UsersRound : UserRound;

  return (
    <View
      className={cn("relative", className)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Avatar alt={name} className={s.box}>
        {uri ? <AvatarImage source={{ uri }} /> : null}
        <AvatarFallback style={{ backgroundColor: tint.bg }}>
          {placeholder !== "initials" ? (
            // Direct Lucide — avoid Icon's `text-foreground` fighting the hashed tint.fg.
            <IconGlyph size={s.icon} color={tint.fg} />
          ) : (
            <Text className={cn(s.text, "font-semibold")} style={{ color: tint.fg }}>
              {initials(name)}
            </Text>
          )}
        </AvatarFallback>
      </Avatar>
      {verified ? (
        <View className="absolute -right-0.5 -top-0.5 rounded-full bg-card p-px">
          <Icon as={BadgeCheck} size={s.badge} className="text-primary" />
        </View>
      ) : null}
      {online !== undefined ? (
        <PresenceDot online={online} className="absolute bottom-0 right-0" />
      ) : null}
    </View>
  );
}

export { UserAvatar };
