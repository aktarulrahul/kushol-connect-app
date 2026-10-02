import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { CircleAlert, LogOut, MonitorSmartphone } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { LOCALES } from "@/i18n";
import { useLocale, useT } from "@/i18n/locale-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { getDevices, logoutAll, revokeDevice } from "@/fixtures/auth";

// Settings (IDT-AP-010/011/012): language switch (PATCH /me → instant re-render, saved to the
// account), logout / logout-everywhere behind a destructive confirm, SSO linking stub, and the
// P1 device list with single-device revoke per row. Reachable for PENDING users too (the pending
// screen links here), so it lives outside the guarded (tabs) group.
function SettingsScreen() {
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { locale, setLocale } = useLocale();
  const me = useAuthStore((s) => s.me);
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const changeLocale = useAuthStore((s) => s.changeLocale);
  const signOut = useAuthStore((s) => s.signOut);
  const [confirm, setConfirm] = useState<"logout" | "logout_all" | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  const devices = useQuery({
    queryKey: ["auth", "devices"],
    queryFn: getDevices,
    enabled: me !== null,
  });

  // Signed-out visitors are redirected (owner gate, 2026-10-01); PENDING users keep access —
  // the pending screen links here. A restore still in flight, or offline with no profile yet,
  // stays on the skeleton instead of /login.
  if (status === "anon") {
    return <Redirect href="/login" />;
  }
  if (status !== "authed" || !me) {
    return (
      <Screen className="justify-center gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </Screen>
    );
  }

  const pickLocale = async (next: "bn" | "en") => {
    setLocale(next);
    try {
      await changeLocale(next); // PATCH /me — the next access token carries the claim
      toast({ title: t("settings.language_saved"), variant: "success" });
    } catch {
      toast({ title: t("errors.network"), variant: "error" });
    }
  };

  const logout = async (everywhere: boolean) => {
    setConfirm(null);
    if (everywhere) {
      await logoutAll();
    }
    await signOut();
    router.replace("/login");
  };

  const revoke = async (deviceId: string) => {
    setRevoking(null);
    try {
      await revokeDevice(deviceId);
      await devices.refetch();
      toast({ title: t("settings.device_revoked"), variant: "success" });
    } catch {
      toast({ title: t("errors.network"), variant: "error" });
    }
  };

  return (
    <Screen>
      <View className="gap-1">
        <Text variant="h1">{t("settings.title")}</Text>
        <Text variant="muted">
          {me.fullName}
          {me.maskedPhone ? ` · ${me.maskedPhone}` : ""}
        </Text>
      </View>

      <View className="gap-2">
        <Text variant="label">{t("common.language.label")}</Text>
        <SegmentedPill
          accessibilityLabel={t("common.language.label")}
          value={locale}
          onChange={(next) => void pickLocale(next)}
          segments={LOCALES.map((l) => ({
            value: l,
            label: t(l === "bn" ? "common.language.bn" : "common.language.en"),
          }))}
        />
        <Text variant="caption">{t("settings.language_hint")}</Text>
      </View>

      <View className="gap-2">
        <Text variant="label">{t("auth.link.title")}</Text>
        <Text variant="caption">{t("auth.link.hint")}</Text>
        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              router.push("/auth/sso/return?provider=google&intent=link");
            }}
          >
            <Text>{t("auth.link.google")}</Text>
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              router.push("/auth/sso/return?provider=github&intent=link");
            }}
          >
            <Text>{t("auth.link.github")}</Text>
          </Button>
        </View>
      </View>

      <View className="gap-2">
        <Text variant="label">{t("settings.section_devices")}</Text>
        <Text variant="caption">{t("settings.devices_hint")}</Text>
        {devices.isPending ? (
          <View className="gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </View>
        ) : devices.isError ? (
          <ErrorState onRetry={() => void devices.refetch()} />
        ) : devices.data.length === 0 ? (
          <EmptyState />
        ) : (
          <View className="gap-0.5 rounded-lg border border-border bg-card">
            {devices.data.map((device) => (
              <ListRow
                key={device.id}
                leading={
                  <View className="size-10 items-center justify-center rounded-full bg-muted">
                    <Icon as={MonitorSmartphone} size={18} className="text-muted-foreground" />
                  </View>
                }
                title={device.label}
                preview={device.current ? t("settings.device_current") : device.lastActiveAt}
                trailing={
                  device.current ? null : (
                    <Button
                      size="sm"
                      variant="ghost"
                      accessibilityLabel={`${t("settings.device_revoke")} — ${device.label}`}
                      onPress={() => {
                        setRevoking(device.id);
                      }}
                    >
                      <Text className="text-destructive">{t("settings.device_revoke")}</Text>
                    </Button>
                  )
                }
              />
            ))}
          </View>
        )}
      </View>

      <View className="gap-2">
        <Text variant="label">{t("settings.section_account")}</Text>
        <Button
          variant="outline"
          size="lg"
          className="self-stretch"
          onPress={() => {
            setConfirm("logout");
          }}
        >
          <Icon as={LogOut} size={18} className="text-foreground" />
          <Text>{t("settings.logout_device")}</Text>
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="self-stretch"
          onPress={() => {
            setConfirm("logout_all");
          }}
        >
          <Text>{t("settings.logout_all")}</Text>
        </Button>
      </View>

      <ConfirmModal
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        destructive={confirm === "logout_all"}
        icon={CircleAlert}
        title={t("settings.logout_title")}
        description={
          confirm === "logout_all" ? t("settings.logout_all_body") : t("settings.logout_body")
        }
        confirmLabel={
          confirm === "logout_all" ? t("settings.logout_all") : t("settings.logout_device")
        }
        onConfirm={() => void logout(confirm === "logout_all")}
      />

      <ConfirmModal
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
        destructive
        icon={MonitorSmartphone}
        title={t("settings.device_revoke")}
        description={t("settings.devices_hint")}
        confirmLabel={t("settings.device_revoke")}
        onConfirm={() => {
          if (revoking) void revoke(revoking);
        }}
      />
    </Screen>
  );
}

export default SettingsScreen;
