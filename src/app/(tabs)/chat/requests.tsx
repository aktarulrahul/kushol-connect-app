// Message Request inbox (COM-AP-013): received (accept → DM opens; decline flips the card) and
// sent (pending/declined/expired). Accept/decline refused offline — safety-relevant action (05 §8).
import { ScrollView, View } from "react-native";
import { router } from "expo-router";

import { ChevronLeft } from "lucide-react-native";

import { CircleAction } from "@/components/ui/screen-header";
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

export default function MessageRequestsScreen() {
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

  return (
    <Screen
      // Dense list: override Screen's default gap-4 / py-4 / px-4 (same pattern as Feeds).
      className="flex-1 gap-1 px-0 py-1"
      header={
        <ScreenHeader
          title={t("chat.requests.title")}
          leading={
            <CircleAction
              icon={ChevronLeft}
              accessibilityLabel={t("common.actions.back")}
              onPress={() => { router.back(); }}
            />
          }
        />
      }
    >
      <OfflineBanner visible={offline} />
      {requests.isLoading ? (
        <View className="gap-1.5 px-3 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </View>
      ) : (requests.data?.received.length ?? 0) + (requests.data?.sent.length ?? 0) === 0 ? (
        <EmptyState title={t("chat.requests.empty")} className="py-4" />
      ) : (
        <ScrollView contentContainerClassName="pb-8">
          {(requests.data?.received.length ?? 0) > 0 ? (
            <Text className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("chat.requests.received")}
            </Text>
          ) : null}
          {requests.data?.received.map((request: MessageRequest) => (
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

          {(requests.data?.sent.length ?? 0) > 0 ? (
            <Text className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("chat.requests.sent_section")}
            </Text>
          ) : null}
          {requests.data?.sent.map((request: MessageRequest) => (
            <RequestCard key={request.id} request={request} direction="sent" />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
