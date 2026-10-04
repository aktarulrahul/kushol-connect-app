// Shared commerce UI bits: stock-state line (icon+text, never colour-only), status chip,
// category chips, bn-numeral ৳ text (05 §6).
import { View } from "react-native";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import type { components } from "@/api/schema.gen";

type StockState = components["schemas"]["CommerceStockState"];
type OrderStatus = components["schemas"]["CommerceOrderStatus"];

export function bnTaka(value: number): string {
  return `৳${new Intl.NumberFormat("bn-BD").format(value)}`;
}

/** Stock state: icon + bn/en text — never colour-only (CMP-US-005 / §7). */
export function StockStateLine({ state }: { state: StockState }) {
  const t = useT();
  const label =
    state === "in_stock"
      ? t("commerce.stock.in")
      : state === "low"
        ? t("commerce.stock.low")
        : t("commerce.stock.out");
  const Icon = state === "in_stock" ? CircleCheck : state === "low" ? TriangleAlert : CircleX;
  return (
    <View className="flex-row items-center gap-1.5" accessibilityLabel={label}>
      <Icon
        size={14}
        className={state === "in_stock" ? "text-primary" : state === "low" ? "text-warning" : "text-destructive"}
      />
      <Text
        className={`text-xs font-medium ${
          state === "in_stock" ? "text-primary" : state === "low" ? "text-warning" : "text-destructive"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export function StockBadge({ state }: { state: StockState }) {
  const t = useT();
  return (
    <Badge variant={state === "in_stock" ? "secondary" : state === "low" ? "outline" : "destructive"}>
      <Text className="text-xs">
        {state === "in_stock" ? t("commerce.stock.in") : state === "low" ? t("commerce.stock.low") : t("commerce.stock.out")}
      </Text>
    </Badge>
  );
}

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const t = useT();
  return (
    <Badge variant={status === "cancelled" ? "destructive" : status === "completed" ? "default" : "secondary"}>
      <Text className="text-xs">{t(`commerce.order_status.${status}` as Parameters<typeof t>[0])}</Text>
    </Badge>
  );
}

export function ApprovedBadge() {
  const t = useT();
  return (
    <View className="flex-row items-center gap-1" accessibilityLabel={t("commerce.approved_vendor")}>
      <CircleCheck size={13} className="text-primary" />
      <Text className="text-xs font-semibold text-primary">{t("commerce.approved_vendor")}</Text>
    </View>
  );
}
