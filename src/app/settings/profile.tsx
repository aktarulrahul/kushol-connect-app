// Edit profile (owner 2026-10-19, scope: name + photo + language): name and language save through
// PATCH /api/v1/me (patchMeLive); the photo is picked from the gallery and uploaded at once
// (owner 2026-10-20 — chat members see it), then the auth store refreshes so every screen re-renders.
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
import {
  pickProfilePhoto,
  ProfilePhotoError,
  removeProfilePhoto,
  uploadProfilePhoto,
} from "@/lib/auth/profile-photo";
import { useLocale, useT } from "@/i18n/locale-provider";

export default function ProfileSettingsScreen() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const toast = useToast();
  const me = useAuthStore((s) => s.me);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [name, setName] = useState(me?.fullName ?? "");
  const [nextLocale, setNextLocale] = useState<"bn" | "en">(me?.locale ?? locale);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photo = me?.avatarUrl;

  const photoFailed = (error: unknown) => {
    const tooLarge = error instanceof ProfilePhotoError && error.reason === "too_large";
    toast({
      title: t(tooLarge ? "settings.profile.photo_too_large" : "settings.profile.photo_failed"),
      variant: "error",
    });
  };

  const changePhoto = async () => {
    const pick = await pickProfilePhoto();
    if (!pick) return;
    setPhotoBusy(true);
    try {
      await uploadProfilePhoto(pick);
      await refreshMe();
      toast({ title: t("settings.profile.photo_updated"), variant: "success" });
    } catch (error) {
      photoFailed(error);
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeProfilePhoto();
      await refreshMe();
      toast({ title: t("settings.profile.photo_removed"), variant: "success" });
    } catch (error) {
      photoFailed(error);
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t("settings.profile.title")} />}>
      <View className="gap-5 p-4">
        <View className="flex-row items-center gap-3">
          <UserAvatar
            name={name || (me?.fullName ?? "")}
            id={me?.id}
            size="xl"
            placeholder="person"
            uri={photo}
          />
          <View className="min-w-0 flex-1 gap-2">
            <Text variant="muted" className="text-xs">
              {t("settings.profile.photo_hint")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={photoBusy}
                onPress={() => {
                  void changePhoto();
                }}
              >
                {photoBusy
                  ? t("settings.profile.photo_uploading")
                  : t(photo ? "settings.profile.photo_change" : "settings.profile.photo_add")}
              </Button>
              {photo ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  disabled={photoBusy}
                  onPress={() => {
                    void removePhoto();
                  }}
                >
                  {t("settings.profile.photo_remove")}
                </Button>
              ) : null}
            </View>
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
            patchMeLive({ fullName: name, locale: nextLocale })
              .then(() => refreshMe())
              .then(() => {
                setLocale(nextLocale);
                toast({ title: t("settings.profile.saved"), variant: "success" });
              })
              .catch(() => {
                toast({ title: t("common.state.error_title"), variant: "error" });
              })
              .finally(() => {
                setSaving(false);
              });
          }}
        >
          {saving ? t("settings.profile.saving") : t("common.actions.save")}
        </Button>
      </View>
    </Screen>
  );
}
