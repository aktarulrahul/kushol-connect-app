import { Children } from "react";
import { View } from "react-native";

import { formatNumber } from "@/i18n";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

import { Text } from "./text";

// Chat-list indicators (DSN-AP-018, design-reference §6.2): unread count, online presence and an
// overlapping avatar stack. Counts use the locale's digits (০–৯ in bn) and cap at 99+.

function UnreadBadge({ count, className }: { count: number; className?: string }) {
  const { locale } = useLocale();
  if (count <= 0) return null;
  const label = count > 99 ? `${formatNumber(locale, 99)}+` : formatNumber(locale, count);
  return (
    <View
      className={cn("min-w-5 items-center justify-center rounded-full bg-unread px-1.5", className)}
      accessibilityLabel={label}
    >
      <Text className="text-xs font-semibold text-destructive-foreground">{label}</Text>
    </View>
  );
}

function PresenceDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      className={cn(
        "size-3 rounded-full border-2 border-card",
        online ? "bg-presence" : "bg-neutral-300",
        className,
      )}
    />
  );
}

/** Overlapping avatars + "১k+"-style overflow count. */
function AvatarStack({
  children,
  total,
  className,
}: {
  children: React.ReactNode;
  /** Total members, shown after the visible avatars when larger than what is rendered. */
  total?: number;
  className?: string;
}) {
  const { locale } = useLocale();
  const items = Children.toArray(children);
  const shown = items.length;
  const extra = total !== undefined && total > shown ? total - shown : 0;
  const compact = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", {
    notation: "compact",
  });
  return (
    <View className={cn("flex-row items-center", className)}>
      {items.map((child, i) => (
        <View key={i} className={cn("rounded-full border-2 border-card", i > 0 && "-ml-2")}>
          {child}
        </View>
      ))}
      {extra > 0 ? (
        <View className="-ml-2 size-8 items-center justify-center rounded-full border-2 border-card bg-muted">
          <Text className="text-xs font-medium text-muted-foreground">{`${compact.format(extra)}+`}</Text>
        </View>
      ) : null}
    </View>
  );
}

export { AvatarStack, PresenceDot, UnreadBadge };
