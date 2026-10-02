// Teacher section-notice composer (COM-US-011 in-app path): title + body → publish to the
// teacher's own section. One attachment arrives with the media flow (05 §3 forms table).
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { publishNotice } from "@/fixtures/notices";
import { Button } from "@/components/ui/button";
import { CircleAction } from "@/components/ui/screen-header";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";

const DEMO_SECTION_ID = "sec_10_a_demo_high";

export default function NoticeNewModal() {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const valid = title.trim().length >= 3 && title.trim().length <= 120 && body.trim().length >= 1;

  return (
    <Screen
      header={
        <ScreenHeader
          title={t("notices.compose.title")}
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
      <View className="gap-4 px-4 pt-4">
        <Text variant="muted">{t("notices.compose.section_only")}</Text>
        <TextField
          label={t("notices.compose.title_field")}
          value={title}
          onChangeText={setTitle}
          error={title.length > 0 && title.trim().length < 3 ? t("validation.too_short") : undefined}
        />
        <View className="gap-1.5">
          <Text>{t("notices.compose.body_field")}</Text>
          <Textarea
            accessibilityLabel={t("notices.compose.body_field")}
            value={body}
            onChangeText={setBody}
            className="min-h-32"
          />
        </View>
        <Button
          disabled={!valid}
          onPress={() => {
            void publishNotice({
              scope: "section",
              sectionId: DEMO_SECTION_ID,
              title: title.trim(),
              body: body.trim(),
              pinned: false,
            })
              .then(() => {
                toast({ title: t("notices.compose.published"), variant: "success" });
                router.back();
              })
              .catch(() => { toast({ title: t("chat.state.error"), variant: "error" }); });
          }}
        >
          <Text>{t("notices.compose.publish")}</Text>
        </Button>
      </View>
    </Screen>
  );
}
