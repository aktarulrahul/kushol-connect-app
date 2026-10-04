// Invoice list (PAY-AP-001): due/paid tabs, ৳ bn digits, pay → pay screen; offline = cached read.
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { bnTaka } from "@/components/commerce/bits";
import { useT } from "@/i18n/locale-provider";
import { useMyInvoices } from "@/lib/payments/use-payments";

export default function PaymentsHomeScreen() {
  const t = useT();
  const invoices = useMyInvoices();
  const [tab, setTab] = useState<"due" | "paid">("due");

  const rows = useMemo(
    () =>
      (invoices.data ?? []).filter((i) =>
        tab === "due" ? i.status === "issued" || i.status === "overdue" : i.status === "paid",
      ),
    [invoices.data, tab],
  );

  const badge = (status: string) =>
    status === "paid" ? (
      <Badge variant="secondary">{t("payments.badge_paid")}</Badge>
    ) : status === "overdue" ? (
      <Badge variant="destructive">{t("payments.badge_overdue")}</Badge>
    ) : (
      <Badge variant="outline">{t("payments.badge_due")}</Badge>
    );

  return (
    <Screen header={<ScreenHeader title={t("payments.list_title")} />}>
      <View className="gap-3 px-4 pb-8 pt-2">
        <View className="flex-row gap-2">
          {(["due", "paid"] as const).map((key) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => {
                setTab(key);
              }}
              className={`rounded-full border px-4 py-2 ${tab === key ? "border-primary bg-primary" : "border-border bg-background"}`}
            >
              <Text className={`text-xs ${tab === key ? "font-semibold text-primary-foreground" : "text-muted-foreground"}`}>
                {key === "due" ? t("payments.badge_due") : t("payments.badge_paid")}
              </Text>
            </Pressable>
          ))}
        </View>

        {invoices.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </View>
        ) : rows.length === 0 ? (
          <EmptyState title={tab === "due" ? t("payments.list_empty_due") : t("payments.list_empty_paid")} />
        ) : (
          rows.map((invoice) => (
            <Pressable
              key={invoice.id}
              accessibilityRole="button"
              onPress={() => {
                router.push(`/payments/${invoice.id}`);
              }}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-semibold text-foreground">{invoice.title}</Text>
                {badge(invoice.status)}
              </View>
              <View className="mt-1 flex-row items-center justify-between gap-2">
                <Text className="text-xs text-muted-foreground">
                  {t("commerce.ordered_price")}: {new Date(invoice.dueDate).toLocaleDateString("bn-BD")}
                </Text>
                <Text className="text-sm font-semibold tabular-nums text-foreground">{bnTaka(invoice.amountBdt)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
