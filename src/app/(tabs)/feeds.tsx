// Feeds tab — banner / ads / message requests (owner 2026-10-02). Official school notices live
// on the Notifications tab. Badge count = pending received requests from chat fixtures.
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Newspaper } from "lucide-react-native";

import { RequestCard } from "@/components/chat/request-card";
import { OfflineBanner } from "@/components/chat/chrome";
import { chatFixtureFlags, type MessageRequest } from "@/fixtures/chat";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { useAcceptRequest, useDeclineRequest, useMessageRequests } from "@/lib/chat/use-chat";

export default function FeedsScreen() {
  const t = useT();
  const requests = useMessageRequests();
  const accept = useAcceptRequest();
  const decline = useDeclineRequest();
  const toast = useToast();
  const offline = chatFixtureFlags.mode === "offline";

  const refuseOffline = (): boolean => {
    if (offline) {
      toast({ title: t("chat.offline.refused"), variant: "warning" });
      return true;
    }
    return false;
  };

  const received = requests.data?.received ?? [];
  const sent = requests.data?.sent ?? [];
  const hasRequests = received.length + sent.length > 0;

  return (
    <Screen
      // Dense list: override Screen's default gap-4 / py-4 / px-4 (same pattern as Chat).
      className="flex-1 gap-1 px-0 py-1"
      header={<ScreenHeader title={t("notifications.title")} />}
    >
      <OfflineBanner visible={offline} />
      {requests.isLoading ? (
        <View className="gap-1.5 px-3 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </View>
      ) : (
        <ScrollView contentContainerClassName="pb-8">
          {hasRequests ? (
            <>
              <Text className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("notifications.requests_section")}
              </Text>
              {received.map((request: MessageRequest) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  direction="received"
                  busy={accept.isPending || decline.isPending}
                  onAccept={(r) => {
                    if (refuseOffline()) return;
                    accept.mutate(r.id, {
                      onSuccess: (decision) => {
                        if (decision.dmGroupId) {
                          router.push(`/messages/${r.fromUser.userId}`);
                        }
                      },
                    });
                  }}
                  onDecline={(r) => {
                    if (refuseOffline()) return;
                    decline.mutate(r.id);
                  }}
                />
              ))}
              {sent.length > 0 ? (
                <Text className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("chat.requests.sent_section")}
                </Text>
              ) : null}
              {sent.map((request: MessageRequest) => (
                <RequestCard key={request.id} request={request} direction="sent" />
              ))}
            </>
          ) : null}

          <EmptyState
            icon={Newspaper}
            title={t("notifications.empty")}
            description={t("notifications.empty_body")}
            className="py-4"
          />
        </ScrollView>
      )}
    </Screen>
  );
}
