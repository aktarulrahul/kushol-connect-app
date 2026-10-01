import type { ReactNode } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { color } from "@/theme/tokens";

import { Text } from "./text";

// Screen container (05 §6): paper background, 16pt gutters on phones, a centred 600pt column on
// tablets, safe-area padding, keyboard taps that don't eat the first press.
function Screen({
  children,
  scroll = true,
  header,
  className,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** A ScreenHeader (it handles the top inset itself). */
  header?: ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <View className={cn("w-full max-w-tablet gap-4 self-center px-4 py-4", className)}>
      {children}
    </View>
  );
  return (
    <View className="flex-1 bg-background" style={header ? undefined : { paddingTop: insets.top }}>
      {header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
}

/** Inline progress with a spoken label (never a blocking full-screen spinner — prompt.txt §3). */
function Spinner({ label, className }: { label?: string; className?: string }) {
  const t = useT();
  const text = label ?? t("common.state.loading");
  return (
    <View
      className={cn("flex-row items-center gap-2", className)}
      accessible
      accessibilityLabel={text}
    >
      <ActivityIndicator size="small" color={color.primary} />
      <Text variant="muted">{text}</Text>
    </View>
  );
}

export { Screen, Spinner };
