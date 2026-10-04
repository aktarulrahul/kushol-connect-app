// Communities tab stub (owner 2026-10-02) — school/club communities land in a later module.
import { UsersRound } from "lucide-react-native";

import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useT } from "@/i18n/locale-provider";

export default function CommunitiesScreen() {
  const t = useT();
  return (
    <Screen
      // Dense tab root: override Screen's default gap-4 / py-4 / px-4 (same pattern as Chat/Feeds).
      className="gap-1 px-0 py-1"
      header={<ScreenHeader title={t("school.communities_title")} />}
    >
      <EmptyState
        icon={UsersRound}
        title={t("school.communities_empty")}
        description={t("school.communities_empty_body")}
        className="py-4"
      />
    </Screen>
  );
}
