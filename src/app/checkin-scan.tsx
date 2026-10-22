import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { CheckCircle2, QrCode, ScanLine, TriangleAlert } from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { useT } from "@/i18n/locale-provider";
import { spacingUnit } from "@/theme/tokens";
import { useExpressCheckIn } from "@/lib/volunteering/use-volunteering";

// Express check-in (2026-10-21): point the camera at an attendee's QR pass — the code runs
// through src/fixtures/volunteering.ts `expressCheckIn` (ok / duplicate / blocked). Manual code
// entry is always available (web preview, simulators, denied camera permission).

// expo-camera is a native module: dev-client builds made before it was added don't ship it, and
// an eager import would crash the whole route. Load it lazily — without it this screen still
// works through manual code entry; rebuild the dev client (`expo run:android`) for the camera.
type BarcodeScannedEvent = { data: string };
type CameraViewProps = {
  children?: ReactNode;
  style?: { width?: string; aspectRatio?: number };
  barcodeScannerSettings?: { barcodeTypes: string[] };
  onBarcodeScanned?: (event: BarcodeScannedEvent) => void;
};
type CameraPermissionState = { granted: boolean; canAskAgain?: boolean };
type ExpoCameraModule = {
  CameraView: ComponentType<CameraViewProps>;
  useCameraPermissions: () => [CameraPermissionState | null, () => Promise<void>];
};

const loadExpoCamera = (): ExpoCameraModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- graceful native fallback
    return require("expo-camera") as ExpoCameraModule;
  } catch {
    return null;
  }
};

function CameraSection({
  camera,
  onScan,
  hint,
}: {
  camera: ExpoCameraModule;
  onScan: (event: BarcodeScannedEvent) => void;
  hint: string;
}) {
  const t = useT();
  const [permission, requestPermission] = camera.useCameraPermissions();
  const Camera = camera.CameraView;

  if (!permission?.granted) {
    return (
      <View className="items-center gap-3 bg-black p-6">
        <QrCode size={40} color="white" />
        <Text className="text-center text-xs text-white">{t("events.app.scan_permission")}</Text>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => {
            void requestPermission();
          }}
        >
          <Text>{t("events.app.grant_camera")}</Text>
        </Button>
      </View>
    );
  }

  return (
    <Camera
      style={{ width: "100%", aspectRatio: 3 / 4 }}
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={onScan}
    >
      <View className="flex-1 items-center justify-end p-4">
        <View className="flex-row items-center gap-2 rounded-full bg-black/60 px-4 py-2">
          <ScanLine size={16} color="white" />
          <Text className="text-xs font-medium text-white">{hint}</Text>
        </View>
      </View>
    </Camera>
  );
}

type ScanOutcome = {
  code: string;
  result: "ok" | "duplicate" | "blocked";
  name: string;
  at: string;
};

export default function CheckInScanScreen() {
  const t = useT();
  const checkIn = useExpressCheckIn();
  const camera = loadExpoCamera();
  const [manualCode, setManualCode] = useState("");
  const [outcomes, setOutcomes] = useState<ScanOutcome[]>([]);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const runCheckIn = (rawCode: string) => {
    const code = rawCode.trim();
    if (code.length < 4 || checkIn.isPending) return;
    checkIn.mutate(code, {
      onSuccess: (outcome) => {
        setOutcomes((prev) =>
          [{ code, result: outcome.result, name: outcome.name, at: outcome.at }, ...prev].slice(
            0,
            8,
          ),
        );
      },
    });
  };

  const onBarcodeScanned = (event: BarcodeScannedEvent) => {
    const now = Date.now();
    if (event.data === lastScan.current.code && now - lastScan.current.at < 3000) return;
    lastScan.current = { code: event.data, at: now };
    runCheckIn(event.data);
  };

  return (
    <Screen
      className="gap-4 px-4 py-2"
      header={<ScreenHeader title={t("events.app.scan_title")} />}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacingUnit * 10 }}
        className="gap-4"
      >
        {/* Camera viewfinder — or manual-only when the native module is missing */}
        <View className="overflow-hidden rounded-3xl border border-border bg-black">
          {camera ? (
            <CameraSection
              camera={camera}
              onScan={onBarcodeScanned}
              hint={t("events.app.scan_hint")}
            />
          ) : (
            <View className="items-center gap-3 p-6">
              <QrCode size={40} color="white" />
              <Text className="text-center text-xs text-white">
                {t("events.app.scan_manual_label")}
              </Text>
            </View>
          )}
        </View>

        {/* Manual fallback */}
        <Card className="rounded-2xl gap-3 p-4">
          <Text className="text-sm font-bold text-foreground">
            {t("events.app.scan_manual_label")}
          </Text>
          <TextField
            label={t("events.app.scan_manual_code")}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            className="self-stretch"
            loading={checkIn.isPending}
            onPress={() => {
              runCheckIn(manualCode);
            }}
          >
            <Text>{t("events.app.scan_btn_run")}</Text>
          </Button>
        </Card>

        {/* Latest outcome */}
        {outcomes.length > 0
          ? (() => {
              const latest = outcomes[0];
              if (!latest) return null;
              return (
                <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card p-4">
                  {latest.result === "ok" ? (
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  ) : (
                    <TriangleAlert
                      size={22}
                      className={latest.result === "duplicate" ? "text-amber-500" : "text-red-500"}
                    />
                  )}
                  <Text className="flex-1 text-sm font-semibold text-foreground">
                    {latest.result === "ok"
                      ? t("events.app.scan_result_ok", { name: latest.name })
                      : latest.result === "duplicate"
                        ? t("events.app.scan_result_duplicate")
                        : t("events.app.scan_result_blocked")}
                  </Text>
                  <Badge variant="outline">
                    <Text className="font-mono text-xs">{latest.code}</Text>
                  </Badge>
                </View>
              );
            })()
          : null}

        {/* Recent scans */}
        {outcomes.length > 1 ? (
          <View className="gap-2">
            <Text className="text-sm font-bold uppercase tracking-wide text-foreground">
              {t("events.app.recent_scans")}
            </Text>
            {outcomes.slice(1).map((outcome, index) => (
              <Pressable
                key={`${outcome.code}-${outcome.at}-${String(index)}`}
                className="flex-row items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
              >
                <Text className="text-xs font-semibold text-foreground">
                  {outcome.name || outcome.code}
                </Text>
                <Badge
                  variant="outline"
                  className={
                    outcome.result === "ok"
                      ? "border-emerald-200 bg-emerald-50"
                      : outcome.result === "duplicate"
                        ? "border-amber-200 bg-amber-50"
                        : "border-red-200 bg-red-50"
                  }
                >
                  <Text className="text-xs font-bold">{outcome.result}</Text>
                </Badge>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
