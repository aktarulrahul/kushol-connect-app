// Sticker catalog (leaf module — imported by the fixtures seam AND the live backend, so it must
// not depend on either side of that seam).

/** Large emoji stickers for the Stage-2 picker (no WebP pack yet). */
export const DEMO_STICKERS = [
  { id: "sticker_wave", emoji: "👋" },
  { id: "sticker_ok", emoji: "👍" },
  { id: "sticker_heart", emoji: "❤️" },
  { id: "sticker_laugh", emoji: "😂" },
  { id: "sticker_clap", emoji: "👏" },
  { id: "sticker_pray", emoji: "🙏" },
  { id: "sticker_fire", emoji: "🔥" },
  { id: "sticker_star", emoji: "⭐" },
] as const;

export type DemoStickerId = (typeof DEMO_STICKERS)[number]["id"];

export function stickerEmoji(stickerId: string): string {
  return DEMO_STICKERS.find((s) => s.id === stickerId)?.emoji ?? "⭐";
}
