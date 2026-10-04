// Store list (CMP-AP-002): stores serving my school — INV-1 school scope.
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { ApprovedBadge } from "@/components/commerce/bits";
import { useT } from "@/i18n/locale-provider";
import { useStores } from "@/lib/commerce/use-commerce";

export default function StoreListScreen() {
  const t = useT();
  const stores = useStores();

  return (
    <Screen header={<ScreenHeader title={t("commerce.stores_title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        {stores.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </View>
        ) : (stores.data?.length ?? 0) === 0 ? (
          <EmptyState title={t("commerce.stores_empty")} />
        ) : (
          stores.data?.map((store) => (
            <Pressable
              key={store.id}
              accessibilityRole="button"
              onPress={() => {
                router.push(`/marketplace/stores/${store.id}`);
              }}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="font-semibold text-foreground">{store.nameBn}</Text>
                <ApprovedBadge />
              </View>
              {store.description ? (
                <Text className="mt-1 text-xs text-muted-foreground">{store.description}</Text>
              ) : null}
              {store.deliveryNote ? (
                <Text className="mt-1 text-xs text-foreground">{store.deliveryNote}</Text>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
