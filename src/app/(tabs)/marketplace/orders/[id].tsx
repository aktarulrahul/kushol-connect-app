// Order detail (CMP-AP-008): status timeline, snapshot items ("যে দামে অর্ডার হয়েছিল"),
// pickup instructions / tracking, cancel in allowed states (buyer reason optional).
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { OrderStatusChip, bnTaka } from "@/components/commerce/bits";
import { useT } from "@/i18n/locale-provider";
import { useCancelOrder, useMyOrder } from "@/lib/commerce/use-commerce";

const TIMELINE: Array<{ key: "placedAt" | "confirmedAt" | "readyAt" | "shippedAt" | "completedAt" | "cancelledAt"; labelKey: string }> = [
  { key: "placedAt", labelKey: "commerce.order_status.placed" },
  { key: "confirmedAt", labelKey: "commerce.order_status.confirmed" },
  { key: "readyAt", labelKey: "commerce.order_status.ready_for_pickup" },
  { key: "shippedAt", labelKey: "commerce.order_status.shipped" },
  { key: "completedAt", labelKey: "commerce.order_status.completed" },
];

export default function OrderDetailScreen() {
  const t = useT();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useMyOrder(id);
  const cancel = useCancelOrder();
  const [cancelOpen, setCancelOpen] = useState(false);

  if (order.isLoading) {
    return (
      <Screen header={<ScreenHeader title="" />}>
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (order.isError || !order.data) {
    return (
      <Screen header={<ScreenHeader title={t("commerce.order_detail_title")} />}>
        <EmptyState title={t("common.state.error_body")} />
      </Screen>
    );
  }

  const o = order.data;
  const cancellable = ["placed", "confirmed", "ready_for_pickup"].includes(o.status);

  return (
    <Screen header={<ScreenHeader title={o.orderCode} />}>
      <View className="gap-4 px-4 pb-8 pt-2">
        <View className="flex-row items-center justify-between gap-2">
          <OrderStatusChip status={o.status} />
          <Text className="tabular-nums text-lg font-semibold text-foreground">{bnTaka(o.totalBdt)}</Text>
        </View>

        {o.status === "ready_for_pickup" ? (
          <View className="rounded-2xl border border-primary/40 bg-primary-soft p-4">
            <Text className="text-sm font-medium text-primary">{t("commerce.pickup_instructions")}</Text>
            <Text className="mt-1 text-sm text-foreground">{o.storefrontNameBn}</Text>
          </View>
        ) : null}

        {o.status === "shipped" && o.trackingNumber ? (
          <Text className="text-sm text-foreground">
            {t("commerce.tracking_line", { courier: o.courierName ?? "", tracking: o.trackingNumber })}
          </Text>
        ) : null}

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">{t("commerce.items_title")}</Text>
          {o.items.map((item, i) => (
            <View key={`${item.productId}-${String(i)}`} className="rounded-xl border border-border p-3">
              <Text className="font-medium text-foreground">
                {item.snapshot.nameBn}
                {item.snapshot.variantName ? ` · ${item.snapshot.variantName}` : ""}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t("commerce.ordered_price")}: {bnTaka(item.unitPriceBdt)} × {new Intl.NumberFormat("bn-BD").format(item.qty)}
              </Text>
            </View>
          ))}
        </View>

        <View className="rounded-2xl border border-border p-4">
          <Text className="mb-2 text-sm font-medium text-foreground">{t("commerce.timeline_title")}</Text>
          {TIMELINE.map((step) =>
            o[step.key] ? (
              <Text key={step.key} className="text-xs text-muted-foreground">
                ✓ {t(step.labelKey as Parameters<typeof t>[0])} —{" "}
                {new Date(o[step.key] as string).toLocaleString("bn-BD")}
              </Text>
            ) : null,
          )}
          {o.cancelledAt ? (
            <Text className="text-xs text-destructive">
              ✓ {t("commerce.order_status.cancelled")}
              {o.cancelReason ? ` — ${o.cancelReason}` : ""}
            </Text>
          ) : null}
        </View>

        {cancellable ? (
          <Button variant="ghost" onPress={() => { setCancelOpen(true); }} disabled={cancel.isPending}>
            <Text className="text-destructive">{t("commerce.cancel_order")}</Text>
          </Button>
        ) : null}
      </View>

      <ConfirmModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("commerce.cancel_confirm_title")}
        description={t("commerce.cancel_confirm_body")}
        confirmLabel={t("commerce.cancel_order")}
        destructive
        onConfirm={() => {
          cancel.mutate(
            { id: o.id },
            {
              onSuccess: () => { setCancelOpen(false); },
              onError: () => {
                setCancelOpen(false);
                toast({ title: t("commerce.order_changed"), variant: "error" });
              },
            },
          );
        }}
      />
    </Screen>
  );
}
