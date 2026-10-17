// Real device attachments (05 · owner 2026-10-17: images, PDF, Word, Excel, CSV and voice notes
// go to Cloudflare R2). Pickers hand back a local file URI; the upload streams that file straight
// to the presigned R2 URL (media-pipeline → live-chat), so large files never sit in JS memory.
// Android and iOS use the system pickers (Photo Picker / PHPicker need no library permission).
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { MediaPick } from "@/lib/chat/media-pipeline";

export type DocumentKind = "pdf" | "doc" | "sheet" | "csv";

/** Size caps mirroring the api (media/sniff.go): images 10 MB, documents 20 MB, CSV 10 MB. */
export const ATTACHMENT_CAP_BYTES = {
  image: 10 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
  doc: 20 * 1024 * 1024,
  sheet: 20 * 1024 * 1024,
  csv: 10 * 1024 * 1024,
  voice: 5 * 1024 * 1024,
} as const;

/** MIME types the document picker offers (both platforms map these to their file pickers). */
export const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/comma-separated-values",
] as const;

/** Which R2 kind a picked document uploads as (pure — unit-pinned); null = not allowed. */
export function documentKindFor(name: string, mime: string | undefined): DocumentKind | null {
  const lower = name.toLowerCase();
  const type = (mime ?? "").toLowerCase();
  if (type === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    /\.docx?$/.test(lower) ||
    type.includes("wordprocessingml") ||
    type === "application/msword"
  ) {
    return "doc";
  }
  if (
    /\.xlsx?$/.test(lower) ||
    type.includes("spreadsheetml") ||
    type === "application/vnd.ms-excel"
  ) {
    return "sheet";
  }
  if (lower.endsWith(".csv") || type === "text/csv" || type === "text/comma-separated-values") {
    return "csv";
  }
  return null;
}

/** Declared mime per kind when the picker reports none (the api's sniff decides anyway). */
function fallbackMime(kind: DocumentKind, name: string): string {
  switch (kind) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return name.toLowerCase().endsWith(".doc")
        ? "application/msword"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "sheet":
      return name.toLowerCase().endsWith(".xls")
        ? "application/vnd.ms-excel"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "csv":
      return "text/csv";
  }
}

export type PickOutcome =
  { ok: true; pick: MediaPick } | { ok: false; reason: "cancelled" | "unsupported" | "too_large" };

const NO_HEADER = new Uint8Array(0);

/** Gallery photo (compressed JPEG on both platforms keeps uploads small on low-end phones). */
export async function pickImage(): Promise<PickOutcome> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    exif: false,
    allowsMultipleSelection: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { ok: false, reason: "cancelled" };
  const sizeBytes = asset.fileSize ?? 0;
  if (sizeBytes > ATTACHMENT_CAP_BYTES.image) return { ok: false, reason: "too_large" };
  return {
    ok: true,
    pick: {
      kind: "image",
      uri: asset.uri,
      headerBytes: NO_HEADER,
      sizeBytes: sizeBytes || 1,
      mime: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? "photo.jpg",
      width: asset.width,
      height: asset.height,
    },
  };
}

/** PDF / Word / Excel / CSV from the system file picker. */
export async function pickDocument(): Promise<PickOutcome> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...DOCUMENT_TYPES],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { ok: false, reason: "cancelled" };
  const kind = documentKindFor(asset.name, asset.mimeType);
  if (!kind) return { ok: false, reason: "unsupported" };
  const sizeBytes = asset.size ?? 0;
  if (sizeBytes > ATTACHMENT_CAP_BYTES[kind]) return { ok: false, reason: "too_large" };
  return {
    ok: true,
    pick: {
      kind,
      uri: asset.uri,
      headerBytes: NO_HEADER,
      sizeBytes: sizeBytes || 1,
      mime: asset.mimeType ?? fallbackMime(kind, asset.name),
      fileName: asset.name,
    },
  };
}
