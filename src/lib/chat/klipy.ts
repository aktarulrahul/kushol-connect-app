// KLIPY GIFs + stickers in the app (05 · owner 2026-10-18).
//
// KLIPY's integration requirements: search/trending requests and media loads come from the end
// user's device (no partner proxy, no re-hosting), results keep KLIPY's order in their own tab,
// and the search box reads "Search KLIPY". The api only hands out the app key + an opaque
// customer id (GET /api/v1/chat/klipy) and stores what was sent; this module calls KLIPY itself.
// Renditions are GIF: React Native animates GIF on both platforms (the Android build keeps
// animated WebP off — android/gradle.properties `expo.webp.animated=false`).

export type KlipyKind = "gifs" | "stickers";

/** The signed-in user's KLIPY config (api GET /chat/klipy). */
export type KlipyConfig = {
  enabled: boolean;
  appKey?: string | undefined;
  customerId: string;
  locale: string;
  contentFilter: string;
};

/** What a message stores (mirrors the api's ChatKlipyMedia). */
export type KlipyMedia = {
  slug: string;
  title?: string;
  url: string;
  width: number;
  height: number;
};

/** One picker tile: a light preview for the grid + the rendition that gets sent. */
export type KlipyItem = {
  slug: string;
  title: string;
  preview: { url: string; width: number; height: number };
  send: KlipyMedia;
};

export type KlipyPage = { items: KlipyItem[]; page: number; hasNext: boolean };

export const KLIPY_SEARCH_PLACEHOLDER = "Search KLIPY"; // required by KLIPY's attribution rules
export const KLIPY_PAGE_SIZE = 24;
const KLIPY_BASE = "https://api.klipy.com/api/v1";

type Rendition = { url?: unknown; width?: unknown; height?: unknown };
type RawItem = {
  slug?: unknown;
  title?: unknown;
  file?: Record<string, Record<string, Rendition> | undefined>;
};

function rendition(item: RawItem, sizes: string[], formats: string[]) {
  for (const size of sizes) {
    for (const format of formats) {
      const r = item.file?.[size]?.[format];
      if (
        r &&
        typeof r.url === "string" &&
        r.url.startsWith("https://") &&
        typeof r.width === "number" &&
        typeof r.height === "number" &&
        r.width > 0 &&
        r.height > 0
      ) {
        return { url: r.url, width: Math.round(r.width), height: Math.round(r.height) };
      }
    }
  }
  return null;
}

/** Maps one KLIPY result to a picker tile (null for entries without usable media, e.g. ads). */
export function toKlipyItem(raw: unknown, kind: KlipyKind): KlipyItem | null {
  const item = raw as RawItem;
  if (typeof item.slug !== "string" || !item.slug || !item.file) return null;
  const formats = ["gif", "webp"];
  const send =
    kind === "gifs"
      ? rendition(item, ["md", "hd", "sm"], formats)
      : rendition(item, ["sm", "md", "hd"], formats);
  const preview =
    kind === "gifs"
      ? rendition(item, ["xs", "sm", "md"], formats)
      : rendition(item, ["xs", "sm", "md"], formats);
  if (!send || !preview) return null;
  const title = typeof item.title === "string" ? item.title.slice(0, 200) : "";
  return {
    slug: item.slug,
    title,
    preview,
    send: { slug: item.slug, ...(title ? { title } : {}), ...send },
  };
}

/** Parses a KLIPY trending/search body ({result, data: {data[], current_page, has_next}}). */
export function parseKlipyPage(body: unknown, kind: KlipyKind, page: number): KlipyPage {
  const data = (
    body as { data?: { data?: unknown; current_page?: unknown; has_next?: unknown } } | null
  )?.data;
  const rows = Array.isArray(data?.data) ? data.data : [];
  const items: KlipyItem[] = [];
  for (const row of rows) {
    const item = toKlipyItem(row, kind);
    if (item) items.push(item);
  }
  return {
    items,
    page: typeof data?.current_page === "number" ? data.current_page : page,
    hasNext: data?.has_next === true,
  };
}

function keyPath(config: KlipyConfig): string {
  if (!config.enabled || !config.appKey) throw new Error("klipy_disabled");
  return `${KLIPY_BASE}/${encodeURIComponent(config.appKey)}`;
}

/** The KLIPY trending (no query) or search URL for one page. */
export function klipyBrowseUrl(
  config: KlipyConfig,
  kind: KlipyKind,
  query: string,
  page: number,
): string {
  const q = query.trim();
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(KLIPY_PAGE_SIZE),
    customer_id: config.customerId,
    locale: config.locale,
    content_filter: config.contentFilter,
  });
  if (q) params.set("q", q);
  return `${keyPath(config)}/${kind}/${q ? "search" : "trending"}?${params.toString()}`;
}

/** One page of trending/search results, straight from KLIPY. */
export async function klipyBrowse(
  config: KlipyConfig,
  kind: KlipyKind,
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<KlipyPage> {
  // eslint-disable-next-line no-restricted-globals -- KLIPY is a third-party API the device must call itself (KLIPY integration requirements); never our api
  const res = await fetch(klipyBrowseUrl(config, kind, query, page), signal ? { signal } : {});
  if (!res.ok) throw new Error(`klipy_${String(res.status)}`);
  return parseKlipyPage(await res.json(), kind, page);
}

/** KLIPY's share trigger (analytics) — fire-and-forget after a GIF/sticker is sent. */
export function klipyShare(
  config: KlipyConfig,
  kind: KlipyKind,
  slug: string,
  query: string,
): void {
  if (!config.enabled || !config.appKey) return;
  const q = query.trim();
  // eslint-disable-next-line no-restricted-globals -- KLIPY's share trigger, called from the device like its search
  void fetch(`${keyPath(config)}/${kind}/share/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_id: config.customerId, ...(q ? { q } : {}) }),
  }).catch(() => undefined);
}
