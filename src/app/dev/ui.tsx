import { Redirect } from "expo-router";

import { UiKit } from "@/dev/ui-kit";

// Dev-only UI kit for reviewing the 02 design system on device (Gate 1). Release builds redirect
// to the home screen, so it never ships as a reachable screen.
export default function UiKitRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <UiKit />;
}
