// Profile photo (owner 2026-10-20): picked from the gallery (square crop, compressed) and streamed
// to POST /api/v1/me/avatar — the api stores it in Cloudflare R2 and every chat member loads it
// from the public avatar route, so the owner sees exactly what others see. Removing it is
// DELETE /api/v1/me/avatar. Never a typed link: the api refuses those.
import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { env } from "@/env";
import { liveAuth } from "@/lib/auth/live-session";
import { accessTokenNeedsRefresh } from "@/lib/auth/session-restore";
import { tokenStore } from "@/lib/auth/token-store";

export type ProfilePhotoPick = { uri: string; fileName: string };

export type ProfilePhotoFailure = "too_large" | "rejected" | "offline";

export class ProfilePhotoError extends Error {
  constructor(readonly reason: ProfilePhotoFailure) {
    super(`profile photo: ${reason}`);
    this.name = "ProfilePhotoError";
  }
}

/** Upload status → outcome (pure — unit-pinned): null = stored. */
export function photoUploadFailure(status: number): ProfilePhotoFailure | null {
  if (status >= 200 && status < 300) return null;
  if (status === 413) return "too_large";
  return "rejected";
}

/** A square-cropped gallery photo, compressed for slow links; null when the user cancelled. */
export async function pickProfilePhoto(): Promise<ProfilePhotoPick | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    exif: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, fileName: asset.fileName ?? "photo.jpg" };
}

/**
 * Streams the photo from disk to the api (uploadAsync is outside the generated client, so it
 * carries the bearer itself: rotated first when due, and once more on a 401).
 */
export async function uploadProfilePhoto(pick: ProfilePhotoPick): Promise<void> {
  const auth = liveAuth();
  const url = `${env.EXPO_PUBLIC_API_URL}/api/v1/me/avatar?fileName=${encodeURIComponent(pick.fileName)}`;
  const send = async () => {
    const tokens = await tokenStore.get();
    return uploadAsync(url, pick.uri, {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${tokens?.accessToken ?? ""}`,
        "Content-Type": "application/octet-stream",
        "X-Kushol-Client": "mobile",
      },
    });
  };
  let status: number;
  try {
    const current = await tokenStore.get();
    if (current && accessTokenNeedsRefresh(current.accessToken, Date.now())) await auth.rotate();
    let result = await send();
    if (result.status === 401) {
      await auth.rotate();
      result = await send();
    }
    status = result.status;
  } catch {
    throw new ProfilePhotoError("offline");
  }
  const failure = photoUploadFailure(status);
  if (failure) throw new ProfilePhotoError(failure);
}

/** Removes the photo; everyone falls back to the initials avatar. */
export async function removeProfilePhoto(): Promise<void> {
  let ok: boolean;
  try {
    const { response } = await liveAuth().DELETE("/api/v1/me/avatar", {});
    ok = response.ok;
  } catch {
    throw new ProfilePhotoError("offline");
  }
  if (!ok) throw new ProfilePhotoError("rejected");
}
