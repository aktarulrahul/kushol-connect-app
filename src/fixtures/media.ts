// ─── STAGE-2 MEDIA SEAM (R2 upload flow, simulated) ──────────────────────────────────────────
// The three-step flow the app performs — presign → client PUT (skipped in fixtures) → confirm —
// with the same contracts the real api exposes (`POST /media/upload-url`, `POST /media/{id}/confirm`,
// `POST /media/{id}/download-url`). Types from the spec; behaviour clearly fake.
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];
export type MediaKind = Schemas["MediaKind"];
export type MediaAsset = Schemas["MediaAsset"];
export type MediaUploadUrlInput = Schemas["MediaUploadUrlInput"];
export type MediaPresignResult = Schemas["MediaPresignResult"]["data"];
export type MediaDownloadUrl = Schemas["MediaDownloadUrl"]["data"];
export type ChatMediaRef = Schemas["ChatMediaRef"];

import { ChatFixtureError } from "@/fixtures/chat-error";

/** Caps per kind (BR-009 / OQ-4 — tunable config server-side; mirrored here for client UX). */
export const MEDIA_CAPS = {
  image: { maxBytes: 10 * 1024 * 1024, label: "image/jpeg" },
  pdf: { maxBytes: 20 * 1024 * 1024, label: "application/pdf" },
  voice: { maxBytes: 5 * 1024 * 1024, label: "audio/mp4", maxDurationMs: 300_000 },
} as const;

let seq = 0;
const id = (): string => `asset_demo_${String(++seq).padStart(3, "0")}`;

type AssetRow = MediaAsset & { fileName?: string };

/** assetId → confirmed asset (what messages may reference — INV-6). */
const assets = new Map<string, AssetRow>();

export const mediaFixtures = {
  reset(): void {
    seq = 0;
    assets.clear();
    seedDemoAssets();
  },

  /** A confirmed demo asset reference for seeded messages. */
  confirmedRef(assetId: string): ChatMediaRef {
    const row = assets.get(assetId);
    if (!row) {
      return {
        assetId,
        kind: "image",
        mime: "image/jpeg",
        sizeBytes: 1_000_000,
        status: "confirmed",
      };
    }
    return {
      assetId: row.id,
      kind: row.kind,
      mime: row.mime,
      sizeBytes: row.sizeBytes,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      durationMs: row.durationMs ?? undefined,
      fileName: row.fileName,
      status: row.status,
    };
  },

  /** POST /media/upload-url — validates kind/size caps; asset starts `pending`. */
  async presign(input: MediaUploadUrlInput): Promise<MediaPresignResult> {
    await Promise.resolve();
    const caps = MEDIA_CAPS[input.kind];
    if (input.sizeBytes <= 0 || input.sizeBytes > caps.maxBytes) {
      throw new ChatFixtureError("VALIDATION_FAILED");
    }
    const assetId = id();
    assets.set(assetId, {
      id: assetId,
      kind: input.kind,
      mime: input.mime ?? caps.label,
      sizeBytes: input.sizeBytes,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return {
      assetId,
      uploadUrl: `https://r2.demo.kushol.test/upload/${assetId}`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  },

  /**
   * POST /media/{id}/confirm — the magic-byte sniff, simulated: fixtures pass a small header
   * prefix (what the real client's first bytes would be) and the sniff decides (INV-6).
   */
  async confirm(
    assetId: string,
    headerBytes: Uint8Array | null,
    meta: { width?: number; height?: number; durationMs?: number; fileName?: string } = {},
  ): Promise<MediaAsset> {
    await Promise.resolve();
    const row = assets.get(assetId);
    if (!row) throw new ChatFixtureError("NOT_FOUND");
    if (row.status !== "pending") throw new ChatFixtureError("CONFLICT");
    const sniffed = sniff(row.kind, headerBytes);
    if (!sniffed) throw new ChatFixtureError("VALIDATION_FAILED", "magic_byte_mismatch");
    row.mime = sniffed;
    row.status = "confirmed";
    row.confirmedAt = new Date().toISOString();
    row.width = meta.width;
    row.height = meta.height;
    row.durationMs = meta.durationMs;
    row.fileName = meta.fileName;
    return { ...row };
  },

  /** POST /media/{id}/download-url — short-lived GET URL; archived assets flag rehydration. */
  async downloadUrl(assetId: string): Promise<MediaDownloadUrl> {
    await Promise.resolve();
    const row = assets.get(assetId);
    const status = row?.status ?? "confirmed";
    return {
      downloadUrl: demoPreviewUri(assetId, row?.kind ?? "image"),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      rehydrated: status === "archived",
    };
  },

  /** Kind hint for the viewer when only an asset id is known. */
  kindOf(assetId: string): MediaKind {
    return assets.get(assetId)?.kind ?? "image";
  },

  fileNameOf(assetId: string): string | undefined {
    return assets.get(assetId)?.fileName;
  },

  /** Sync Stage-2 preview URI for in-bubble thumbnails (no network round-trip). */
  previewUri(assetId: string): string {
    const row = assets.get(assetId);
    return demoPreviewUri(assetId, row?.kind ?? "image");
  },

  sizeBytesOf(assetId: string): number | undefined {
    return assets.get(assetId)?.sizeBytes;
  },
};

/**
 * Stage-2 viewer URIs — real R2 hostnames do not resolve on device. Images use an embedded PNG;
 * PDFs use a public sample URL (demo only); voice keeps a sentinel the UI handles inline.
 */
function demoPreviewUri(assetId: string, kind: MediaKind): string {
  if (kind === "image") return DEMO_IMAGE_DATA_URI;
  if (kind === "pdf") return DEMO_PDF_URL;
  return `kushol-demo://${kind}/${assetId}`;
}

/** 240×320 demo PNG (brand teal bands) — WhatsApp-sized bubble + full-bleed viewer. */
export const DEMO_IMAGE_DATA_URI =
  "data:image/png;base64,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";

/** Public sample PDF (W3C dummy) — Stage-2 demo only; not a real school document. */
export const DEMO_PDF_URL =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

function seedDemoAssets(): void {
  assets.set("asset_demo_lab", {
    id: "asset_demo_lab",
    kind: "image",
    mime: "image/jpeg",
    sizeBytes: 918_233,
    width: 1080,
    height: 1440,
    fileName: "lab-day.jpg",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  });
  assets.set("asset_demo_syllabus", {
    id: "asset_demo_syllabus",
    kind: "pdf",
    mime: "application/pdf",
    sizeBytes: 842_133,
    fileName: "অর্ধবার্ষিক-সিলেবাস.pdf",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  });
  assets.set("asset_demo_voice", {
    id: "asset_demo_voice",
    kind: "voice",
    mime: "audio/mp4",
    sizeBytes: 210_433,
    durationMs: 42_000,
    status: "confirmed",
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  });
}

/** The allowlist sniff (mirrors COM-UT-001): first magic bytes decide; anything else rejects. */
function sniff(kind: MediaKind, bytes: Uint8Array | null): string | null {
  if (!bytes || bytes.length < 4) return null;
  const b = bytes;
  const startsWith = (sig: number[]): boolean => sig.every((v, i) => b[i] === v);
  switch (kind) {
    case "image":
      if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
      if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
      // HEIC: bytes 4..12 contain "ftypheic"/"ftypheix"
      if (startsWith([0x00, 0x00, 0x00]) && b[8] === 0x66) return "image/heic";
      return null;
    case "pdf":
      return startsWith([0x25, 0x50, 0x44, 0x46]) ? "application/pdf" : null; // %PDF
    case "voice":
      // AAC ADTS sync or an m4a container (ftyp box)
      if (startsWith([0xff, 0xf1]) || startsWith([0xff, 0xf9])) return "audio/aac";
      if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "audio/mp4";
      return null;
  }
}

/** Convenience: the magic-byte prefix a demo (simulated) file would carry. */
export const DEMO_MAGIC = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  aac: new Uint8Array([0xff, 0xf1, 0x50, 0x80]),
  /** An executable renamed `.jpg` — the confirm must reject (US-003). */
  exe: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
} as const;

// Seed demo assets at module load so viewers work before any test reset.
mediaFixtures.reset();
