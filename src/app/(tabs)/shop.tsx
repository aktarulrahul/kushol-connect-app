// Shop tab stub (owner 2026-10-02) — campus commerce lands in a later module.
import { ShoppingBag } from "lucide-react-native";

import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useT } from "@/i18n/locale-provider";

export default function ShopScreen() {
  const t = useT();
  return (
    <Screen
      // Dense tab root: override Screen's default gap-4 / py-4 / px-4 (same pattern as Chat/Feeds).
      className="gap-1 px-0 py-1"
      header={<ScreenHeader title={t("marketplace.title")} />}
    >
      <EmptyState
        icon={ShoppingBag}
        title={t("marketplace.empty")}
        description={t("marketplace.empty_body")}
        className="py-4"
      />
    </Screen>
  );
}
