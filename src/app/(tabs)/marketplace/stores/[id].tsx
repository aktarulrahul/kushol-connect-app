// Store page (CMP-AP-003): VendorTrustHeader + category chips + product grid (out-of-stock
// visible with label, purchase disabled — US-015).
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { ApprovedBadge, StockBadge, bnTaka } from "@/components/commerce/bits";
import { useT } from "@/i18n/locale-provider";
import { useStoreProducts } from "@/lib/commerce/use-commerce";
import { COMMERCE_CATEGORIES } from "@/schemas/commerce";

export default function StorePageScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useStoreProducts(id);
  const [category, setCategory] = useState<(typeof COMMERCE_CATEGORIES)[number] | "all">("all");

  const filtered = useMemo(
    () => (products.data ?? []).filter((p) => category === "all" || p.category === category),
    [products.data, category],
  );

  return (
    <Screen header={<ScreenHeader title={t("commerce.store_title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        <View className="rounded-2xl border border-border bg-background p-4">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-semibold text-foreground">{t("commerce.store_title")}</Text>
            <ApprovedBadge />
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">{t("commerce.trust_note")}</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === "all" }}
            onPress={() => {
              setCategory("all");
            }}
            className={`rounded-full border px-3 py-1.5 ${category === "all" ? "border-primary bg-primary" : "border-border bg-background"}`}
          >
            <Text className={`text-xs ${category === "all" ? "font-semibold text-primary-foreground" : "text-muted-foreground"}`}>
              {t("commerce.filter_all")}
            </Text>
          </Pressable>
          {COMMERCE_CATEGORIES.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: category === c }}
              onPress={() => {
                setCategory(c);
              }}
              className={`rounded-full border px-3 py-1.5 ${category === c ? "border-primary bg-primary" : "border-border bg-background"}`}
            >
              <Text className={`text-xs ${category === c ? "font-semibold text-primary-foreground" : "text-foreground"}`}>
                {t(`commerce.category.${c}` as Parameters<typeof t>[0])}
              </Text>
            </Pressable>
          ))}
        </View>

        {products.isLoading ? (
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-[48%] rounded-2xl" />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState title={t("commerce.products_coming_soon")} />
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {filtered.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.nameBn}, ${bnTaka(p.priceBdt)}, ${t(
                  p.stockState === "in_stock" ? "commerce.stock.in" : p.stockState === "low" ? "commerce.stock.low" : "commerce.stock.out",
                )}`}
                onPress={() => {
                  router.push(`/marketplace/products/${p.id}`);
                }}
                className="w-[48%] rounded-2xl border border-border bg-background p-3"
              >
                <View className="mb-2 h-20 items-center justify-center rounded-xl bg-muted/30">
                  <Text className="text-xs text-muted-foreground">{t("commerce.image_placeholder")}</Text>
                </View>
                <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                  {p.nameBn}
                </Text>
                <View className="mt-1 flex-row items-center justify-between gap-1">
                  <Text className="text-sm font-semibold tabular-nums text-foreground">{bnTaka(p.priceBdt)}</Text>
                  <StockBadge state={p.stockState} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
