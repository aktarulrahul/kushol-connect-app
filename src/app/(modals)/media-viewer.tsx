// Shared media viewer modal (COM-AP-008/009): WhatsApp-style image gallery + in-app PDF WebView.
import { useEffect, useState } from "react";
import { Image, Linking, Platform, ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, FileText, Play } from "lucide-react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { CircleAction } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { mediaFixtures } from "@/fixtures/media";
import { openMediaUrl } from "@/lib/chat/media-pipeline";
import { useT } from "@/i18n/locale-provider";
import { color } from "@/theme/tokens";

export default function MediaViewerModal() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { assetId: assetIdParam, title: titleParam, kind: kindParam } = useLocalSearchParams<{
    assetId: string;
    title?: string;
    kind?: string;
  }>();
  const assetId = Array.isArray(assetIdParam) ? (assetIdParam[0] ?? "") : (assetIdParam ?? "");
  const title = Array.isArray(titleParam) ? titleParam[0] : titleParam;
  const [state, setState] = useState<"loading" | "ready" | "recovering" | "failed">("loading");
  const [uri, setUri] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  const reducedMotion = useReducedMotion();
  const kind = (kindParam as "image" | "pdf" | "voice" | undefined) ?? mediaFixtures.kindOf(assetId);

  useEffect(() => {
    let alive = true;
    setPdfFailed(false);
    setState("loading");
    openMediaUrl(assetId)
      .then((url) => {
        if (!alive) return;
        setUri(url);
        setState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setState("recovering");
        setTimeout(() => {
          if (!alive) return;
          void openMediaUrl(assetId)
            .then((url) => {
              setUri(url);
              setState("ready");
            })
            .catch(() => {
              setState("failed");
            });
        }, reducedMotion ? 0 : 1_500);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const heading =
    title ||
    mediaFixtures.fileNameOf(assetId) ||
    (kind === "pdf" ? t("chat.composer.attach_pdf") : t("chat.composer.attach_image"));

  return (
    <View className="flex-1" style={{ backgroundColor: color.black }}>
      <View
        className="z-10 flex-row items-center gap-2 px-2 pb-2"
        style={{ paddingTop: Math.max(insets.top, 12) }}
      >
        <CircleAction
          icon={ChevronLeft}
          accessibilityLabel={t("common.actions.back")}
          onPress={() => {
            router.back();
          }}
        />
        <Text numberOfLines={1} className="flex-1 font-semibold text-white">
          {heading}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        {state === "loading" || state === "recovering" ? (
          <View className="w-full items-center gap-3 px-4">
            <Skeleton className="h-64 w-full rounded-xl bg-white/10" />
            {state === "recovering" ? (
              <Text className="text-center text-sm text-white/80">{t("chat.media.recovering")}</Text>
            ) : null}
          </View>
        ) : state === "failed" ? (
          <Text className="px-4 text-sm text-white/80">{t("chat.state.error")}</Text>
        ) : kind === "image" && uri ? (
          <ZoomableImage uri={uri} label={heading} />
        ) : kind === "pdf" && uri ? (
          <PdfViewer
            uri={uri}
            title={heading}
            failed={pdfFailed}
            onFailed={() => {
              setPdfFailed(true);
            }}
          />
        ) : (
          <View className="w-full items-center gap-3 rounded-2xl bg-white/10 p-6 mx-4">
            <Play size={48} color={color.white} />
            <Text className="text-sm text-white/80">{t("chat.voice.play_inline")}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ZoomableImage({ uri, label }: { uri: string; label: string }) {
  return (
    <ScrollView
      className="flex-1 w-full"
      contentContainerClassName="min-h-full flex-1 items-center justify-center"
      maximumZoomScale={Platform.OS === "ios" ? 3 : 1}
      minimumZoomScale={1}
      centerContent
      bouncesZoom
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={{ uri }}
        accessibilityLabel={label}
        resizeMode="contain"
        style={{ width: "100%", height: "100%", minHeight: 320 }}
      />
    </ScrollView>
  );
}

function PdfViewer({
  uri,
  title,
  failed,
  onFailed,
}: {
  uri: string;
  title: string;
  failed: boolean;
  onFailed: () => void;
}) {
  const t = useT();
  const demo = uri.startsWith("kushol-demo://");

  const openExternal = () => {
    if (!uri || demo) return;
    void Linking.openURL(uri);
  };

  if (demo || failed) {
    return (
      <View className="w-full items-center gap-4 rounded-2xl bg-white/10 p-6 mx-4">
        <FileText size={56} color={color.white} />
        <Text className="text-center text-base font-semibold text-white">{title}</Text>
        <Text className="text-center text-xs text-white/60">
          {failed ? t("chat.media.pdf_failed") : t("chat.media.doc_preview")}
        </Text>
        {!demo ? (
          <Button variant="secondary" onPress={openExternal}>
            <Text>{t("chat.media.open_external")}</Text>
          </Button>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 w-full">
      <WebView
        testID="pdf-webview"
        source={{ uri: pdfWebUri(uri) }}
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Skeleton className="h-64 w-11/12 rounded-xl bg-white/10" />
            <Text className="mt-3 text-sm text-white/70">{t("chat.media.pdf_loading")}</Text>
          </View>
        )}
        onError={() => {
          onFailed();
        }}
        onHttpError={() => {
          onFailed();
        }}
        style={{ flex: 1, backgroundColor: color.black }}
      />
      <View className="items-center px-4 pb-6 pt-2">
        <Button variant="secondary" onPress={openExternal}>
          <Text>{t("chat.media.open_external")}</Text>
        </Button>
      </View>
    </View>
  );
}

/** iOS WKWebView renders PDFs natively; Android Chromium needs an embedded viewer. */
function pdfWebUri(uri: string): string {
  if (Platform.OS === "android") {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`;
  }
  return uri;
}
