import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { TextClassContext } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { color, motion } from "@/theme/tokens";

// React Native Reusables Button, tuned for 02 (DSN-AP-004): ≥ 44pt targets; labels wrap and the
// button grows (min-h, never a fixed height) so long Bangla labels never clip; press = scale 0.97
// + opacity (design-reference §6.4), colour change only under reduced motion; loading shows a
// spinner, sets busy and blocks presses.
const buttonVariants = cva("flex-row items-center justify-center gap-2 rounded-md", {
  variants: {
    variant: {
      default: "bg-primary active:bg-primary-hover",
      destructive: "bg-destructive active:bg-destructive/90",
      outline: "border border-input bg-card active:bg-muted",
      secondary: "bg-secondary active:bg-neutral-200",
      ghost: "active:bg-muted",
      link: "",
    },
    size: {
      default: "min-h-11 px-4 py-2.5",
      sm: "min-h-9 px-3 py-1.5",
      lg: "min-h-12 px-6 py-3",
      icon: "h-11 w-11",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const buttonTextVariants = cva("text-center text-sm font-medium text-foreground", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary underline",
    },
    size: { default: "", sm: "text-xs", lg: "text-base", icon: "" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const spinnerColor = {
  default: color["primary-foreground"],
  destructive: color["destructive-foreground"],
  outline: color.foreground,
  secondary: color["secondary-foreground"],
  ghost: color.foreground,
  link: color.primary,
} as const;

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const t = useT();
  const inactive = disabled === true || loading;
  return (
    <TextClassContext value={buttonTextVariants({ variant, size })}>
      <Pressable
        role="button"
        className={cn(inactive && "opacity-50", buttonVariants({ variant, size }), className)}
        disabled={inactive}
        accessibilityState={{ disabled: inactive, busy: loading }}
        hitSlop={size === "sm" ? 4 : undefined}
        style={(state) => [
          state.pressed && !reduceMotion
            ? { transform: [{ scale: motion.pressScale }], opacity: motion.pressOpacity }
            : null,
          typeof style === "function" ? style(state) : style,
        ]}
        {...props}
      >
        {(state) => (
          <>
            {loading ? (
              <View accessibilityLabel={t("common.state.loading")}>
                <ActivityIndicator size="small" color={spinnerColor[variant ?? "default"]} />
              </View>
            ) : null}
            {typeof children === "function" ? children(state) : children}
          </>
        )}
      </Pressable>
    </TextClassContext>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
