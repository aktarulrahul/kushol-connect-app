import { useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";

import { cn } from "@/lib/utils";

import { Text } from "./text";

// One-time-code input (DSN-AP-018, design-reference §6.1 — CircleUp 8–21): 6 boxes, auto-advance
// as you type, paste and SMS autofill (oneTimeCode / sms-otp). One hidden TextInput owns the
// value so paste, autofill and the keyboard behave natively; the boxes only draw it. Accepts
// Bengali digits (০–৯) and normalises them to ASCII for the api.

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

export function normaliseDigits(raw: string): string {
  return raw.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d))).replace(/\D/g, "");
}

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Called once all boxes are filled. */
  onComplete?: (code: string) => void;
  length?: number;
  accessibilityLabel: string;
  invalid?: boolean;
  autoFocus?: boolean;
};

function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  accessibilityLabel,
  invalid = false,
  autoFocus = false,
}: OtpInputProps) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.slice(0, length).split("");

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      accessible={false}
      className="flex-row justify-center gap-2"
    >
      {Array.from({ length }, (_, i) => {
        const current = focused && i === Math.min(digits.length, length - 1);
        return (
          <View
            key={i}
            className={cn(
              "h-14 w-11 items-center justify-center rounded-lg border bg-card",
              invalid ? "border-destructive" : current ? "border-primary border-2" : "border-input",
            )}
          >
            <Text tabular className="text-2xl font-semibold">
              {digits[i] ?? ""}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          const next = normaliseDigits(text).slice(0, length);
          onChange(next);
          if (next.length === length) onComplete?.(next);
        }}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.select({ android: "sms-otp", default: "one-time-code" })}
        maxLength={length}
        accessibilityLabel={accessibilityLabel}
        caretHidden
        className="absolute inset-0 opacity-0"
      />
    </Pressable>
  );
}

export { OtpInput };
