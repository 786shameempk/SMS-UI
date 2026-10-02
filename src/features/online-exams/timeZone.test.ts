import { utcToZoned, zonedToUtcIso } from "./timeZone";

describe("exam time zones", () => {
  it("converts school wall-clock time to UTC and back", () => {
    expect(zonedToUtcIso("2026-10-14", "10:30", "Asia/Kolkata")).toBe("2026-10-14T05:00:00.000Z");
    expect(zonedToUtcIso("2026-10-14", "10:30", "UTC")).toBe("2026-10-14T10:30:00.000Z");
    expect(utcToZoned("2026-10-14T05:00:00.000Z", "Asia/Kolkata")).toEqual({ date: "2026-10-14", time: "10:30" });
    expect(utcToZoned("2026-10-14T20:00:00.000Z", "Asia/Dubai")).toEqual({ date: "2026-10-15", time: "00:00" });
  });

  it("uses the right offset on both sides of a DST change", () => {
    expect(zonedToUtcIso("2026-01-15", "09:00", "Europe/London")).toBe("2026-01-15T09:00:00.000Z");
    expect(zonedToUtcIso("2026-07-15", "09:00", "Europe/London")).toBe("2026-07-15T08:00:00.000Z");
    expect(zonedToUtcIso("2026-03-09", "09:00", "America/New_York")).toBe("2026-03-09T13:00:00.000Z");
    expect(utcToZoned("2026-07-15T08:00:00.000Z", "Europe/London")).toEqual({ date: "2026-07-15", time: "09:00" });
  });
});
