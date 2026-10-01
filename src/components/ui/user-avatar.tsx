import { BadgeCheck } from "lucide-react-native";
import { View } from "react-native";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Icon } from "./icon";
import { PresenceDot } from "./indicators";
import { Text } from "./text";

// Avatar with initials fallback (Hind Siliguri for Bengali names), verified badge and presence dot
// (DSN-AP-014, design-reference §6.2: 48pt chat-list avatars, tinted initials). Initials keep whole
// grapheme clusters: "কুশল" → "কু".

const TINTS = [
  { bg: "bg-teal-100", fg: "text-teal-900" },
  { bg: "bg-neutral-200", fg: "text-neutral-800" },
  { bg: "bg-info-soft", fg: "text-info" },
  { bg: "bg-success-soft", fg: "text-success" },
  { bg: "bg-warning-soft", fg: "text-warning" },
  { bg: "bg-teal-200", fg: "text-teal-950" },
] as const;

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

export function tintFor(name: string): (typeof TINTS)[number] {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return TINTS[hash % TINTS.length] ?? TINTS[0];
}

const SIZES = {
  sm: { box: "size-8", text: "text-xs", badge: 12 },
  md: { box: "size-10", text: "text-sm", badge: 14 },
  lg: { box: "size-12", text: "text-base", badge: 16 },
  xl: { box: "size-16", text: "text-xl", badge: 18 },
} as const;

type UserAvatarProps = {
  name: string;
  uri?: string | null;
  size?: keyof typeof SIZES;
  verified?: boolean;
  online?: boolean;
  className?: string;
};

function UserAvatar({
  name,
  uri,
  size = "md",
  verified = false,
  online,
  className,
}: UserAvatarProps) {
  const t = useT();
  const s = SIZES[size];
  const tint = tintFor(name);
  const label = [name, verified ? t("common.verified") : ""].filter(Boolean).join(" — ");
  return (
    <View
      className={cn("relative", className)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Avatar alt={name} className={s.box}>
        {uri ? <AvatarImage source={{ uri }} /> : null}
        <AvatarFallback className={tint.bg}>
          <Text className={cn(s.text, "font-semibold", tint.fg)}>{initials(name)}</Text>
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
