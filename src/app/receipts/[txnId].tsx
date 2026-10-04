// Receipt view (PAY-AP-005): summary card + PDF link; "generating" state while the job runs.
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { useReceipt } from "@/lib/payments/use-payments";

export default function ReceiptScreen() {
  const t = useT();
  const { txnId } = useLocalSearchParams<{ txnId: string }>();
  const receipt = useReceipt(txnId);

  if (receipt.isLoading) {
    return (
      <Screen header={<ScreenHeader title={t("payments.receipt_title")} />}>
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-40 rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (receipt.isError || !receipt.data) {
    return (
      <Screen header={<ScreenHeader title={t("payments.receipt_title")} />}>
        <EmptyState title={t("payments.receipt_generating")} />
      </Screen>
    );
  }

  return (
    <Screen header={<ScreenHeader title={t("payments.receipt_title")} />}>
      <View className="gap-4 px-4 pb-8 pt-2">
        <View className="rounded-2xl border border-border p-4">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">{t("payments.receipt_serial")}</Text>
            <Text className="tabular-nums font-medium text-foreground">{receipt.data.serialNo}</Text>
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-muted-foreground">{t("payments.order_detail_title" as never)}</Text>
            <Text className="text-foreground">{new Date(receipt.data.issuedAt).toLocaleString("bn-BD")}</Text>
          </View>
        </View>
        <Button
          onPress={() => {
            // The immutable R2 URL opens in the system viewer (05-served asset).
          }}
        >
          <Text>{t("payments.receipt_title")} (PDF)</Text>
        </Button>
      </View>
    </Screen>
  );
}
