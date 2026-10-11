import type { ExecutiveData } from "./api";
import { campusAlerts } from "./campusAlerts";
import { attentionItems, feeCollectionPercent } from "./executive";
import { compactInr, dayLabel, humanize, monthLabel, percent, share, timeLabel } from "./format";
import { MOCK_CAMPUS, MOCK_EXECUTIVE } from "./mock";

const empty: ExecutiveData = { academic: null, fees: null, academics: null, admissions: null, hr: null, helpdesk: null, branches: null, failed: [] };

describe("attentionItems", () => {
  it("is empty when nothing could be loaded, and for a healthy school", () => {
    expect(attentionItems(empty)).toEqual([]);
    expect(attentionItems({ ...empty, helpdesk: { ...MOCK_EXECUTIVE.helpdesk!, breached: 0 }, hr: { ...MOCK_EXECUTIVE.hr!, pendingLeaveRequests: 0 } })).toEqual([]);
  });

  it("lists critical items before warnings and only for the parts that loaded", () => {
    const items = attentionItems({ ...MOCK_EXECUTIVE, admissions: null });
    expect(items.map((i) => i.tone)).toEqual([...items.map((i) => i.tone)].sort((a) => (a === "danger" ? -1 : 1)));
    expect(items[0].tone).toBe("danger");
    expect(items.some((i) => i.id === "admission-fees")).toBe(false);
    expect(items.find((i) => i.id === "fees")?.text).toContain("72 invoices");
  });

  it("flags low attendance, and attendance not yet marked", () => {
    const base = MOCK_EXECUTIVE.academic!;
    expect(attentionItems({ ...empty, academic: { ...base, today: { ...base.today, percent: 80 } } })[0].text).toContain("only 80%");
    expect(attentionItems({ ...empty, academic: { ...base, today: { ...base.today, marked: 0, percent: null } } })[0].id).toBe("attendance-unmarked");
  });

  it("marks a capped absentee list with a plus sign", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ studentId: String(i), name: "S", classLabel: "", attendancePercent: 50, daysAbsent: 9 }));
    const text = (n: number) => attentionItems({ ...empty, academics: { ...MOCK_EXECUTIVE.academics!, chronicAbsentees: five.slice(0, n), pipeline: { scheduled: 0, ongoing: 0, completed: 0, completedWithoutResults: 0 } } })[0].text;
    expect(text(5)).toMatch(/^5\+ students have/);
    expect(text(1)).toMatch(/^1 student has/);
  });
});

describe("feeCollectionPercent", () => {
  it("is collected over what fell due, null when nothing did", () => {
    expect(feeCollectionPercent(null)).toBeNull();
    expect(feeCollectionPercent({ ...MOCK_EXECUTIVE.fees!, collectedInRange: 50, months: [{ month: "2026-01", collected: 0, expected: 100 }] })).toBe(50);
    expect(feeCollectionPercent({ ...MOCK_EXECUTIVE.fees!, months: [] })).toBeNull();
  });
});

describe("campusAlerts", () => {
  it("puts out-of-stock, overstaying visitors and lost bus signals first, and skips modules the viewer lacks", () => {
    const alerts = campusAlerts(MOCK_CAMPUS);
    expect(alerts.slice(0, 3).every((a) => a.tone === "danger")).toBe(true);
    expect(alerts.every((a) => a.to.startsWith("/"))).toBe(true);
    expect(campusAlerts({ ...MOCK_CAMPUS, inventory: null, visitors: null, transport: null }).every((a) => a.tone === "warning")).toBe(true);
    expect(campusAlerts({ library: null, transport: null, hostel: null, inventory: null, visitors: null, health: null })).toEqual([]);
  });
});

describe("format helpers", () => {
  it("shortens rupees in Indian units", () => {
    expect(compactInr(850)).toBe("₹850");
    expect(compactInr(5_400)).toBe("₹5.4k");
    expect(compactInr(2_50_000)).toBe("₹2.5L");
    expect(compactInr(3_40_00_000)).toBe("₹3.4Cr");
    expect(compactInr(-1_20_000)).toBe("-₹1.2L");
  });

  it("formats percentages, shares, months, days and times", () => {
    expect(percent(null)).toBe("—");
    expect(percent(92.46, 1)).toBe("92.5%");
    expect(share(1, 3)).toBe(33);
    expect(share(5, 0)).toBe(0);
    expect(monthLabel("2026-07")).toBe("Jul 26");
    expect(dayLabel("2026-10-07")).toBe("7 Oct");
    expect(timeLabel("09:05:00")).toBe("9:05 AM");
    expect(timeLabel("13:00:00")).toBe("1:00 PM");
    expect(timeLabel(null)).toBe("");
    expect(humanize("FeeCollection")).toBe("Fee collection");
    expect(humanize("Sms")).toBe("Sms");
  });
});
