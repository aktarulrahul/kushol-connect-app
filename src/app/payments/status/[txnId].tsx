// Status screen (PAY-AP-004): poll ×20 → success/receipt, failure/retry, "we'll notify you".
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { getInvoiceStatus } from "@/fixtures/payments";

type Phase = "processing" | "success" | "failed";

export default function PaymentStatusScreen() {
  const t = useT();
  const { invoiceId, txnId } = useLocalSearchParams<{ invoiceId?: string; txnId?: string }>();
  const [phase, setPhase] = useState<Phase>("processing");

  useEffect(() => {
    let alive = true;
    let tries = 0;
    const id = invoiceId ?? "";
    const poll = async () => {
      if (!id || tries >= 20) return;
      tries += 1;
      try {
        const status = await getInvoiceStatus(id);
        if (!alive) return;
        if (status.status === "paid") {
          setPhase("success");
          return;
        }
        if (status.status === "void") {
          setPhase("failed");
          return;
        }
      } catch {
        // keep polling — the push + webhook are the backstop
      }
      setTimeout(() => { void poll(); }, 3000);
    };
    const kick = (): void => {
      void poll();
    };
    kick();
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  return (
    <Screen header={<ScreenHeader title={t("payments.pay_title")} />}>
      <View className="flex-1 items-center justify-center gap-4 px-6">
        {phase === "processing" ? (
          <Text accessibilityLiveRegion="polite" variant="lead" className="text-center text-foreground">
            {t("payments.processing")}
          </Text>
        ) : phase === "success" ? (
          <>
            <Text variant="h3" className="text-center text-primary">
              ✓ {t("payments.success")}
            </Text>
            <Button
              onPress={() => {
                router.push(`/receipts/${txnId ?? ""}`);
              }}
            >
              <Text>{t("payments.view_receipt")}</Text>
            </Button>
          </>
        ) : (
          <>
            <Text variant="h3" className="text-center text-destructive">
              ✗ {t("payments.failed")}
            </Text>
            <Button
              variant="outline"
              onPress={() => {
                router.back();
              }}
            >
              <Text>{t("payments.retry")}</Text>
            </Button>
          </>
        )}
        <Button variant="ghost" onPress={() => { router.dismiss(); }}>
          <Text>{t("payments.back_home")}</Text>
        </Button>
      </View>
    </Screen>
  );
}
