// Pay screen (PAY-AP-002/007): amount breakdown + gateway chooser; money is never optimistic and
// never queued offline (§8); CONFLICT → already-paid state; gateway-down hides the chooser path.
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { bnTaka } from "@/components/commerce/bits";
import { useT } from "@/i18n/locale-provider";
import { useInitiate, useInvoice } from "@/lib/payments/use-payments";

const GATEWAYS = ["sslcommerz", "bkash", "nagad"] as const;

export default function PayScreen() {
  const t = useT();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const invoice = useInvoice(invoiceId);
  const initiate = useInitiate();

  const [gateway, setGateway] = useState<(typeof GATEWAYS)[number]>("sslcommerz");
  const [hidden, setHidden] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const fee = invoice.data?.amountBdt ?? 0;
  const total = useMemo(() => fee, [fee]); // convenience fee is 0 (off) — PAY-BR-008
  const paid = invoice.data?.status === "paid";
  const voided = invoice.data?.status === "void";

  if (invoice.isLoading) {
    return (
      <Screen header={<ScreenHeader title={t("payments.pay_title")} />}>
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </View>
      </Screen>
    );
  }
  if (invoice.isError || !invoice.data) {
    return (
      <Screen header={<ScreenHeader title={t("payments.pay_title")} />}>
        <EmptyState title={t("payments.not_allowed")} />
      </Screen>
    );
  }

  const pay = () => {
    initiate.mutate(
      { invoiceId: invoiceId, gateway },
      {
        onSuccess: (payload) => {
          // expo-web-browser hosts the gateway page; the return lands on the status screen.
          router.push(`/payments/status/${payload.txnId}`);
        },
        onError: (e) => {
          const fe = e as { code?: string; detail?: string };
          if (fe.code === "CONFLICT") {
            setErrorKey("payments.already_paid");
            return;
          }
          if (fe.code === "FORBIDDEN") {
            setErrorKey("payments.not_allowed");
            return;
          }
          if (fe.detail?.startsWith("PAYMENT_FAILED:")) {
            setHidden(fe.detail.slice("PAYMENT_FAILED:".length));
            setErrorKey("payments.gateway_down");
            return;
          }
          setErrorKey("payments.gateway_down");
        },
      },
    );
  };

  return (
    <Screen header={<ScreenHeader title={invoice.data.title} />}>
      <View className="gap-4 px-4 pb-28 pt-2">
        {errorKey ? (
          <Text role="alert" className="text-sm text-destructive">
            {t(errorKey as Parameters<typeof t>[0])}
          </Text>
        ) : null}
        {paid || voided ? (
          <EmptyState title={paid ? t("payments.already_paid") : t("payments.not_allowed")} />
        ) : (
          <>
            <View className="rounded-2xl border border-border p-4">
              <Text className="mb-2 text-sm font-medium text-foreground">{t("payments.amount_breakdown")}</Text>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">{t("payments.fee_line")}</Text>
                <Text className="tabular-nums text-foreground">{bnTaka(fee)}</Text>
              </View>
              <View className="mt-1 border-t border-dashed border-border pt-1" />
              <View className="mt-1 flex-row justify-between">
                <Text className="font-semibold text-foreground">{t("payments.total_line")}</Text>
                <Text className="tabular-nums font-semibold text-foreground">{bnTaka(total)}</Text>
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">{t("payments.gateway_label")}</Text>
              {GATEWAYS.filter((g) => hidden !== g).map((g, i) => (
                <Pressable
                  key={g}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: gateway === g }}
                  accessibilityLabel={`${t(`payments.gateway.${g}` as Parameters<typeof t>[0])} — ${bnTaka(total)}`}
                  onPress={() => {
                    setGateway(g);
                  }}
                  className={`flex-row items-center gap-3 rounded-2xl border p-4 ${
                    gateway === g ? "border-primary bg-primary-soft" : "border-border bg-background"
                  }`}
                >
                  <View className={`h-4 w-4 rounded-full border ${gateway === g ? "border-primary bg-primary" : "border-border"}`} />
                  <Text className="flex-1 text-sm font-medium text-foreground">
                    {t(`payments.gateway.${g}` as Parameters<typeof t>[0])}
                  </Text>
                  {i === 0 ? null : null}
                </Pressable>
              ))}
            </View>
            <Text className="text-xs text-muted-foreground">{t("payments.security_note")}</Text>
          </>
        )}
      </View>

      {!paid && !voided ? (
        <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background p-4">
          <Button size="lg" disabled={initiate.isPending} onPress={pay}>
            <Text>{t("payments.pay_now")} — {bnTaka(total)}</Text>
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}
