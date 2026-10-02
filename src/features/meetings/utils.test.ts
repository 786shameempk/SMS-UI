import {
  audienceKey, countdown, formatBytes, formatDayLabel, formatDuration, formatLongDate, formatTimeRange, initials, isoDate, nextQuarterHour, relativeStart, toLocalInputValue,
} from "./utils";

describe("meeting formatting helpers", () => {
  const now = new Date(2026, 9, 2, 12, 0, 0);

  it("labels nearby days in plain words", () => {
    expect(formatDayLabel(new Date(2026, 9, 2, 8).toISOString(), now)).toBe("Today");
    expect(formatDayLabel(new Date(2026, 9, 3, 23).toISOString(), now)).toBe("Tomorrow");
    expect(formatDayLabel(new Date(2026, 9, 1, 1).toISOString(), now)).toBe("Yesterday");
    expect(formatDayLabel(new Date(2026, 9, 9).toISOString(), now)).toBe(new Date(2026, 9, 9).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }));
  });

  it("formats durations, relative starts and the last-hour countdown", () => {
    expect([formatDuration(45), formatDuration(60), formatDuration(125)]).toEqual(["45 min", "1 h", "2 h 5 min"]);

    const at = (min: number) => new Date(now.getTime() + min * 60_000).toISOString();
    expect(relativeStart(at(12), now.getTime())).toBe("in 12 min");
    expect(relativeStart(at(125), now.getTime())).toBe("in 2 h 5 min");
    expect(relativeStart(at(0), now.getTime())).toBe("now");
    expect(relativeStart(at(-4), now.getTime())).toBe("started 4 min ago");

    expect(countdown(new Date(now.getTime() + 252_000).toISOString(), now.getTime())).toBe("04:12");
    expect(countdown(at(61), now.getTime())).toBeNull();
    expect(countdown(at(-1), now.getTime())).toBeNull();
  });

  it("formats sizes, dates and inputs", () => {
    expect([formatBytes(null), formatBytes(0), formatBytes(500), formatBytes(2048), formatBytes(5 * 1024 * 1024 + 100_000)]).toEqual(["", "", "500 B", "2 KB", "5.1 MB"]);
    expect(toLocalInputValue(new Date(2026, 0, 5, 9, 7))).toBe("2026-01-05T09:07");
    expect(isoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(formatLongDate(now.toISOString())).toContain("2026");
    expect(formatTimeRange(now.toISOString(), new Date(now.getTime() + 1_800_000).toISOString())).toMatch(/ – /);
  });

  it("picks the next quarter hour at least 10 minutes away", () => {
    expect(nextQuarterHour(new Date(2026, 9, 2, 9, 0, 30))).toEqual(new Date(2026, 9, 2, 9, 15));
    expect(nextQuarterHour(new Date(2026, 9, 2, 9, 5))).toEqual(new Date(2026, 9, 2, 9, 15));
    expect(nextQuarterHour(new Date(2026, 9, 2, 9, 6))).toEqual(new Date(2026, 9, 2, 9, 30));
    expect(nextQuarterHour(new Date(2026, 9, 2, 23, 55))).toEqual(new Date(2026, 9, 3, 0, 15));
  });

  it("builds initials and audience keys", () => {
    expect([initials("meera  rao nair"), initials("Asha"), initials("  ")]).toEqual(["MR", "A", ""]);
    expect([audienceKey("Class" as never, "c5"), audienceKey("Everyone" as never)]).toEqual(["Class:c5", "Everyone:"]);
  });
});
