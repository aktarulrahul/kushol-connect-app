// WhatsApp send preview (05 · owner 2026-10-18): a picked photo or document shows here with an
// "Add a caption" field before it uploads; Send streams it to the api (→ R2) with the caption.
import { useState } from "react";
import { Image, View } from "react-native";
import { FileText } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import type { MediaPick } from "@/lib/chat/media-pipeline";
import { color } from "@/theme/tokens";

export const CAPTION_MAX = 4000;

export function AttachmentCaptionSheet({
  pick,
  onCancel,
  onSend,
}: {
  /** The picked file waiting for its caption; null = closed. */
  pick: MediaPick | null;
  onCancel: () => void;
  onSend: (pick: MediaPick, caption: string) => void;
}) {
  const t = useT();
  const isImage = pick?.kind === "image";
  return (
    <Sheet
      open={pick !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t(isImage ? "chat.caption.send_photo" : "chat.caption.send_document")}
    >
      {pick ? (
        <CaptionBody
          key={`${pick.uri ?? ""}:${pick.fileName ?? ""}:${String(pick.sizeBytes)}`}
          pick={pick}
          onSend={onSend}
        />
      ) : null}
    </Sheet>
  );
}

function CaptionBody({
  pick,
  onSend,
}: {
  pick: MediaPick;
  onSend: (pick: MediaPick, caption: string) => void;
}) {
  const t = useT();
  const [caption, setCaption] = useState("");
  const ratio = pick.width && pick.height ? pick.width / pick.height : 3 / 4;
  return (
    <View className="gap-3">
      {pick.kind === "image" && pick.uri ? (
        <Image
          source={{ uri: pick.uri }}
          accessibilityLabel={pick.fileName ?? t("chat.preview.image")}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          className="max-h-96 w-full rounded-xl bg-foreground"
          style={{ aspectRatio: ratio }}
        />
      ) : (
        <View className="flex-row items-center gap-3 rounded-xl bg-muted p-3">
          <View className="size-12 items-center justify-center rounded-xl bg-primary-soft">
            <FileText size={24} color={color.primary} />
          </View>
          <Text numberOfLines={2} className="flex-1 text-sm font-semibold text-foreground">
            {pick.fileName ?? t("chat.preview.document")}
          </Text>
        </View>
      )}
      <Input
        value={caption}
        onChangeText={setCaption}
        placeholder={t("chat.caption.placeholder")}
        accessibilityLabel={t("chat.caption.a11y")}
        maxLength={CAPTION_MAX}
        multiline
        className="max-h-32"
      />
      <Button
        onPress={() => {
          onSend(pick, caption.trim());
        }}
      >
        <Text>{t("chat.composer.send")}</Text>
      </Button>
    </View>
  );
}
