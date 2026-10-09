// Long-press focus menu for one message (Spartens MessageMenu, owner 2026-10-09): the backdrop
// frosts the room, the pressed bubble is lifted in place (shifted only as far as needed to fit),
// the quick-reaction bar sits above it and the action list below — Reply, Edit, Pin/Unpin,
// Message info, Delete (red). Rows only appear when the action is allowed for this message.
import type { LucideIcon } from "lucide-react-native";
import { type ReactNode } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FocusOverlay,
  MENU_ROW_HEIGHT,
  MENU_WIDTH,
  MenuCard,
  MenuRow,
  menuEnter,
  type Anchor,
} from "@/components/chat/focus-overlay";
import { Text } from "@/components/ui/text";
import { REACTION_EMOJIS } from "@/fixtures/chat";
import { cn } from "@/lib/utils";
import { motion } from "@/theme/tokens";

/** Reaction bar: size-10 buttons + py-1.5 padding (pt). */
const BAR_HEIGHT = 52;
const GAP = 8;
const EDGE = 12;

export type MessageMenuAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
};

/**
 * Vertical layout for the lifted bubble: keep it where it was unless the reaction bar (above)
 * or the action list (below) would leave the safe window, then slide it just enough.
 */
export function layoutFocusMenu({
  anchor,
  menuHeight,
  showBar,
  window,
  insets,
}: {
  anchor: Anchor;
  menuHeight: number;
  showBar: boolean;
  window: { width: number; height: number };
  insets: { top: number; bottom: number };
}): { previewTop: number; barTop: number; menuTop: number } {
  const minTop = insets.top + EDGE + (showBar ? BAR_HEIGHT + GAP : 0);
  const floor = window.height - insets.bottom - EDGE;
  const maxTop = floor - (menuHeight > 0 ? menuHeight + GAP : 0) - anchor.height;
  const previewTop = maxTop >= minTop ? Math.min(Math.max(anchor.y, minTop), maxTop) : minTop;
  return {
    previewTop,
    barTop: previewTop - GAP - BAR_HEIGHT,
    menuTop: Math.min(previewTop + anchor.height + GAP, floor - menuHeight),
  };
}

export function MessageFocusMenu({
  anchor,
  align,
  preview,
  actions,
  reactions = true,
  selectedEmojis = [],
  onReact,
  onClose,
}: {
  anchor: Anchor | null;
  align: "start" | "end";
  preview: ReactNode;
  actions: readonly MessageMenuAction[];
  /** Quick reactions are off for tombstones and unsent bubbles. */
  reactions?: boolean;
  selectedEmojis?: readonly string[];
  onReact: (emoji: string) => void;
  onClose: () => void;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!anchor) return null;

  const menuHeight = actions.length * MENU_ROW_HEIGHT;
  const { previewTop, barTop, menuTop } = layoutFocusMenu({
    anchor,
    menuHeight,
    showBar: reactions,
    window,
    insets,
  });
  const clampLeft = (width: number) => {
    const raw = align === "end" ? anchor.x + anchor.width - width : anchor.x;
    return Math.min(Math.max(raw, EDGE), window.width - width - EDGE);
  };
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <FocusOverlay visible onClose={onClose}>
      <Animated.View
        pointerEvents="none"
        entering={FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.System)}
        style={{ position: "absolute", top: previewTop, left: anchor.x, width: anchor.width }}
      >
        {preview}
      </Animated.View>

      {reactions ? (
        <Animated.View
          entering={menuEnter}
          style={{
            position: "absolute",
            top: barTop,
            left: EDGE,
            right: EDGE,
            alignItems: align === "end" ? "flex-end" : "flex-start",
          }}
        >
          <View className="flex-row items-center gap-1 rounded-full bg-card px-2 py-1.5 shadow-xl">
            {REACTION_EMOJIS.map((emoji) => {
              const selected = selectedEmojis.includes(emoji);
              return (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={emoji}
                  accessibilityState={{ selected }}
                  onPress={run(() => {
                    onReact(emoji);
                  })}
                  className={cn(
                    "size-10 items-center justify-center rounded-full active:bg-muted",
                    selected && "bg-primary-soft",
                  )}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      {actions.length > 0 ? (
        <Animated.View
          entering={menuEnter}
          style={{ position: "absolute", top: menuTop, left: clampLeft(MENU_WIDTH) }}
        >
          <MenuCard>
            {actions.map((action, index) => (
              <MenuRow
                key={action.key}
                first={index === 0}
                icon={action.icon}
                label={action.label}
                destructive={action.destructive}
                onPress={run(action.onPress)}
              />
            ))}
          </MenuCard>
        </Animated.View>
      ) : null}
    </FocusOverlay>
  );
}
