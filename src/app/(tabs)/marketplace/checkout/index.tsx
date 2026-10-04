// Checkout (CMP-AP-005/006): fulfilment picker (pickup shows store address; courier shows the
// address form), COD summary with the ৳5,000 limit copy, placement (never optimistic, §8).
import { useState } from "react";
import { TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { queueOrder, usePlaceOrder } from "@/lib/commerce/use-commerce";
import { checkoutAddress, type CheckoutAddress } from "@/schemas/commerce";

export default function CheckoutScreen() {
  const t = useT();
  const toast = useToast();
  const params = useLocalSearchParams<{ productId?: string; variantId?: string; qty?: string; storefrontId?: string }>();
  const place = usePlaceOrder();

  const [fulfilment, setFulfilment] = useState<"pickup" | "courier">("pickup");
  const [address, setAddress] = useState<CheckoutAddress>({
    recipientName: "", recipientPhone: "", city: "", area: "", addressLine: "",
  });
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [placedNotice, setPlacedNotice] = useState(false);

  const qty = Math.max(1, Math.min(10, Number(params.qty ?? "1")));

  const submit = () => {
    const productId = params.productId;
    const storefrontId = params.storefrontId;
    if (!productId || !storefrontId) return;
    if (fulfilment === "courier") {
      const parsed = checkoutAddress.safeParse(address);
      if (!parsed.success) {
        setErrorKey(parsed.error.issues[0]?.message ?? "validation.commerce.address_required");
        return;
      }
    }
    setErrorKey(null);
    place.mutate(
      {
        storefrontId,
        items: [{ productId, ...(params.variantId ? { variantId: params.variantId } : {}), qty }],
        fulfilment,
        ...(fulfilment === "courier" ? { fulfilmentAddress: address } : {}),
      },
      {
        onSuccess: (order) => {
          setPlacedNotice(true);
          setTimeout(() => { router.replace(`/marketplace/orders/${order.id}`); }, 900);
        },
        onError: (e) => {
          const fe = e as { code?: string; detail?: string };
          if (fe.code === "OUT_OF_STOCK") {
            toast({ title: `${t("commerce.out_of_stock_toast")}: ${fe.detail ?? ""}`, variant: "error" });
            return;
          }
          if (fe.detail === "validation.commerce.cod_limit") {
            setErrorKey("validation.commerce.cod_limit");
            return;
          }
          if (fe.code === "OFFLINE") {
            // §8: queue exactly once with a loud banner — replay verdicts surface later.
            queueOrder({
              storefrontId,
              items: [{ productId, ...(params.variantId ? { variantId: params.variantId } : {}), qty }],
              fulfilment,
              ...(fulfilment === "courier" ? { fulfilmentAddress: address } : {}),
            });
            setPlacedNotice(true);
            return;
          }
          toast({ title: t("common.state.error_body"), variant: "error" });
        },
      },
    );
  };

  return (
    <Screen header={<ScreenHeader title={t("commerce.checkout_title")} />}>
      <View className="gap-4 px-4 pb-8 pt-2">
        {placedNotice ? (
          <Text role="status" className="rounded-xl border border-primary/40 bg-primary-soft p-3 text-sm text-primary">
            {t("commerce.order_placed")}
          </Text>
        ) : null}
        {errorKey ? (
          <Text role="alert" className="text-sm text-destructive">
            {t(errorKey as Parameters<typeof t>[0])}
          </Text>
        ) : null}

        <Text variant="lead">{t("commerce.summary_title")}</Text>
        <View className="rounded-2xl border border-border p-4">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">{t("commerce.summary_qty", { n: qty })}</Text>
            <Text className="tabular-nums font-medium text-foreground">{t("commerce.summary_live_note")}</Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">{t("commerce.fulfilment_label")}</Text>
          <SegmentedPill
            segments={[
              { value: "pickup", label: t("commerce.fulfilment.pickup") },
              { value: "courier", label: t("commerce.fulfilment.courier") },
            ]}
            value={fulfilment}
            onChange={setFulfilment}
            accessibilityLabel={t("commerce.fulfilment_label")}
          />
        </View>

        {fulfilment === "pickup" ? (
          <View className="rounded-2xl border border-border bg-muted/30 p-4">
            <Text className="text-sm text-foreground">{t("commerce.pickup_hint")}</Text>
          </View>
        ) : (
          <View className="gap-2">
            {(
              [
                ["recipientName", t("commerce.address_name")],
                ["recipientPhone", t("commerce.address_phone")],
                ["city", t("commerce.address_city")],
                ["area", t("commerce.address_area")],
                ["addressLine", t("commerce.address_line")],
              ] as const
            ).map(([key, label]) => (
              <View key={key} className="gap-1">
                <Text className="text-xs text-muted-foreground">{label}</Text>
                <TextInput
                  value={address[key]}
                  onChangeText={(text) => { setAddress((prev) => ({ ...prev, [key]: text })); }}
                  accessibilityLabel={label}
                  keyboardType={key === "recipientPhone" ? "phone-pad" : "default"}
                  multiline={key === "addressLine"}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
                />
              </View>
            ))}
          </View>
        )}

        <View className="rounded-2xl border border-border bg-muted/30 p-4">
          <Text className="text-sm font-medium text-foreground">{t("commerce.cod_note")}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">{t("validation.commerce.cod_limit")}</Text>
        </View>
      </View>

      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background p-4">
        <Button size="lg" disabled={place.isPending || placedNotice} onPress={submit}>
          <Text>{t("commerce.place_order")}</Text>
        </Button>
      </View>
    </Screen>
  );
}
