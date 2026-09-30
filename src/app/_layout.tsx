import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// Root navigator. Tabs (chat · notices · ai-hub · marketplace), fonts and theme arrive with
// 02-design-system and the feature modules; this scaffold only proves the router runs.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
