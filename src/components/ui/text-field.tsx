import { useEffect, useId, useRef } from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";

import { cn } from "@/lib/utils";

import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Label } from "./label";
import { Switch } from "./switch";
import { Text } from "./text";
import { Textarea } from "./textarea";

// Labelled form controls (DSN-AP-005/-007): label, helper text and error tied to the control;
// a new error is announced (iOS announcement + Android live region). Error text comes from
// `validation.*` via t() in the caller (05 §3 submission conventions).

type Chrome = {
  label: string;
  description?: string;
  /** Localized message; its presence marks the control invalid. */
  error?: string;
  required?: boolean;
  className?: string;
};

function useAnnounce(message: string | undefined) {
  const last = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (message && message !== last.current) AccessibilityInfo.announceForAccessibility(message);
    last.current = message;
  }, [message]);
}

function Help({ id, description, error }: { id: string; description?: string; error?: string }) {
  return (
    <>
      {description ? (
        <Text nativeID={`${id}-description`} variant="caption">
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text nativeID={`${id}-error`} variant="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </>
  );
}

function FieldLabel({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <Label nativeID={id}>
      {label}
      {required ? <Text className="text-destructive"> *</Text> : null}
    </Label>
  );
}

function TextField({
  label,
  description,
  error,
  required,
  className,
  ...input
}: Chrome & Omit<React.ComponentProps<typeof Input>, "invalid">) {
  const id = useId();
  useAnnounce(error);
  return (
    <View className={cn("gap-1.5", className)}>
      <FieldLabel id={id} label={label} {...(required ? { required } : {})} />
      <Input
        aria-labelledby={id}
        accessibilityLabel={label}
        accessibilityHint={error ?? description}
        invalid={Boolean(error)}
        {...input}
      />
      <Help id={id} {...(description ? { description } : {})} {...(error ? { error } : {})} />
    </View>
  );
}

function TextareaField({
  label,
  description,
  error,
  required,
  className,
  ...textarea
}: Chrome & Omit<React.ComponentProps<typeof Textarea>, "invalid">) {
  const id = useId();
  useAnnounce(error);
  return (
    <View className={cn("gap-1.5", className)}>
      <FieldLabel id={id} label={label} {...(required ? { required } : {})} />
      <Textarea
        aria-labelledby={id}
        accessibilityLabel={label}
        accessibilityHint={error ?? description}
        invalid={Boolean(error)}
        {...textarea}
      />
      <Help id={id} {...(description ? { description } : {})} {...(error ? { error } : {})} />
    </View>
  );
}

/** Checkbox or switch with its label beside it; the whole row is one ≥ 44pt target. */
function ToggleField({
  kind = "checkbox",
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: Omit<Chrome, "error" | "required"> & {
  kind?: "checkbox" | "switch";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Pressable
      role={kind}
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        onCheckedChange(!checked);
      }}
      className={cn("min-h-11 flex-row items-center gap-3", disabled && "opacity-50", className)}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {kind === "switch" ? (
          <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        ) : (
          <Checkbox checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text nativeID={id} className="text-base">
          {label}
        </Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>
    </Pressable>
  );
}

export { TextareaField, TextField, ToggleField };
