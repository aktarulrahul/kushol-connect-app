import type { ReactNode } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, ReduceMotion, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { layout, motion } from "@/theme/tokens";

import { Text } from "./text";

// Bottom sheet on phones, centred dialog from 600pt (DSN-AP-009, 05 §6; CircleUp 25/48): grab
// handle, title, body that wraps, actions. Slides up in 240ms; appears instantly under reduced
// motion. Backdrop tap, the Android back button and the screen-reader escape gesture close it.

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
  const { width } = useWindowDimensions();
  const wide = width >= layout.tabletMax;
  const close = () => {
    onOpenChange(false);
  };
  const entering = (wide ? FadeIn : SlideInDown)
    .duration(motion.duration.slow)
    .reduceMotion(ReduceMotion.System);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View className={cn("flex-1", wide ? "items-center justify-center p-6" : "justify-end")}>
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
          style={wide ? undefined : { paddingBottom: Math.max(insets.bottom, 16) }}
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
          {children ? <View className="pt-4">{children}</View> : null}
          {footer ? (
            <View className="flex-row flex-wrap justify-end gap-2 pt-5">{footer}</View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

export { Sheet };
