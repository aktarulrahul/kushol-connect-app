// Create-club modal (COM-AP-015): name (3–60) → POST /chat/groups → pending-approval success
// (BR-010 / OQ-2 default). Needs connectivity — offline shows the banner and disables submit.
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { chatFixtureFlags } from "@/fixtures/chat";
import { Button } from "@/components/ui/button";
import { CircleAction } from "@/components/ui/screen-header";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useCreateClub } from "@/lib/chat/use-chat";
import { useT } from "@/i18n/locale-provider";

export default function GroupNewModal() {
  const t = useT();
  const toast = useToast();
  const create = useCreateClub();
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const offline = chatFixtureFlags.mode === "offline";
  const valid = name.trim().length >= 3 && name.trim().length <= 60;

  if (submitted) {
    return (
      <Screen header={<ScreenHeader title={t("chat.club.new_title")} />}>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text variant="h4" className="text-center">
            {t("chat.club.success_title")}
          </Text>
          <Text variant="muted" className="text-center">
            {t("chat.club.success_body")}
          </Text>
          <Button
            onPress={() => {
              router.back();
              router.back();
            }}
          >
            <Text>{t("common.actions.close")}</Text>
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title={t("chat.club.new_title")}
          leading={
            <CircleAction
              icon={ChevronLeft}
              accessibilityLabel={t("common.actions.back")}
              onPress={() => { router.back(); }}
            />
          }
        />
      }
    >
      <View className="gap-4 px-4 pt-4">
        <TextField
          label={t("chat.club.name_label")}
          description={t("chat.club.name_hint")}
          value={name}
          onChangeText={setName}
          error={name.length > 0 && !valid ? t("validation.too_short") : undefined}
        />
        {offline ? <Text className="text-sm text-warning">{t("chat.offline.refused")}</Text> : null}
        <Button
          disabled={!valid || create.isPending || offline}
          onPress={() => { create.mutate(
              { name: name.trim() },
              {
                onSuccess: () => { setSubmitted(true); },
                onError: () => { toast({ title: t("chat.state.error"), variant: "error" }); },
              },
            ); }
          }
        >
          <Text>{t("chat.club.submit")}</Text>
        </Button>
      </View>
    </Screen>
  );
}
