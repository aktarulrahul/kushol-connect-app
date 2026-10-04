// Product detail (CMP-AP-004): variant picker (unavailable = disabled + "স্টক শেষ" announced),
// qty stepper (1–10, ≥44pt), stock state, thumb-zone order CTA (disabled when out — US-015).
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { ApprovedBadge, StockStateLine, bnTaka } from "@/components/commerce/bits";
import { useT } from "@/i18n/locale-provider";
import { useProduct } from "@/lib/commerce/use-commerce";

export default function ProductDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);

  const variants = useMemo(() => product.data?.variants ?? [], [product.data]);
  const [variantId, setVariantId] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(1);

  const selected = useMemo(
    () => variants.find((v) => v.id === variantId) ?? variants.find((v) => v.stockState !== "out_of_stock"),
    [variants, variantId],
  );
  const unitPrice = (product.data?.priceBdt ?? 0) + (selected?.priceDelta ?? 0);
  const outOfStock = product.data?.stockState === "out_of_stock";

  if (product.isLoading) {
    return (
      <Screen header={<ScreenHeader title="" />}>
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (product.isError || !product.data) {
    return (
      <Screen header={<ScreenHeader title={t("commerce.product_title")} />}>
        <EmptyState title={t("common.state.error_body")} />
      </Screen>
    );
  }

  const p = product.data;

  return (
    <Screen header={<ScreenHeader title={p.storefrontNameBn} />}>
      <View className="gap-4 px-4 pb-28 pt-2">
        <View className="h-40 items-center justify-center rounded-2xl border border-border bg-muted/30">
          <Text className="text-xs text-muted-foreground">{t("commerce.image_placeholder")}</Text>
        </View>

        <View className="gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="lead" className="flex-1 text-foreground">
              {p.nameBn}
            </Text>
            <ApprovedBadge />
          </View>
          {p.nameEn ? <Text className="text-xs text-muted-foreground">{p.nameEn}</Text> : null}
          <Text className="text-lg font-semibold tabular-nums text-foreground">{bnTaka(unitPrice)}</Text>
          <StockStateLine state={p.stockState} />
          {p.deliveryNote ? <Text className="text-xs text-muted-foreground">{p.deliveryNote}</Text> : null}
        </View>

        {variants.length > 0 ? (
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">{t("commerce.variant_label")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {variants.map((v) => {
                const isOut = v.stockState === "out_of_stock";
                const active = selected?.id === v.id;
                return (
                  <Pressable
                    key={v.id}
                    accessibilityRole="button"
                    accessibilityState={{ checked: active, disabled: isOut }}
                    accessibilityLabel={`${v.name}${isOut ? ` — ${t("commerce.stock.out")}` : ""}`}
                    disabled={isOut}
                    onPress={() => {
                      setVariantId(v.id);
                    }}
                    className={`rounded-full border px-4 py-2.5 ${
                      isOut
                        ? "border-border bg-muted/40 opacity-60"
                        : active
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isOut ? "text-muted-foreground" : active ? "font-semibold text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {v.name}
                      {isOut ? ` ✕ ${t("commerce.stock.out")}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">{t("commerce.qty_label")}</Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("commerce.qty_decrease")}
              disabled={qty <= 1}
              onPress={() => {
                setQty((q) => Math.max(1, q - 1));
              }}
              className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-background"
            >
              <Text className="text-lg text-foreground">−</Text>
            </Pressable>
            <Text className="w-10 text-center text-lg tabular-nums text-foreground">
              {new Intl.NumberFormat("bn-BD").format(qty)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("commerce.qty_increase")}
              disabled={qty >= 10}
              onPress={() => {
                setQty((q) => Math.min(10, q + 1));
              }}
              className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-background"
            >
              <Text className="text-lg text-foreground">+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background p-4">
        <Button
          size="lg"
          disabled={outOfStock}
          onPress={() => {
            router.push({
              pathname: "/marketplace/checkout",
              params: {
                productId: p.id,
                variantId: selected?.id ?? "",
                qty: String(qty),
                storefrontId: p.storefrontId,
              },
            });
          }}
        >
          <Text>
            {outOfStock
              ? t("commerce.stock.out")
              : `${t("commerce.order_cta")} — ${bnTaka(unitPrice * qty)}`}
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
