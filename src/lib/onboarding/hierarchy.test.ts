import { listSections, type HierarchySection } from "@/fixtures/auth";
import { distinctClassLevels, sectionsForClass } from "./hierarchy";

// Class dropdown derivation (owner requirement 2026-10-01): class levels are a section
// attribute — the dropdown collects the distinct values across the chosen school's sections
// and sorts them numerically (so "10" never lands between "6" and "9").

const section = (id: string, classLevel: string, name: string): HierarchySection => ({
  id,
  classLevel,
  name,
  sessionYear: 2026,
});

describe("distinctClassLevels", () => {
  it("collects distinct levels sorted numerically, not lexicographically", () => {
    const sections = [
      section("a", "9", "A"),
      section("b", "6", "A"),
      section("c", "10", "B"),
      section("d", "6", "B"),
      section("e", "9", "B"),
    ];
    expect(distinctClassLevels(sections)).toEqual([6, 9, 10]);
  });

  it("is empty for a school without sections", () => {
    expect(distinctClassLevels([])).toEqual([]);
  });
});

describe("sectionsForClass", () => {
  it("lists only the sections of the chosen class level", async () => {
    const sections = await listSections("school_demo_high");
    expect(sectionsForClass(sections, 6).map((s) => s.id)).toEqual([
      "sec_6_a_demo_high",
      "sec_6_b_demo_high",
    ]);
    expect(sectionsForClass(sections, 10).map((s) => s.id)).toEqual(["sec_10_a_demo_high"]);
    expect(sectionsForClass(sections, 8)).toEqual([]);
  });
});
