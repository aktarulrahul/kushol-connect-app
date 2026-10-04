// Location picker (TUT-AP-003): pin + text-area alternative — location is never pointer-only
// (05 §7). The map canvas lands with expo-location at Stage 5; the in-bounds suggestion keeps
// the flow complete at 360px without a pointer.
import { useState } from "react";
import { TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";

export default function LocationPickerModal() {
  const t = useT();
  const params = useLocalSearchParams<{ area?: string }>();
  const [area, setArea] = useState(params.area ?? "");
  // Suggested in-bounds pin (Dhaka) until the map lands — BD bounds validated by the shared zod.
  const [pin] = useState({ lat: 23.7806, lng: 90.4074 });

  return (
    <Screen header={<ScreenHeader title={t("tuition.location.title")} />}>
      <View className="flex-1 gap-4 px-6 pb-8 pt-2">
        <Text variant="muted">{t("tuition.location.hint")}</Text>
        <View
          className="h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30"
          accessibilityLabel={t("tuition.wizard.pick_pin")}
        >
          <Text className="text-muted-foreground">📍 {pin.lat}, {pin.lng}</Text>
        </View>
        <TextInput
          value={area}
          onChangeText={setArea}
          placeholder={t("tuition.location.area_ph")}
          accessibilityLabel={t("tuition.location.title")}
          className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
        />
        <Button
          disabled={area.trim().length < 2}
          onPress={() => {
            router.back();
          }}
        >
          <Text>{t("tuition.location.confirm")}</Text>
        </Button>
      </View>
    </Screen>
  );
}
