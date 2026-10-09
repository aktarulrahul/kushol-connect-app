// Chat-row long-press menu + per-chat notification sheet (Spartens ChatItemMenu, owner
// 2026-10-09): pin/unpin the chat, open notification settings (All messages / None).
import { Bell, BellOff, Check, Pin, PinOff } from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FocusOverlay,
  MENU_ROW_HEIGHT,
  MenuCard,
  MenuRow,
  menuEnter,
  placeMenu,
  type Anchor,
} from "@/components/chat/focus-overlay";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import type { ChatNotifyLevel } from "@/lib/chat/chat-state";

export function ChatRowMenu({
  anchor,
  pinned,
  muted,
  onClose,
  onTogglePin,
  onOpenNotify,
}: {
  anchor: Anchor | null;
  pinned: boolean;
  muted: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onOpenNotify: () => void;
}) {
  const t = useT();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!anchor) return null;
  const place = placeMenu({
    anchor,
    height: MENU_ROW_HEIGHT * 2,
    window,
    insets,
    align: "end",
  });
  return (
    <FocusOverlay visible onClose={onClose}>
      <Animated.View
        entering={menuEnter}
        style={{ position: "absolute", top: place.top, left: place.left }}
      >
        <MenuCard>
          <MenuRow
            first
            icon={pinned ? PinOff : Pin}
            label={pinned ? t("chat.list.unpin") : t("chat.list.pin")}
            onPress={() => {
              onClose();
              onTogglePin();
            }}
          />
          <MenuRow
            icon={muted ? BellOff : Bell}
            label={t("chat.notify.title")}
            onPress={() => {
              onClose();
              onOpenNotify();
            }}
          />
        </MenuCard>
      </Animated.View>
    </FocusOverlay>
  );
}

const LEVELS: { value: ChatNotifyLevel; labelKey: "chat.notify.all" | "chat.notify.none" }[] = [
  { value: "all", labelKey: "chat.notify.all" },
  { value: "none", labelKey: "chat.notify.none" },
];

export function NotifySettingsSheet({
  open,
  level,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  level: ChatNotifyLevel;
  onOpenChange: (open: boolean) => void;
  onSelect: (level: ChatNotifyLevel) => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.notify.title")}>
      <View accessibilityRole="radiogroup">
        {LEVELS.map((option) => {
          const selected = option.value === level;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                onSelect(option.value);
                onOpenChange(false);
              }}
              className="min-h-touch flex-row items-center justify-between border-b border-border py-3 active:opacity-70"
            >
              <Text className="text-base text-foreground">{t(option.labelKey)}</Text>
              {selected ? <Icon as={Check} size={20} className="text-primary" /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
