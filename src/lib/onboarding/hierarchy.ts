// Hierarchy picker helpers (owner requirement 2026-10-01): the master data has no `classes`
// table — class levels are a section attribute, so the Class dropdown derives its options from
// the chosen school's sections and the Section dropdown lists only that class's sections.
import type { HierarchySection } from "@/fixtures/auth";

/** Distinct class levels across a school's sections, sorted numerically ascending. */
export function distinctClassLevels(sections: HierarchySection[]): number[] {
  const levels = new Set<number>();
  for (const section of sections) {
    const level = Number(section.classLevel);
    if (!Number.isNaN(level)) levels.add(level);
  }
  return [...levels].sort((a, b) => a - b);
}

/** Sections of one class level, in listing order (drives the Section dropdown). */
export function sectionsForClass(
  sections: HierarchySection[],
  classLevel: number,
): HierarchySection[] {
  return sections.filter((section) => Number(section.classLevel) === classLevel);
}
