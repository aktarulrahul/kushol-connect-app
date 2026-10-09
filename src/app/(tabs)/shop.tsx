// Store tab stub (owner 2026-10-09 rev 2) — campus commerce (module 11) lands later; the tab is
// back on the bar as "Store" after a one-run hide.
import { ShoppingBag } from "lucide-react-native";

import { useNotificationBellAction } from "@/components/notifications/notification-bell";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useT } from "@/i18n/locale-provider";

export default function ShopScreen() {
  const t = useT();
  const bell = useNotificationBellAction();
  return (
    <Screen
      // Dense tab root: override Screen's default gap-4 / py-4 / px-4 (same pattern as Chat/Feeds).
      className="gap-1 px-0 py-1"
      header={<ScreenHeader title={t("marketplace.title")} action={bell} />}
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
