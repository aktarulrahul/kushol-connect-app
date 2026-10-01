import { Inbox } from "lucide-react-native";

import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useT } from "@/i18n/locale-provider";

// Chat tab placeholder — the surface arrives with 05 (Phase 1 tabs: Chat + Notices, 05 §6.1).
// Present so the identity gate and the floating tab bar are reviewable end-to-end in module 03.
export default function ChatScreen() {
  const t = useT();
  return (
    <Screen header={<ScreenHeader title={t("chat.tab")} />}>
      <EmptyState
        icon={Inbox}
        title={t("common.coming_soon")}
        description={t("common.state.empty_body")}
      />
    </Screen>
  );
}
