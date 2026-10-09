import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import { color, layout } from "@/theme/tokens";

import { GlassSurface } from "./glass-surface";
import { Icon } from "./icon";
import { Text } from "./text";

// Tab-root header (DSN-AP-018, design-reference §6.1 — CircleUp 58): static header wash
// (teal-50 → paper, ≤ 180pt), large left-aligned title, circular outlined action(s) on the right.
// Optional leading (legacy); Chat uses title | segment filters | + only, with search under the header.

function HeaderWash() {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 top-0 h-wash"
      accessibilityElementsHidden
    >
      <Svg width="100%" height={layout.headerWash}>
        <Defs>
          <LinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.wash} />
            <Stop offset="1" stopColor={color.background} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#wash)" />
      </Svg>
    </View>
  );
}

function CircleAction({
  icon,
  accessibilityLabel,
  onPress,
  badge,
}: {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  /** Optional unread count bubble over the circle (e.g. the Home header notification bell). */
  badge?: number;
}) {
  const count = badge && badge > 0 ? (badge > 99 ? "99+" : String(badge)) : null;
  return (
    <Pressable
      role="button"
      accessibilityLabel={count ? `${accessibilityLabel}, ${count}` : accessibilityLabel}
      onPress={onPress}
      hitSlop={2}
      className="size-10 items-center justify-center rounded-full border border-input bg-card active:bg-muted"
    >
      <Icon as={icon} size={20} className="text-foreground" />
      {count ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="absolute -right-1 -top-1 z-10 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1"
        >
          <Text
            className="text-center text-[10px] font-semibold text-primary-foreground"
            style={{
              // Match glyph box to pill height so bn/en digits sit true-center
              // (same treatment as the tab-bar badge).
              lineHeight: 14,
              includeFontPadding: false,
              textAlignVertical: "center",
            }}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type HeaderAction = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  badge?: number;
};

function ScreenHeader({
  title,
  leading,
  action,
  actions,
  middle,
  children,
  className,
}: {
  title: string;
  /** e.g. the user's avatar (opens /settings — wired by 03). */
  leading?: ReactNode;
  /** Single trailing circle action (legacy). Prefer `actions` for search + compose. */
  action?: HeaderAction;
  /** Trailing circle actions, left-to-right within the trailing group. */
  actions?: HeaderAction[];
  /** Inline chrome between title and actions (e.g. compact All · Official · Community · DMs). */
  middle?: ReactNode;
  /** Content under the title row, e.g. a search field. */
  children?: ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  const trailing = actions ?? (action ? [action] : []);
  return (
    <GlassSurface
      variant="light"
      className={cn("relative", className)}
      style={{ paddingTop: insets.top }}
    >
      {Platform.OS !== "ios" ? <HeaderWash /> : null}
      <View className={cn("px-3 pb-1.5 pt-0.5", children || !middle ? "gap-1.5" : "gap-0")}>
        <View className="flex-row items-center gap-2">
          {leading}
          <Text
            variant="h2"
            className={cn(middle ? "shrink-0 text-xl" : "flex-1", "leading-7")}
            numberOfLines={1}
          >
            {title}
          </Text>
          {middle ? <View className="min-w-0 flex-1 items-center justify-center">{middle}</View> : null}
          {trailing.map((item) => (
            <CircleAction key={item.accessibilityLabel} {...item} />
          ))}
        </View>
        {children}
      </View>
    </GlassSurface>
  );
}

export { CircleAction, ScreenHeader };
