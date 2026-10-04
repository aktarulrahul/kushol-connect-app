import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { View } from "react-native";

import { CircleAction, ScreenHeader } from "@/components/ui/screen-header";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import type { CatalogKey } from "@/i18n";
import { useT } from "@/i18n/locale-provider";

/** Placeholder settings section (title + short bn/en body). Real copy lands with each feature. */
function SettingsStubScreen({ titleKey, bodyKey }: { titleKey: CatalogKey; bodyKey: CatalogKey }) {
  const t = useT();
  return (
    <Screen
      className="gap-1 px-0 py-1"
      header={
        <ScreenHeader
          title={t(titleKey)}
          leading={
            <CircleAction
              icon={ChevronLeft}
              accessibilityLabel={t("common.actions.back")}
              onPress={() => {
                router.back();
              }}
            />
          }
        />
      }
    >
      <View className="gap-1 px-4 pt-2">
        <Text variant="muted">{t(bodyKey)}</Text>
      </View>
    </Screen>
  );
}

export { SettingsStubScreen };
