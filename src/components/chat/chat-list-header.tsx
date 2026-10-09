// Chat list chrome in the Spartens language (owner 2026-10-09): the header is a search pill
// beside the notification bell (no title), and the filter chips sit at the top of the list.
import type { LucideIcon } from "lucide-react-native";
import { Search, X } from "lucide-react-native";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/ui/glass-surface";
import { Icon } from "@/components/ui/icon";
import { CircleAction } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { color } from "@/theme/tokens";

type HeaderAction = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  badge?: number;
};

export function ChatListHeader({
  query,
  onQueryChange,
  actions,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  actions: HeaderAction[];
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <GlassSurface variant="light" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-1">
        <View className="h-11 flex-1 flex-row items-center gap-2 rounded-full bg-card px-4 shadow-sm">
          <Icon as={Search} size={20} className="text-muted-foreground" />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder={t("chat.search.placeholder")}
            placeholderTextColor={color["muted-foreground"]}
            accessibilityLabel={t("common.actions.search")}
            returnKeyType="search"
            autoCorrect={false}
            className="flex-1 py-0 text-sm text-foreground"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.actions.clear")}
              onPress={() => {
                onQueryChange("");
              }}
              hitSlop={8}
            >
              <Icon as={X} size={18} className="text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>
        {actions.map((action) => (
          <CircleAction key={action.accessibilityLabel} {...action} />
        ))}
      </View>
    </GlassSurface>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  className?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      role="tablist"
      accessibilityLabel={accessibilityLabel}
      className={cn("grow-0", className)}
      contentContainerClassName="flex-row items-center gap-2 px-4 py-3"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(option.value);
            }}
            hitSlop={{ top: 8, bottom: 8 }}
            className={cn(
              "h-8 items-center justify-center rounded-full border px-3",
              selected ? "border-primary bg-primary" : "border-border bg-card",
            )}
          >
            <Text
              className={cn(
                "text-xs",
                selected ? "font-medium text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
