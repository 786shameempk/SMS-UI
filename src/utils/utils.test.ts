import { cn } from "./cn";
import { formatCurrency, formatDate, formatDateTime, formatRelativeDay } from "./format";
import { mockDelay } from "./mockDelay";
import { getCurrentBranchId, getCurrentTenantId } from "./tenant";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_TENANT_ID } from "@/constants/tenant";
import { defaultBranchIdForTenant } from "@/constants/branch";

describe("cn", () => {
  it("merges conditional classes and lets later tailwind utilities win", () => {
    expect(cn("px-2 py-1", undefined, null, { "text-red-500": true }, "px-4")).toBe("py-1 text-red-500 px-4");
  });
});

describe("format", () => {
  it("formats rupees without paise", () => {
    expect(formatCurrency(125000)).toBe("₹1,25,000");
    expect(formatCurrency(99.6)).toBe("₹100");
  });

  it("names nearby days relative to today", () => {
    const at = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    };
    expect(formatRelativeDay(at(0))).toBe("Today");
    expect(formatRelativeDay(at(1))).toBe("Tomorrow");
    expect(formatRelativeDay(at(-1))).toBe("Yesterday");
    expect(formatRelativeDay(at(3))).toBe("In 3 days");
    expect(formatRelativeDay(at(-4))).toBe("4 days ago");
    expect(formatRelativeDay(at(30))).not.toMatch(/days|Today/);
  });

  it("reads date-only strings as local calendar dates", () => {
    expect(formatDate("2026-09-26")).toContain("26");
    expect(formatDate("2026-09-26")).toContain("2026");
    expect(formatDate("2026-09-26T10:00:00Z")).toContain("2026");
    expect(formatDateTime("2026-09-26T10:30:00")).toContain("26");
  });
});

describe("mockDelay", () => {
  it("resolves with the data after the delay", async () => {
    vi.useFakeTimers();
    const pending = mockDelay({ ok: true }, 50);
    vi.advanceTimersByTime(50);
    await expect(pending).resolves.toEqual({ ok: true });
    vi.useRealTimers();
  });
});

describe("tenant scope helpers", () => {
  it("read the switcher's current tenant and branch", () => {
    useAuthStore.setState({ activeTenantId: "tenant-x", activeBranchId: "tenant-x-north" });
    expect(getCurrentTenantId()).toBe("tenant-x");
    expect(getCurrentBranchId()).toBe("tenant-x-north");
  });

  it("derive the main campus id from the tenant", () => {
    expect(defaultBranchIdForTenant(DEFAULT_TENANT_ID)).toBe("tenant-educore-main");
  });
});
