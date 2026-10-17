import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

// Pinned bottom action bar (checkout, product, invoice …). The app draws edge-to-edge on Android
// (and under the iOS home indicator), so the bar pads itself by the bottom safe-area inset —
// otherwise its button sits under the gesture / 3-button navigation bar (owner 2026-10-17).
// Screens keep their scroll content clear of it through `Screen`'s bottom padding.
function BottomActionBar({
  children,
  className,
  ...rest
}: Omit<ViewProps, "style"> & { children: ReactNode; className?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...rest}
      className={cn(
        "absolute inset-x-0 bottom-0 border-t border-border bg-background px-4 pt-4",
        className,
      )}
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      {children}
    </View>
  );
}

export { BottomActionBar };
