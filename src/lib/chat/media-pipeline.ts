// Media pipeline (COM-AP-006..009): compress → presign → client PUT → confirm. In Stage 2 the
// compress/PUT steps are simulated (fixtures carry magic-byte headers instead of real bytes);
// the flow's shape, caps and error paths are the real contract, so Stage 5 only swaps the
// `expo-image-manipulator`/`expo-av` steps in — no screen changes (05 §3/§4). Live sessions
// (owner 2026-10-17) upload the file to the api in one call (`uploadMediaLive`); the api sniffs it
// and stores it in R2, so the app never talks to storage.
import { ChatFixtureError } from "@/fixtures/chat-error";
import { mediaFixtures, type ChatMediaRef } from "@/fixtures/media";
import { chatLiveActive, openMediaUrlLive, uploadMediaLive } from "@/lib/chat/live-chat";

export type MediaPick = {
  /** R2 kinds (owner 2026-10-17: images, PDF, Word, Excel, CSV, voice notes). */
  kind: "image" | "pdf" | "voice" | "doc" | "sheet" | "csv";
  /** Bytes the (simulated) device file starts with — the sniff decides at confirm. */
  headerBytes: Uint8Array;
  sizeBytes: number;
  fileName?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  /** Live sessions: the local file (picker/recorder), streamed to the api (it stores it in R2). */
  uri?: string;
  /** Live sessions without a file URI (tests): the full bytes. Fixtures simulate instead. */
  bytes?: Uint8Array;
  mime?: string;
};

/**
 * Runs the full upload flow for one picked/recorded file and returns the confirmed asset
 * reference a message send requires (INV-6: only `confirmed` assets are referencable).
 */
export async function uploadMedia(pick: MediaPick): Promise<ChatMediaRef> {
  if (await chatLiveActive()) return uploadMediaLive(pick);
  const presign = await mediaFixtures.presign({
    kind: pick.kind,
    sizeBytes: pick.sizeBytes,
  });
  // The real client PUTs the bytes to `presign.uploadUrl` here (Stage 5).
  const asset = await mediaFixtures.confirm(presign.assetId, pick.headerBytes, {
    width: pick.width,
    height: pick.height,
    durationMs: pick.durationMs,
    fileName: pick.fileName,
  });
  return {
    assetId: asset.id,
    kind: asset.kind,
    mime: asset.mime,
    sizeBytes: asset.sizeBytes,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    durationMs: asset.durationMs ?? undefined,
    fileName: pick.fileName,
    status: asset.status,
  };
}

/** Opens the viewer for an asset: short-lived URL (COM-US-005); archived → rehydrate flag. */
export async function openMediaUrl(assetId: string): Promise<string> {
  if (await chatLiveActive()) return openMediaUrlLive(assetId);
  const result = await mediaFixtures.downloadUrl(assetId);
  if (result.rehydrated) {
    // "Recovering attachment…" happens while this resolves; the URL is only usable once back.
    throw new ChatFixtureError("CONFLICT", "recovering");
  }
  return result.downloadUrl;
}
