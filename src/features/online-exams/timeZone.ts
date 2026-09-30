/**
 * Wall-clock time in an IANA zone ⇄ UTC, without a date library. Teachers enter an exam's start/end as the
 * school's local time; the API stores UTC.
 */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/** The zone's offset from UTC (ms) at a given instant. */
function offsetAt(utcMs: number, timeZone: string): number {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** "2026-10-14" + "10:30" in `timeZone` → ISO UTC string. */
export function zonedToUtcIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the offset across DST boundaries.
  let utc = guess - offsetAt(guess, timeZone);
  utc = guess - offsetAt(utc, timeZone);
  return new Date(utc).toISOString();
}

/** ISO UTC → { date: "2026-10-14", time: "10:30" } as the wall clock reads in `timeZone`. */
export function utcToZoned(iso: string, timeZone: string): { date: string; time: string } {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${String(+parts.hour % 24).padStart(2, "0")}:${parts.minute}` };
}

export const COMMON_TIME_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];
