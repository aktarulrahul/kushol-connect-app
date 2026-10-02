// You / Users tab — WhatsApp-style profile header + settings menu (owner 2026-10-02).
// Account opens the existing /settings screen; other rows are stub section screens.
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  Database,
  KeyRound,
  Lock,
  MessageCircle,
  Palette,
  CircleHelp,
} from "lucide-react-native";

import { SettingsMenuRow } from "@/components/settings/settings-menu-row";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useT } from "@/i18n/locale-provider";

const MENU = [
  {
    key: "account",
    icon: KeyRound,
    titleKey: "settings.menu.account",
    subtitleKey: "settings.menu.account_hint",
    href: "/settings",
  },
  {
    key: "privacy",
    icon: Lock,
    titleKey: "settings.menu.privacy",
    subtitleKey: "settings.menu.privacy_hint",
    href: "/settings/privacy",
  },
  {
    key: "chat",
    icon: MessageCircle,
    titleKey: "settings.menu.chat",
    subtitleKey: "settings.menu.chat_hint",
    href: "/settings/chat",
  },
  {
    key: "appearance",
    icon: Palette,
    titleKey: "settings.menu.appearance",
    subtitleKey: "settings.menu.appearance_hint",
    href: "/settings/appearance",
  },
  {
    key: "notifications",
    icon: Bell,
    titleKey: "settings.menu.notifications",
    subtitleKey: "settings.menu.notifications_hint",
    href: "/settings/notifications",
  },
  {
    key: "storage",
    icon: Database,
    titleKey: "settings.menu.storage",
    subtitleKey: "settings.menu.storage_hint",
    href: "/settings/storage",
  },
  {
    key: "help",
    icon: CircleHelp,
    titleKey: "settings.menu.help",
    subtitleKey: "settings.menu.help_hint",
    href: "/settings/help",
  },
] as const;

export default function YouScreen() {
  const t = useT();
  const me = useAuthStore((s) => s.me);
  const name = me?.fullName ?? t("settings.you_title");
  // Optional subtitle only when the account already has a masked phone — no invented status.
  const subtitle = me?.maskedPhone;

  return (
    <Screen
      // Dense tab root: override Screen's default gap-4 / py-4 / px-4 (same pattern as Chat/Feeds).
      className="gap-1 px-0 py-1"
      header={<ScreenHeader title={t("settings.you_title")} />}
    >
      <Pressable
        role="button"
        accessibilityLabel={t("settings.profile_a11y")}
        onPress={() => {
          router.push("/settings");
        }}
        className="flex-row items-center gap-3 px-4 py-3 active:bg-muted"
      >
        {/* No photo on User yet — person silhouette matches the You tab bar placeholder. */}
        <UserAvatar name={name} id={me?.id} size="xl" placeholder="person" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-lg font-semibold" numberOfLines={1}>
            {name}
          </Text>
          {subtitle ? (
            <Text variant="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View className="gap-0.5 pt-1">
        {MENU.map((item) => (
          <SettingsMenuRow
            key={item.key}
            icon={item.icon}
            title={t(item.titleKey)}
            subtitle={t(item.subtitleKey)}
            onPress={() => {
              router.push(item.href);
            }}
          />
        ))}
      </View>
    </Screen>
  );
}
