// My orders (CMP-AP-007): status chips, tracking line, cancel in allowed states.
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { OrderStatusChip, bnTaka } from "@/components/commerce/bits";
import { useT } from "@/i18n/locale-provider";
import { useMyOrders } from "@/lib/commerce/use-commerce";

export default function MyOrdersScreen() {
  const t = useT();
  const orders = useMyOrders();

  return (
    <Screen header={<ScreenHeader title={t("commerce.orders_title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        {orders.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </View>
        ) : (orders.data?.length ?? 0) === 0 ? (
          <EmptyState title={t("commerce.orders_empty")} />
        ) : (
          orders.data?.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              onPress={() => {
                router.push(`/marketplace/orders/${o.id}`);
              }}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="font-semibold text-foreground">{o.orderCode}</Text>
                <OrderStatusChip status={o.status} />
              </View>
              <Text className="mt-1 text-xs text-muted-foreground">{o.storefrontNameBn}</Text>
              <Text className="mt-1 text-sm tabular-nums text-foreground">{bnTaka(o.totalBdt)}</Text>
              {o.status === "shipped" && o.trackingNumber ? (
                <Text className="mt-1 text-xs text-muted-foreground">
                  {t("commerce.tracking_line", {
                    courier: o.courierName ?? "",
                    tracking: o.trackingNumber,
                  })}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
