import * as React from "react";
import { Platform, TextInput } from "react-native";

import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { fontFamily, scriptOf } from "@/theme/fonts";
import { color } from "@/theme/tokens";

// React Native Reusables Input, tuned for 02 (DSN-AP-005): 44pt tall, token border/placeholder
// colours (border meets 3:1), font face from what is typed (Bengali → Hind Siliguri) or the UI
// language when empty. Invalid state = destructive border; the message lives in <TextField>.
function Input({
  className,
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
        "min-h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2.5 text-base text-foreground",
        invalid && "border-destructive",
        props.editable === false && "opacity-50",
        Platform.select({ web: "outline-none focus-visible:border-ring" }),
        className,
      )}
      placeholderTextColor={color["muted-foreground"]}
      selectionColor={color.primary}
      textAlignVertical="center"
      style={[
        {
          fontFamily: fontFamily(script, "normal"),
          // Hind Siliguri's tall ascent adds Android's font-metric top padding — text reads
          // low/off-centre inside the 44pt field without this (single-line inputs only).
          // iOS twin: text-base's 24px line box bottoms-out the glyphs (cursor tall, text low,
          // as in Inter too); a 20px line box re-centres the run. 16pt font ⇒ 20pt line.
          ...(Platform.OS === "android" && !props.multiline ? { includeFontPadding: false } : {}),
          ...(Platform.OS === "ios" && !props.multiline ? { lineHeight: 20 } : {}),
        },
        style,
      ]}
      {...props}
    />
  );
}

export { Input };
