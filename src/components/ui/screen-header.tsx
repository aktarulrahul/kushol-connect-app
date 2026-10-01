import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import { color, layout } from "@/theme/tokens";

import { Icon } from "./icon";
import { Text } from "./text";

// Tab-root header (DSN-AP-018, design-reference §6.1 — CircleUp 58): static header wash
// (teal-50 → paper, ≤ 180pt), large left-aligned title, circular outlined action on the right,
// optional avatar on the left that opens settings.

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
}: {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={2}
      className="size-10 items-center justify-center rounded-full border border-input bg-card active:bg-muted"
    >
      <Icon as={icon} size={20} className="text-foreground" />
    </Pressable>
  );
}

function ScreenHeader({
  title,
  leading,
  action,
  children,
  className,
}: {
  title: string;
  /** e.g. the user's avatar (opens /settings — wired by 03). */
  leading?: ReactNode;
  action?: { icon: LucideIcon; accessibilityLabel: string; onPress: () => void };
  /** Content under the title, e.g. a SegmentedPill. */
  children?: ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className={cn("relative bg-background", className)} style={{ paddingTop: insets.top }}>
      <HeaderWash />
      <View className="gap-4 px-4 pb-3 pt-2">
        <View className="flex-row items-center gap-3">
          {leading}
          <Text variant="h2" className="flex-1">
            {title}
          </Text>
          {action ? <CircleAction {...action} /> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

export { CircleAction, ScreenHeader };
