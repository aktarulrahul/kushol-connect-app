// Focus overlay for long-press menus (Spartens ChatItemMenu / MessageMenu, owner 2026-10-09): a
// full-window modal with a frosted (iOS, when expo-blur is linked) or dimmed backdrop, plus the
// menu card + rows and the placement maths that keeps a menu on screen next to its anchor.
import { BlurView } from "expo-blur";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ReduceMotion, ZoomIn } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { isExpoBlurNativeAvailable } from "@/components/ui/glass-surface";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { motion } from "@/theme/tokens";

export type Anchor = { x: number; y: number; width: number; height: number };

/** Menu row height (h-12) and card width (w-60) in pt — placement needs the numbers. */
export const MENU_ROW_HEIGHT = 48;
export const MENU_WIDTH = 240;
const EDGE = 12;
const GAP = 8;

export const menuEnter = ZoomIn.duration(motion.duration.base).reduceMotion(ReduceMotion.System);

/**
 * Where a menu of `height` goes: under the anchor when it fits, otherwise above it, always
 * clamped inside the safe window. `align: "end"` lines the menu's right edge up with the anchor.
 */
export function placeMenu({
  anchor,
  height,
  width = MENU_WIDTH,
  window,
  insets,
  align = "start",
}: {
  anchor: Anchor;
  height: number;
  width?: number;
  window: { width: number; height: number };
  insets: { top: number; bottom: number };
  align?: "start" | "end";
}): { top: number; left: number; below: boolean } {
  const minTop = insets.top + EDGE;
  const maxTop = Math.max(minTop, window.height - insets.bottom - height - EDGE);
  const belowTop = anchor.y + anchor.height + GAP;
  const below = belowTop <= maxTop;
  const rawTop = below ? belowTop : anchor.y - height - GAP;
  const rawLeft = align === "end" ? anchor.x + anchor.width - width : anchor.x;
  return {
    top: Math.min(Math.max(rawTop, minTop), maxTop),
    left: Math.min(Math.max(rawLeft, EDGE), window.width - width - EDGE),
    below,
  };
}

export function FocusOverlay({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const blur = isExpoBlurNativeAvailable();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.System)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          role="button"
          accessibilityLabel={t("common.actions.close")}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          {blur ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View className={cn("flex-1", blur ? "bg-black/20" : "bg-black/50")} />
        </Pressable>
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
      >
        {children}
      </View>
    </Modal>
  );
}

export function MenuCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn("w-60 overflow-hidden rounded-2xl bg-card shadow-xl", className)}>
      {children}
    </View>
  );
}

export function MenuRow({
  icon,
  label,
  onPress,
  destructive = false,
  first = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  first?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        "h-12 flex-row items-center gap-3 px-4 active:bg-muted",
        !first && "border-t border-border",
      )}
    >
      <Text
        className={cn(
          "flex-1 text-base font-medium",
          destructive ? "text-destructive" : "text-foreground",
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Icon as={icon} size={20} className={destructive ? "text-destructive" : "text-foreground"} />
    </Pressable>
  );
}
