import { Slot } from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Text as RNText, type Role } from "react-native";

import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { fontFamily, scriptOf, speechLanguage, textOf, weightFromClassName } from "@/theme/fonts";

// React Native Reusables Text, tuned for 02 (DSN-AP-002/-003): variants use the token type scale;
// the font face follows the script (Bengali → Hind Siliguri, never Inter) and the weight class
// (one bundled face per weight); screen readers get the matching language. Accessibility text
// sizes are respected (no maxFontSizeMultiplier caps).
const textVariants = cva(cn("text-base text-foreground", Platform.select({ web: "select-text" })), {
  variants: {
    variant: {
      default: "",
      display: "text-4xl font-bold",
      h1: "text-3xl font-semibold",
      h2: "text-2xl font-semibold",
      h3: "text-xl font-semibold",
      h4: "text-lg font-semibold",
      p: "text-base",
      lead: "text-lg text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium",
      muted: "text-sm text-muted-foreground",
      caption: "text-xs text-muted-foreground",
      label: "text-sm font-medium",
      error: "text-sm text-destructive",
      blockquote: "border-l-2 border-border pl-3 italic",
      code: "rounded-sm bg-muted px-1.5 text-sm",
    },
  },
  defaultVariants: { variant: "default" },
});

type TextVariantProps = VariantProps<typeof textVariants>;
type TextVariant = NonNullable<TextVariantProps["variant"]>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  display: "heading",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  display: "1",
  h1: "1",
  h2: "2",
  h3: "3",
  h4: "4",
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = "default",
  tabular = false,
  style,
  ...props
}: React.ComponentProps<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
    /** Inter tabular figures for IDs and ledger numbers (design-reference §3). */
    tabular?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const { locale } = useLocale();
  const Component = asChild ? Slot : RNText;
  const classes = cn(textVariants({ variant }), textClass, className);
  const script = tabular ? "en" : scriptOf(textOf(props.children), locale);
  return (
    <Component
      className={classes}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      accessibilityLanguage={speechLanguage[script]}
      style={[
        {
          fontFamily: fontFamily(script, weightFromClassName(classes)),
          // the face already carries the weight; a weight on top would be synthesised on Android
          fontWeight: "normal",
          ...(tabular ? { fontVariant: ["tabular-nums" as const] } : {}),
        },
        style,
      ]}
      {...props}
    />
  );
}

export { Text, TextClassContext, textVariants };
