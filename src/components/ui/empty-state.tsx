import { CircleAlert, Inbox, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Icon } from "./icon";
import { Text } from "./text";

// Empty and error states (DSN-AP-013, 02 `06` §6): icon, bn-first title and body, one action.
// Defaults come from `common.state.*`.

function EmptyState({
  icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <View className={cn("items-center gap-3 px-6 py-10", className)}>
      <View className="size-12 items-center justify-center rounded-full bg-muted">
        <Icon as={icon} size={24} className="text-muted-foreground" />
      </View>
      <Text variant="h4" className="text-center">
        {title ?? t("common.state.empty_title")}
      </Text>
      <Text variant="muted" className="text-center">
        {description ?? t("common.state.empty_body")}
      </Text>
      {action ? <View className="pt-2">{action}</View> : null}
    </View>
  );
}

function ErrorState({
  title,
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useT();
  return (
    <View accessibilityLiveRegion="polite" role="alert" className={className}>
      <EmptyState
        icon={CircleAlert}
        title={title ?? t("common.state.error_title")}
        description={description ?? t("common.state.error_body")}
        action={
          onRetry ? (
            <Button variant="outline" onPress={onRetry}>
              <Text>{t("common.actions.retry")}</Text>
            </Button>
          ) : undefined
        }
      />
    </View>
  );
}

export { EmptyState, ErrorState };
