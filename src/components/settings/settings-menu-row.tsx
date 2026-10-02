import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { ListRow } from "@/components/ui/list-row";

/** Dense WhatsApp-style settings row: muted icon well + title + optional subtitle + chevron. */
function SettingsMenuRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <ListRow
      className="min-h-14 py-2"
      leading={
        <View className="size-9 items-center justify-center rounded-full bg-muted">
          <Icon as={icon} size={18} className="text-primary" />
        </View>
      }
      title={title}
      preview={subtitle}
      trailing={<Icon as={ChevronRight} size={18} className="text-muted-foreground" />}
      onPress={onPress}
    />
  );
}

export { SettingsMenuRow };
