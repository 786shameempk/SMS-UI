import { describe, expect, it } from "vitest";
import { parseSectionNames } from "./sectionNames";

describe("parseSectionNames", () => {
  it("splits on commas and trims", () => {
    expect(parseSectionNames("A, B ,C")).toEqual(["A", "B", "C"]);
  });

  it("keeps one name with spaces whole", () => {
    expect(parseSectionNames("Section  A")).toEqual(["Section A"]);
  });

  it("drops blanks and repeats, ignoring case", () => {
    expect(parseSectionNames("a,, A;b\nB, ")).toEqual(["a", "b"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseSectionNames("  , ;")).toEqual([]);
  });
});
