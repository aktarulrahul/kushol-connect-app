// Message Request card (COM-AP-013): accept opens the DM instantly (BR-004); decline flips the
// card; sent list shows pending/declined/expired states. Accept/decline are refused offline
// (safety action — 05 §8).
import { View } from "react-native";

import { ChatAvatar } from "@/components/chat/chat-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import type { MessageRequest } from "@/fixtures/chat";

export function RequestCard({
  request,
  direction,
  busy,
  onAccept,
  onDecline,
}: {
  request: MessageRequest;
  direction: "received" | "sent";
  busy?: boolean;
  onAccept?: (request: MessageRequest) => void;
  onDecline?: (request: MessageRequest) => void;
}) {
  const t = useT();
  const peer = direction === "received" ? request.fromUser : request.toUser;
  const stateKey =
    request.status === "pending"
      ? "chat.requests.state.pending"
      : request.status === "accepted"
        ? "chat.requests.state.accepted"
        : request.status === "declined"
          ? "chat.requests.state.declined"
          : "chat.requests.state.expired";

  return (
    <View className="mx-3 mb-1.5 rounded-2xl border border-border bg-background p-2.5">
      <View className="flex-row items-center gap-2.5">
        <ChatAvatar kind="dm" id={peer.userId} name={peer.name} size="lg" />
        <View className="flex-1">
          <Text className="font-semibold text-foreground">{peer.name}</Text>
          <Text className="text-xs text-muted-foreground">
            {peer.schoolName ?? ""}
            {" · "}
            {t(stateKey)}
          </Text>
        </View>
        {request.status !== "pending" ? (
          <Badge variant="outline">{t(stateKey)}</Badge>
        ) : null}
      </View>

      {direction === "received" && request.status === "pending" ? (
        <View className="mt-2 flex-row gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={busy}
            accessibilityLabel={t("chat.requests.accept")}
            onPress={() => onAccept?.(request)}
          >
            <Text>✔ {t("chat.requests.accept")}</Text>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={busy}
            accessibilityLabel={t("chat.requests.decline")}
            onPress={() => onDecline?.(request)}
          >
            <Text>✕ {t("chat.requests.decline")}</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}
