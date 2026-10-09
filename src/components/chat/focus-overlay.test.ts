import { layoutFocusMenu } from "./message-menu";
import { MENU_WIDTH, placeMenu } from "./focus-overlay";

const window = { width: 360, height: 780 };
const insets = { top: 24, bottom: 16 };

describe("placeMenu", () => {
  it("opens under the anchor when it fits, right-aligned for end", () => {
    const place = placeMenu({
      anchor: { x: 16, y: 100, width: 328, height: 64 },
      height: 96,
      window,
      insets,
      align: "end",
    });
    expect(place).toEqual({ top: 172, left: 16 + 328 - MENU_WIDTH, below: true });
  });

  it("flips above an anchor near the bottom and stays inside the window", () => {
    const place = placeMenu({
      anchor: { x: 0, y: 700, width: 360, height: 64 },
      height: 96,
      window,
      insets,
    });
    expect(place.below).toBe(false);
    expect(place.top).toBe(700 - 96 - 8);
    expect(place.left).toBe(12);
  });
});

describe("layoutFocusMenu", () => {
  it("keeps a bubble in place when the bar and menu fit around it", () => {
    const anchor = { x: 16, y: 300, width: 200, height: 60 };
    const layout = layoutFocusMenu({ anchor, menuHeight: 192, showBar: true, window, insets });
    expect(layout.previewTop).toBe(300);
    expect(layout.barTop).toBe(300 - 8 - 52);
    expect(layout.menuTop).toBe(300 + 60 + 8);
  });

  it("slides a bubble near the bottom up so the menu stays on screen", () => {
    const anchor = { x: 16, y: 680, width: 200, height: 60 };
    const layout = layoutFocusMenu({ anchor, menuHeight: 192, showBar: true, window, insets });
    expect(layout.previewTop).toBeLessThan(680);
    expect(layout.menuTop + 192).toBeLessThanOrEqual(780 - 16 - 12);
    expect(layout.barTop).toBeGreaterThanOrEqual(24 + 12);
  });

  it("slides a bubble near the top down to make room for the reaction bar", () => {
    const anchor = { x: 16, y: 30, width: 200, height: 60 };
    const layout = layoutFocusMenu({ anchor, menuHeight: 96, showBar: true, window, insets });
    expect(layout.barTop).toBe(24 + 12);
    expect(layout.previewTop).toBe(24 + 12 + 52 + 8);
  });
});
