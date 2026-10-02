// Notice detail (COM-AP-012/US-012): title, author + role, published date, plain-text body,
// attachment viewer entry; a removed notice shows the dedicated removed state.
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, FileText } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";

import { listNotices } from "@/fixtures/notices";
import { Badge } from "@/components/ui/badge";
import { CircleAction } from "@/components/ui/screen-header";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";

export default function NoticeDetailScreen() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const board = useQuery({ queryKey: ["notices", "board"], queryFn: () => listNotices() });
  const [deleted] = useState(false);

  const notice = board.data?.find((n) => n.id === id) ?? null;
  const gone = deleted || (board.isSuccess && !notice);

  return (
    <Screen
      header={
        <View className="flex-row items-center gap-2 px-2 pb-2 pt-12">
          <CircleAction
            icon={ChevronLeft}
            accessibilityLabel={t("common.actions.back")}
            onPress={() => { router.back(); }}
          />
          <Text numberOfLines={1} className="flex-1 font-semibold text-foreground">
            {t("notices.title")}
          </Text>
        </View>
      }
    >
      {board.isLoading ? (
        <View className="gap-3 px-4 pt-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 rounded-2xl" />
        </View>
      ) : gone ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text variant="h4" className="text-center">
            {t("notices.removed")}
          </Text>
        </View>
      ) : notice ? (
        <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-2">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              {notice.pinned ? <Badge>📌 {t("notices.pin")}</Badge> : null}
              <Badge variant="outline">
                {notice.scope === "school" ? t("notices.scope.school") : t("notices.scope.section")}
              </Badge>
            </View>
            <Text variant="h3">{notice.title}</Text>
            <Text variant="muted">
              {notice.author.name} ·{" "}
              {notice.author.role === "teacher" ? t("notices.role.teacher") : t("notices.role.school_admin")} ·{" "}
              {new Date(notice.publishedAt).toLocaleString("bn-BD")}
            </Text>
          </View>
          <Text className="text-base leading-6 text-foreground">{notice.body}</Text>
          {notice.attachment ? (
            <NoticeAttachment fileName={notice.attachment.fileName ?? "PDF"} kind={notice.attachment.kind} assetId={notice.attachment.assetId} />
          ) : null}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function NoticeAttachment({ fileName, kind, assetId }: { fileName: string; kind: string; assetId: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fileName}
      onPress={() => { router.push({ pathname: "/(modals)/media-viewer", params: { assetId, title: fileName, kind } }); }}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3 active:opacity-80"
    >
      <FileText size={22} className="text-primary" />
      <View className="flex-1">
        <Text numberOfLines={1} className="font-medium text-foreground">
          {fileName}
        </Text>
        <Text className="text-xs text-muted-foreground">{kind.toUpperCase()}</Text>
      </View>
      <Text className="text-xs font-semibold text-primary">{t("common.actions.next")} →</Text>
    </Pressable>
  );
}
