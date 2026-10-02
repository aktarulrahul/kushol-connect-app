import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, UIManager, View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";
import { glass } from "@/theme/tokens";

/** iOS frosted vibrancy; Android/web keep solid token backgrounds (DSN shell glass). */
export type GlassVariant = "dark" | "light";

let cachedExpoBlurNative: boolean | undefined;

/**
 * True when the iOS dev client was built with expo-blur linked. Without it, BlurView renders the
 * red "Unimplemented component" box — we fall back to solid tokens instead. Rebuild for real glass:
 * `./dev-start.sh --rebuild` (or `expo run:ios` after adding expo-blur).
 */
export function isExpoBlurNativeAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  if (cachedExpoBlurNative !== undefined) return cachedExpoBlurNative;
  try {
    cachedExpoBlurNative =
      typeof UIManager.hasViewManagerConfig === "function" &&
      UIManager.hasViewManagerConfig("ExpoBlurView");
  } catch {
    cachedExpoBlurNative = false;
  }
  return cachedExpoBlurNative;
}

/** Clears the blur availability memo (unit tests only). */
export function resetExpoBlurNativeCacheForTests(): void {
  cachedExpoBlurNative = undefined;
}

function GlassSurface({
  variant = "light",
  className,
  children,
  style,
  ...rest
}: ViewProps & {
  variant?: GlassVariant;
  className?: string;
  children?: ReactNode;
}) {
  const fallbackBg = variant === "dark" ? "bg-tabbar" : "bg-background";
  const useNativeBlur = isExpoBlurNativeAvailable();

  if (!useNativeBlur) {
    return (
      <View className={cn(fallbackBg, className)} style={style} {...rest}>
        {children}
      </View>
    );
  }

  const tint = variant === "dark" ? "dark" : "systemChromeMaterialLight";
  const overlay =
    variant === "dark" ? glass.tabbarOverlay : glass.headerOverlay;
  const intensity =
    variant === "dark" ? glass.tabbarIntensity : glass.headerIntensity;

  return (
    <View className={cn("overflow-hidden", fallbackBg, className)} style={style} {...rest}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]}
      />
      {children}
    </View>
  );
}

export { GlassSurface };
