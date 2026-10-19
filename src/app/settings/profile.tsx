// Edit profile (owner 2026-10-19, scope: name + photo + language): PATCH /api/v1/me via
// patchMeLive, then refresh the auth store so every screen re-renders with the new values.
import { useState } from "react";
import { View } from "react-native";

import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "@/lib/auth/auth-store";
import { patchMeLive } from "@/lib/auth/live-session";
import { useLocale, useT } from "@/i18n/locale-provider";

export default function ProfileSettingsScreen() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const toast = useToast();
  const me = useAuthStore((s) => s.me);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [name, setName] = useState(me?.fullName ?? "");
  const [photo, setPhoto] = useState(me?.avatarUrl ?? "");
  const [nextLocale, setNextLocale] = useState<"bn" | "en">(me?.locale ?? locale);
  const [saving, setSaving] = useState(false);

  return (
    <Screen header={<ScreenHeader title={t("settings.profile.title")} />}>
      <View className="gap-5 p-4">
        <View className="flex-row items-center gap-3">
          {photo ? (
            <UserAvatar name={name || (me?.fullName ?? "")} id={me?.id} size="xl" uri={photo} />
          ) : (
            <UserAvatar name={name || (me?.fullName ?? "")} id={me?.id} size="xl" />
          )}
          <View className="min-w-0 flex-1 gap-2">
            <Text variant="muted" className="text-xs">
              {t("settings.profile.photo_hint")}
            </Text>
            <Input
              value={photo}
              onChangeText={setPhoto}
              placeholder="https://…"
              autoCapitalize="none"
              keyboardType="url"
              className="h-10"
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-medium text-muted-foreground">
            {t("settings.profile.name")}
          </Text>
          <Input value={name} onChangeText={setName} className="h-11" />
        </View>

        <View className="gap-2">
          <Text className="text-xs font-medium text-muted-foreground">
            {t("settings.profile.language")}
          </Text>
          <View className="flex-row gap-2">
            {(["bn", "en"] as const).map((code) => (
              <Button
                key={code}
                variant={nextLocale === code ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onPress={() => {
                  setNextLocale(code);
                }}
              >
                {code === "bn" ? "বাংলা" : "English"}
              </Button>
            ))}
          </View>
        </View>

        <Button
          disabled={saving || name.trim().length < 2}
          onPress={() => {
            setSaving(true);
            patchMeLive({
              fullName: name,
              locale: nextLocale,
              ...(photo !== (me?.avatarUrl ?? "") ? { avatarUrl: photo } : {}),
            })
              .then(() => refreshMe())
              .then(() => {
                setLocale(nextLocale);
                toast({ title: t("settings.profile.saved"), variant: "success" });
              })
              .catch(() => toast({ title: t("common.state.error_title"), variant: "error" }))
              .finally(() => setSaving(false));
          }}
        >
          {saving ? t("settings.profile.saving") : t("common.actions.save")}
        </Button>
      </View>
    </Screen>
  );
}
