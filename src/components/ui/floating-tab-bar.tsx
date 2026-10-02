import type { LucideIcon } from "lucide-react-native";
import { Plus, UserRound } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatNumber } from "@/i18n";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { motion } from "@/theme/tokens";

import { GlassSurface } from "./glass-surface";
import { Icon } from "./icon";
import { Text } from "./text";
import { UserAvatar } from "./user-avatar";

// Floating tab bar (DSN-AP-018, owner shell 2026-10-02): light frosted / paper pill (not dark
// teal). Selected = primary circle + white glyph, label in primary; inactive = muted theme
// foreground. Taller vertical padding; optional You avatar; teal unread badges. ≥ 44pt targets.

export type TabAvatar = { name: string; uri?: string | null };

export type TabItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** When set (You tab), shows the signed-in user's avatar instead of the generic person icon. */
  avatar?: TabAvatar;
};

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
  const { locale } = useLocale();
  return (
    <View
      className="absolute inset-x-0 bottom-0 flex-row items-center justify-center gap-3 px-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      pointerEvents="box-none"
    >
      <GlassSurface
        variant="light"
        role="tablist"
        accessibilityLabel={accessibilityLabel}
        className="max-w-[400px] flex-1 flex-row items-stretch justify-around rounded-[32px] border border-border/60 px-1.5 py-2.5 shadow-lg"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const badge = tab.badge && tab.badge > 0 ? tab.badge : 0;
          const badgeLabel =
            badge > 99 ? `${formatNumber(locale, 99)}+` : formatNumber(locale, badge);
          const a11y = badge > 0 ? `${tab.label}, ${badgeLabel}` : tab.label;
          return (
            <Pressable
              key={tab.key}
              role="tab"
              accessibilityLabel={a11y}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(tab.key);
              }}
              className="min-h-[64px] min-w-[52px] flex-1 items-center justify-center gap-1 rounded-2xl px-0.5 py-2"
            >
              <View className="relative items-center justify-center">
                {tab.avatar?.uri ? (
                  <View
                    className={cn(
                      "items-center justify-center rounded-full p-0.5",
                      selected ? "bg-primary" : "bg-transparent",
                    )}
                  >
                    <UserAvatar
                      name={tab.avatar.name}
                      uri={tab.avatar.uri}
                      size="xs"
                      placeholder="person"
                    />
                  </View>
                ) : tab.avatar ? (
                  // No photo: WhatsApp-style silhouette; selected matches other tabs
                  // (white glyph on primary circle), not soft-tint initials.
                  <View
                    className={cn(
                      "size-10 items-center justify-center rounded-full",
                      selected ? "bg-primary" : "bg-transparent",
                    )}
                  >
                    {selected ? (
                      <Icon
                        as={UserRound}
                        size={22}
                        strokeWidth={2.35}
                        fill="currentColor"
                        className="text-primary-foreground"
                      />
                    ) : (
                      <UserAvatar name={tab.avatar.name} size="xs" placeholder="person" />
                    )}
                  </View>
                ) : (
                  <View
                    className={cn(
                      "size-10 items-center justify-center rounded-full",
                      selected ? "bg-primary" : "bg-transparent",
                    )}
                  >
                    <Icon
                      as={tab.icon}
                      size={22}
                      strokeWidth={selected ? 2.35 : 1.75}
                      fill={selected ? "currentColor" : "transparent"}
                      className={selected ? "text-primary-foreground" : "text-muted-foreground"}
                    />
                  </View>
                )}
                {badge > 0 ? (
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    className="absolute -right-1 -top-1 z-10 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1"
                  >
                    <Text
                      className="text-center text-[10px] font-semibold text-primary-foreground"
                      style={{
                        // Match glyph box to pill height so bn/en digits sit true-center
                        // (Android includeFontPadding + loose leading skews otherwise).
                        lineHeight: 14,
                        includeFontPadding: false,
                        textAlignVertical: "center",
                      }}
                    >
                      {badgeLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                className={cn(
                  "max-w-full px-0.5 text-[11px] leading-tight",
                  selected
                    ? "font-bold text-primary"
                    : "font-medium text-muted-foreground",
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </GlassSurface>
      {fab ? <Fab {...fab} /> : null}
    </View>
  );
}

export { Fab, FloatingTabBar };
