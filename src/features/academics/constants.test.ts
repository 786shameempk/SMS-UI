import { describe, expect, it } from "vitest";
import { computeTermStatus } from "./constants";

const terms = [
  ["2026-01-01", "2026-04-04"],
  ["2026-04-05", "2026-10-10"],
  ["2026-10-11", "2026-12-31"],
] as const;
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const statuses = (now: Date) => terms.map(([s, e]) => computeTermStatus(s, e, now));

describe("computeTermStatus", () => {
  it("first ongoing, rest upcoming", () => {
    expect(statuses(at(2026, 1, 5))).toEqual(["ongoing", "upcoming", "upcoming"]);
  });
  it("first completed, second ongoing, third upcoming", () => {
    expect(statuses(at(2026, 6, 6))).toEqual(["completed", "ongoing", "upcoming"]);
  });
  it("boundaries are inclusive", () => {
    expect(statuses(at(2026, 4, 4))[0]).toBe("ongoing");
    expect(statuses(at(2026, 10, 10))[1]).toBe("ongoing");
  });
  it("all completed after the last term", () => {
    expect(statuses(at(2027, 1, 1))).toEqual(["completed", "completed", "completed"]);
  });
});
