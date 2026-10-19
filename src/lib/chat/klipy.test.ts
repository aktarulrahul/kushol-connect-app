import { klipyBrowseUrl, klipyShare, parseKlipyPage, toKlipyItem, type KlipyConfig } from "./klipy";

// 05 · 2026-10-18 — KLIPY GIFs/stickers: the device calls KLIPY with the api-issued app key;
// results keep KLIPY's order; GIF renditions are sent (React Native animates GIF everywhere).

const CONFIG: KlipyConfig = {
  enabled: true,
  appKey: "app-key",
  customerId: "c0ffee",
  locale: "bd",
  contentFilter: "high",
};

const HELLO = {
  slug: "hello-hi-662",
  title: "Hello",
  file: {
    md: {
      gif: { url: "https://static.klipy.com/md.gif", width: 400, height: 300 },
      webp: { url: "https://static.klipy.com/md.webp", width: 400, height: 300 },
    },
    xs: {
      gif: { url: "https://static.klipy.com/xs.gif", width: 90, height: 68 },
      webp: { url: "https://static.klipy.com/xs.webp", width: 90, height: 68 },
    },
    sm: { gif: { url: "https://static.klipy.com/sm.gif", width: 200, height: 150 } },
  },
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("KLIPY results", () => {
  it("sends the md GIF and previews the xs GIF", () => {
    const item = toKlipyItem(HELLO, "gifs");
    expect(item?.send).toEqual({
      slug: "hello-hi-662",
      title: "Hello",
      url: "https://static.klipy.com/md.gif",
      width: 400,
      height: 300,
    });
    expect(item?.preview.url).toBe("https://static.klipy.com/xs.gif");
    expect(toKlipyItem(HELLO, "stickers")?.send.url).toBe("https://static.klipy.com/sm.gif");
  });

  it("skips entries without usable media and keeps the order", () => {
    const page = parseKlipyPage(
      {
        data: {
          data: [
            { ...HELLO, slug: "b" },
            { slug: "ad", type: "ad" },
            { ...HELLO, slug: "a" },
          ],
          current_page: 1,
          has_next: false,
        },
      },
      "gifs",
      1,
    );
    expect(page.items.map((i) => i.slug)).toEqual(["b", "a"]);
    expect(page.hasNext).toBe(false);
  });
});

describe("KLIPY requests", () => {
  it("builds the trending and search URLs", () => {
    expect(klipyBrowseUrl(CONFIG, "gifs", "", 1)).toContain(
      "https://api.klipy.com/api/v1/app-key/gifs/trending?",
    );
    const search = klipyBrowseUrl(CONFIG, "stickers", " hi ", 2);
    expect(search).toContain("/stickers/search?");
    expect(search).toContain("q=hi");
    expect(search).toContain("customer_id=c0ffee");
    expect(search).toContain("content_filter=high");
    expect(search).toContain("page=2");
  });

  it("posts the share trigger only when KLIPY is on", () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    klipyShare(CONFIG, "gifs", "hello-hi-662", "hello");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.klipy.com/api/v1/app-key/gifs/share/hello-hi-662",
      expect.objectContaining({ method: "POST" }),
    );
    klipyShare({ ...CONFIG, enabled: false }, "gifs", "x", "");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
