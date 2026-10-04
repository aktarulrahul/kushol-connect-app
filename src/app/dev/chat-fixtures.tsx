// Development-only fixture switcher for the chat/notices review (Gate 1): flips the Stage-2
// seam flags so every state — offline queue, send failure, rate limits, forbidden, verified
// gate — is reviewable on device. Renders only under __DEV__ (redirect otherwise).
import { ScrollView } from "react-native";
import { Redirect } from "expo-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import {
  CHAT_FIXTURE_MODES,
  chatFixtureFlags,
  type ChatFixtureMode,
} from "@/fixtures/chat";

const LABELS: Record<ChatFixtureMode, string> = {
  success: "Success (golden path)",
  offline: "Offline (queue + banner)",
  send_failed: "Send failure (red bubble)",
  rate_limited: "Rate limited (sends + requests)",
  forbidden: "Forbidden (not a member)",
  not_verified: "Unverified (NOT_VERIFIED gate)",
};

export default function ChatFixturesScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  const current = chatFixtureFlags.mode;

  return (
    <Screen header={<ScreenHeader title="Chat fixture modes (dev)" />}>
      <ScrollView contentContainerClassName="gap-3 px-4 pb-8 pt-2">
        <Text className="text-sm text-muted-foreground">
          Stage-2 seam switches (05 `05-app-tasks.md` states). Screenshots for the module review
          toggle these; the real api replaces the seam in integration.
        </Text>
        {CHAT_FIXTURE_MODES.map((mode) => (
          <Card key={mode}>
            <CardHeader>
              <CardTitle>{LABELS[mode]}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant={current === mode ? "default" : "outline"}
                onPress={() => { chatFixtureFlags.set(mode); }}
              >
                <Text>{current === mode ? "Active" : "Activate"}</Text>
              </Button>
            </CardContent>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
