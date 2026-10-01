import type { LucideIcon } from "lucide-react-native";
import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import { motion } from "@/theme/tokens";

import { Icon } from "./icon";

// Floating tab bar + FAB (DSN-AP-018, design-reference §6.1 — CircleUp 58/22): detached dark pill
// (teal-950), icon-only tabs at white 70% / active 100% with a dot under the icon, separate
// circular primary FAB to its right (hidden when the tab has no action). Labels are the tabs'
// accessible names in bn/en; every target ≥ 44pt; safe-area aware. Tabs come from the caller —
// a tab appears only once its module ships (Phase 1: Chat + Notices).

export type TabItem = { key: string; label: string; icon: LucideIcon };

function Fab({
  accessibilityLabel,
  onPress,
  icon = Plus,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="size-14 items-center justify-center rounded-full bg-primary shadow-lg active:bg-primary-hover"
      style={({ pressed }) =>
        pressed && !reduceMotion ? { transform: [{ scale: motion.pressScale }] } : null
      }
    >
      <Icon as={icon} size={24} className="text-primary-foreground" />
    </Pressable>
  );
}

function FloatingTabBar({
  tabs,
  active,
  onChange,
  fab,
  accessibilityLabel,
}: {
  tabs: readonly TabItem[];
  active: string;
  onChange: (key: string) => void;
  /** The current tab's primary action; omit to hide the FAB. */
  fab?: { accessibilityLabel: string; onPress: () => void; icon?: LucideIcon };
  accessibilityLabel: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute inset-x-0 bottom-0 flex-row items-center justify-center gap-3 px-4"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      pointerEvents="box-none"
    >
      <View
        role="tablist"
        accessibilityLabel={accessibilityLabel}
        className="flex-row items-center gap-1 rounded-full bg-tabbar px-2 py-1 shadow-lg"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              role="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(tab.key);
              }}
              className="min-h-12 min-w-12 items-center justify-center gap-1 rounded-full px-3"
            >
              <Icon
                as={tab.icon}
                size={22}
                className={cn("text-tabbar-foreground", selected ? "opacity-100" : "opacity-70")}
              />
              <View
                className={cn(
                  "size-1 rounded-full",
                  selected ? "bg-tabbar-foreground" : "bg-transparent",
                )}
              />
            </Pressable>
          );
        })}
      </View>
      {fab ? <Fab {...fab} /> : null}
    </View>
  );
}

export { Fab, FloatingTabBar };
