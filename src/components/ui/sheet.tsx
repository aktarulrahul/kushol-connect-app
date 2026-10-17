import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, ReduceMotion, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { layout, motion } from "@/theme/tokens";

import { OverlayPortal } from "./overlay-portal";
import { Text } from "./text";

// Bottom sheet on phones, centred dialog from 600pt (DSN-AP-009, 05 §6; CircleUp 25/48): grab
// handle, title, body that wraps, actions. Slides up in 240ms; appears instantly under reduced
// motion. Backdrop tap, the Android back button and the screen-reader escape gesture close it.
//
// Android (owner 2026-10-17 screenshots): sheets render through `OverlayPortal` in the app's own
// edge-to-edge window, not a `Modal` dialog window — the dialog window ended above the composer,
// so the sheet floated over the screen. Now the backdrop covers the whole display, the sheet
// meets the bottom edge and pads itself past the gesture / 3-button bar; form sheets lift above
// the keyboard; tall content scrolls inside a sheet capped at 85% of the window.

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

function Sheet({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= layout.tabletMax;
  const close = () => {
    onOpenChange(false);
  };
  const entering = (wide ? FadeIn : SlideInDown)
    .duration(motion.duration.slow)
    .reduceMotion(ReduceMotion.System);

  return (
    <OverlayPortal visible={open} onRequestClose={close} testID="sheet-overlay">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className={cn("flex-1", wide ? "items-center justify-center p-6" : "justify-end")}
      >
        <Animated.View
          entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.System)}
          className="absolute inset-0"
        >
          <Pressable
            role="button"
            accessibilityLabel={t("common.actions.close")}
            onPress={close}
            className="flex-1 bg-black/50"
          />
        </Animated.View>
        <Animated.View
          entering={entering}
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          className={cn(
            "bg-card",
            wide ? "w-full max-w-tablet rounded-2xl p-6" : "rounded-t-3xl px-4 pt-2",
          )}
          style={
            wide
              ? { maxHeight: height * 0.85 }
              : { paddingBottom: Math.max(insets.bottom, 16), maxHeight: height * 0.85 }
          }
        >
          {wide ? null : (
            <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-neutral-300" />
          )}
          <Text variant="h3">{title}</Text>
          {description ? (
            <Text variant="muted" className="mt-1">
              {description}
            </Text>
          ) : null}
          {children ? (
            <ScrollView
              className="grow-0 pt-4"
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : null}
          {footer ? (
            <View className="flex-row flex-wrap justify-end gap-2 pt-5">{footer}</View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </OverlayPortal>
  );
}

export { Sheet };
