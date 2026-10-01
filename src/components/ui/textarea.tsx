import * as React from "react";
import { Platform, TextInput } from "react-native";

import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { fontFamily, scriptOf } from "@/theme/fonts";
import { color } from "@/theme/tokens";

// React Native Reusables Textarea, tuned for 02 (DSN-AP-005): same font and colour rules as Input.
function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }),
  invalid = false,
  style,
  ...props
}: React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput> & {
    invalid?: boolean;
  }) {
  const { locale } = useLocale();
  const script = scriptOf(props.value ?? props.defaultValue ?? props.placeholder ?? "", locale);
  return (
    <TextInput
      className={cn(
        "min-h-24 w-full rounded-md border border-input bg-card px-3 py-2.5 text-base text-foreground",
        invalid && "border-destructive",
        props.editable === false && "opacity-50",
        Platform.select({ web: "outline-none focus-visible:border-ring" }),
        className,
      )}
      placeholderTextColor={color["muted-foreground"]}
      selectionColor={color.primary}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      style={[{ fontFamily: fontFamily(script, "normal") }, style]}
      {...props}
    />
  );
}

export { Textarea };
