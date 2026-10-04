// Premium upsell (TUT-AP-013, P2): the brd.md §7 proposal only — benefits are `TODO: Confirm`
// and the CTA is disabled (purchase arrives with module 12). No invented figures.
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";

export default function PremiumUpsellScreen() {
  const t = useT();
  return (
    <Screen header={<ScreenHeader title={t("tuition.premium.title")} />}>
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text variant="h2" className="text-center">
          {t("tuition.premium.price")}
        </Text>
        <Text variant="muted" className="text-center">
          {t("tuition.premium.benefits_todo")}
        </Text>
        <Button disabled className="mt-2">
          <Text>{t("tuition.premium.cta")}</Text>
        </Button>
      </View>
    </Screen>
  );
}
