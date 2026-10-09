import { readLastFeature, recommend, rememberFeature } from "./recommend";

const all = ["ask", "study", "learning", "tools", "assistant", "insights", "at-risk", "analytics", "usage"].map((value) => ({ value }));
const only = (...values: string[]) => all.filter((s) => values.includes(s.value));
const values = (picks: { section: { value: string } }[]) => picks.map((p) => p.section.value);

describe("recommend", () => {
  it("suggests what each role usually comes for, best first", () => {
    expect(values(recommend(all, "teacher", null))).toEqual(["tools", "assistant", "ask"]);
    expect(values(recommend(all, "student", null))).toEqual(["study", "learning", "ask"]);
    expect(values(recommend(all, "admin", null))).toEqual(["insights", "at-risk", "analytics"]);
  });

  it("skips features the user cannot use, and never invents one", () => {
    expect(values(recommend(only("ask", "study"), "teacher", null))).toEqual(["ask"]);
    expect(values(recommend(only("ask", "study"), "parent", null))).toEqual(["ask", "study"]);
  });

  it("falls back to the first available feature when none of the usual ones are", () => {
    expect(values(recommend(only("usage", "study"), "teacher", null))).toEqual(["study"]);
    expect(recommend([], "teacher", null)).toEqual([]);
  });

  it("puts the feature used last first, once, with a reason, and keeps the row short", () => {
    const picks = recommend(all, "teacher", "tools");
    expect(picks[0]).toMatchObject({ section: { value: "tools" }, reason: "You used this last" });
    expect(values(picks)).toEqual(["tools", "assistant", "ask"]);

    const other = recommend(all, "teacher", "usage");
    expect(values(other)).toEqual(["usage", "tools", "assistant"]);
  });

  it("ignores a remembered feature the user can no longer use, and unknown roles get the defaults", () => {
    expect(values(recommend(only("ask", "insights"), "teacher", "usage"))).toEqual(["ask"]);
    expect(values(recommend(all, "receptionist", null))).toEqual(["ask", "insights"]);
    expect(values(recommend(all, undefined, null))).toEqual(["ask", "insights"]);
  });
});

describe("last used feature", () => {
  beforeEach(() => localStorage.clear());

  it("is remembered between visits", () => {
    expect(readLastFeature()).toBeNull();
    rememberFeature("study");
    expect(readLastFeature()).toBe("study");
  });
});
