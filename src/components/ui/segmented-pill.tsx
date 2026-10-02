import { Pressable, View } from "react-native";

import { LOCALES } from "@/i18n";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

import { Text } from "./text";

// Segmented pill filter (DSN-AP-018, design-reference §6.1 — CircleUp 58): light track, filled
// teal pill for the active segment; tablist semantics; each segment ≥ 44pt tall.

type Segment<T extends string> = { value: T; label: string; lang?: "bn" | "en" };

function SegmentedPill<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  className,
  size = "default",
}: {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  className?: string;
  /** Compact = WhatsApp-dense header chrome (All · Official · Community · DMs inline). */
  size?: "default" | "compact";
}) {
  const compact = size === "compact";
  return (
    <View
      role="tablist"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "flex-row self-start rounded-full bg-muted",
        compact ? "p-0.5" : "p-1",
        className,
      )}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            role="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              onChange(s.value);
            }}
            className={cn(
              "items-center justify-center rounded-full",
              compact ? "min-h-8 px-2" : "min-h-10 px-4",
              active ? "bg-primary" : "active:bg-neutral-200",
            )}
            hitSlop={2}
          >
            <Text
              className={cn(
                "font-medium",
                compact ? "text-[11px]" : "text-sm",
                active ? "text-primary-foreground" : "text-muted-foreground",
              )}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** বাংলা / English switch — each option written in its own language (02 `05` §3 "Language"). */
function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <SegmentedPill
      className={className}
      accessibilityLabel={t("common.language.label")}
      value={locale}
      onChange={setLocale}
      segments={LOCALES.map((l) => ({
        value: l,
        label: t(l === "bn" ? "common.language.bn" : "common.language.en"),
      }))}
    />
  );
}

export { LanguageToggle, SegmentedPill };
