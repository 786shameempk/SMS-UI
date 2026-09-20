import { mockDelay } from "@/utils/mockDelay";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { nextBadgeNumber } from "./constants";
import { buildSeedVisitorData } from "./mock";
import type {
  HostDetails,
  PreApprovedVisit,
  PreApprovedVisitFormValues,
  PreApprovedVisitRow,
  VisitorCheckInFormValues,
  VisitorEntry,
  VisitorEntryRow,
  VisitorReportsSummary,
  VisitPurpose,
  WatchlistEntry,
  WatchlistEntryFormValues,
} from "./types";

const ENTRIES_KEY = "sms-mock-visitors-entries";
const PREAPPROVALS_KEY = "sms-mock-visitors-preapprovals";
const WATCHLIST_KEY = "sms-mock-visitors-watchlist";
const SEEDED_KEY = "sms-mock-visitors-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function requireEntity<T extends { id: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`${label} not found`);
  return found;
}

let entries = loadJson<VisitorEntry[]>(ENTRIES_KEY, []);
let preApprovals = loadJson<PreApprovedVisit[]>(PREAPPROVALS_KEY, []);
let watchlist = loadJson<WatchlistEntry[]>(WATCHLIST_KEY, []);

function persistEntries() {
  saveJson(ENTRIES_KEY, entries);
}
function persistPreApprovals() {
  saveJson(PREAPPROVALS_KEY, preApprovals);
}
function persistWatchlist() {
  saveJson(WATCHLIST_KEY, watchlist);
}

/**
 * Visitors are their own entities (not staff/students) — this module only reads real
 * students/staff to resolve who a visitor is here to see, same read-only join convention as
 * Reports and Calendar. No new staff designation is needed here (unlike Hostel's Warden or
 * Health's Nurse), so seeding is just this module's own data, no cross-module writes.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (entries.length === 0 && preApprovals.length === 0 && watchlist.length === 0) {
    const [students, staff] = await Promise.all([listStudents(), listStaff()]);
    const seeded = buildSeedVisitorData(students, staff);
    entries = seeded.entries;
    preApprovals = seeded.preApprovals;
    watchlist = seeded.watchlist;
    persistEntries();
    persistPreApprovals();
    persistWatchlist();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Visitor Management seed failed", err);
});

async function joinContext(): Promise<{ studentById: Map<string, Student>; staffById: Map<string, StaffMember> }> {
  const [students, staff] = await Promise.all([listStudents(), listStaff()]);
  return {
    studentById: new Map(students.map((s) => [s.id, s] as const)),
    staffById: new Map(staff.map((s) => [s.id, s] as const)),
  };
}

function hostLabel(host: HostDetails, studentById: Map<string, Student>, staffById: Map<string, StaffMember>): string {
  if (host.hostType === "student") {
    const s = host.hostStudentId ? studentById.get(host.hostStudentId) : undefined;
    return s ? `${s.firstName} ${s.lastName} (${s.className} - ${s.section})` : "Unknown student";
  }
  if (host.hostType === "staff") {
    const s = host.hostStaffId ? staffById.get(host.hostStaffId) : undefined;
    return s ? `${s.firstName} ${s.lastName} (${s.designation})` : "Unknown staff";
  }
  return host.hostOtherLabel?.trim() || "Other";
}

function isOnWatchlist(visitorName: string): boolean {
  const normalized = visitorName.trim().toLowerCase();
  return watchlist.some((w) => w.name.trim().toLowerCase() === normalized);
}

// ── Watchlist (checked first so check-in flows can flag matches) ──────────

export async function listWatchlist(): Promise<WatchlistEntry[]> {
  await seedPromise;
  return mockDelay(
    [...watchlist].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()),
    300,
  );
}

export async function getWatchlistMatch(visitorName: string): Promise<WatchlistEntry | undefined> {
  await seedPromise;
  const normalized = visitorName.trim().toLowerCase();
  return mockDelay(
    watchlist.find((w) => w.name.trim().toLowerCase() === normalized),
    150,
  );
}

export async function addWatchlistEntry(values: WatchlistEntryFormValues): Promise<WatchlistEntry> {
  await seedPromise;
  const entry: WatchlistEntry = { id: genId("watch"), addedAt: new Date().toISOString(), ...values };
  watchlist = [entry, ...watchlist];
  persistWatchlist();
  return mockDelay(entry, 350);
}

export async function deleteWatchlistEntry(id: string): Promise<void> {
  await seedPromise;
  requireEntity(watchlist, id, "Watchlist entry");
  watchlist = watchlist.filter((w) => w.id !== id);
  persistWatchlist();
  return mockDelay(undefined, 300);
}

// ── Visitor log (check-in / check-out) ─────────────────────────────────

export async function listVisitorEntries(status?: VisitorEntry["status"]): Promise<VisitorEntryRow[]> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  const rows = entries
    .filter((e) => !status || e.status === status)
    .map((e): VisitorEntryRow => {
      const durationMinutes = e.checkOutAt ? Math.round((new Date(e.checkOutAt).getTime() - new Date(e.checkInAt).getTime()) / 60000) : undefined;
      return {
        ...e,
        hostStudent: e.hostStudentId ? studentById.get(e.hostStudentId) : undefined,
        hostStaff: e.hostStaffId ? staffById.get(e.hostStaffId) : undefined,
        hostLabel: hostLabel(e, studentById, staffById),
        durationMinutes,
        onWatchlist: isOnWatchlist(e.visitorName),
      };
    })
    .sort((a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime());
  return mockDelay(rows, 350);
}

function createEntryRecord(values: VisitorCheckInFormValues): VisitorEntry {
  const badgeNumber = nextBadgeNumber(entries.map((e) => e.badgeNumber));
  const entry: VisitorEntry = {
    id: genId("visit"),
    visitorName: values.visitorName,
    phone: values.phone,
    idProofType: values.idProofType,
    idProofNumber: values.idProofNumber,
    purpose: values.purpose,
    purposeNotes: values.purposeNotes,
    hostType: values.hostType,
    hostStudentId: values.hostStudentId,
    hostStaffId: values.hostStaffId,
    hostOtherLabel: values.hostOtherLabel,
    badgeNumber,
    checkInAt: new Date().toISOString(),
    status: "checked-in",
    preApprovalId: values.preApprovalId,
  };
  entries = [entry, ...entries];
  persistEntries();
  return entry;
}

export async function checkInVisitor(values: VisitorCheckInFormValues): Promise<VisitorEntry> {
  await seedPromise;
  const entry = createEntryRecord(values);
  if (values.preApprovalId) {
    const preApproval = preApprovals.find((p) => p.id === values.preApprovalId);
    if (preApproval) {
      preApprovals = preApprovals.map((p) => (p.id === preApproval.id ? { ...p, status: "arrived", visitorEntryId: entry.id } : p));
      persistPreApprovals();
    }
  }
  return mockDelay(entry, 400);
}

export async function checkInFromPreApproval(preApprovalId: string): Promise<VisitorEntry> {
  await seedPromise;
  const preApproval = requireEntity(preApprovals, preApprovalId, "Pre-approved visit");
  if (preApproval.status !== "scheduled") throw new Error("This visit has already been actioned");
  const entry = createEntryRecord({
    visitorName: preApproval.visitorName,
    phone: preApproval.phone,
    purpose: preApproval.purpose,
    purposeNotes: preApproval.purposeNotes,
    hostType: preApproval.hostType,
    hostStudentId: preApproval.hostStudentId,
    hostStaffId: preApproval.hostStaffId,
    hostOtherLabel: preApproval.hostOtherLabel,
    preApprovalId: preApproval.id,
  });
  preApprovals = preApprovals.map((p) => (p.id === preApprovalId ? { ...p, status: "arrived", visitorEntryId: entry.id } : p));
  persistPreApprovals();
  return mockDelay(entry, 400);
}

export async function checkOutVisitor(id: string): Promise<VisitorEntry> {
  await seedPromise;
  const entry = requireEntity(entries, id, "Visitor entry");
  if (entry.status === "checked-out") throw new Error("This visitor has already checked out");
  const updated: VisitorEntry = { ...entry, checkOutAt: new Date().toISOString(), status: "checked-out" };
  entries = entries.map((e) => (e.id === id ? updated : e));
  persistEntries();
  return mockDelay(updated, 350);
}

export async function deleteVisitorEntry(id: string): Promise<void> {
  await seedPromise;
  requireEntity(entries, id, "Visitor entry");
  entries = entries.filter((e) => e.id !== id);
  persistEntries();
  return mockDelay(undefined, 300);
}

// ── Pre-approved visits ──────────────────────────────────────────────────

export async function listPreApprovedVisits(status?: PreApprovedVisit["status"]): Promise<PreApprovedVisitRow[]> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  const rows = preApprovals
    .filter((p) => !status || p.status === status)
    .map(
      (p): PreApprovedVisitRow => ({
        ...p,
        hostStudent: p.hostStudentId ? studentById.get(p.hostStudentId) : undefined,
        hostStaff: p.hostStaffId ? staffById.get(p.hostStaffId) : undefined,
        hostLabel: hostLabel(p, studentById, staffById),
      }),
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  return mockDelay(rows, 350);
}

export async function createPreApprovedVisit(values: PreApprovedVisitFormValues): Promise<PreApprovedVisit> {
  await seedPromise;
  const record: PreApprovedVisit = { id: genId("preapp"), status: "scheduled", ...values };
  preApprovals = [record, ...preApprovals];
  persistPreApprovals();
  return mockDelay(record, 400);
}

export async function cancelPreApprovedVisit(id: string): Promise<PreApprovedVisit> {
  await seedPromise;
  const record = requireEntity(preApprovals, id, "Pre-approved visit");
  if (record.status !== "scheduled") throw new Error("Only a scheduled visit can be cancelled");
  const updated: PreApprovedVisit = { ...record, status: "cancelled" };
  preApprovals = preApprovals.map((p) => (p.id === id ? updated : p));
  persistPreApprovals();
  return mockDelay(updated, 300);
}

export async function deletePreApprovedVisit(id: string): Promise<void> {
  await seedPromise;
  requireEntity(preApprovals, id, "Pre-approved visit");
  preApprovals = preApprovals.filter((p) => p.id !== id);
  persistPreApprovals();
  return mockDelay(undefined, 300);
}

// ── Reports ────────────────────────────────────────────────────────────

export async function getVisitorReportsSummary(): Promise<VisitorReportsSummary> {
  await seedPromise;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const currentlyOnPremises = entries.filter((e) => e.status === "checked-in").length;
  const visitsToday = entries.filter((e) => new Date(e.checkInAt).getTime() >= todayStart.getTime()).length;
  const visitsLast30Days = entries.filter((e) => new Date(e.checkInAt).getTime() >= thirtyDaysAgo).length;

  const purposeCounts = new Map<string, number>();
  for (const e of entries) purposeCounts.set(e.purpose, (purposeCounts.get(e.purpose) ?? 0) + 1);
  const visitsByPurpose = Array.from(purposeCounts.entries())
    .map(([purpose, count]) => ({ purpose: purpose as VisitPurpose, count }))
    .sort((a, b) => b.count - a.count);

  const completedVisits = entries.filter((e) => e.checkOutAt);
  const avgVisitDurationMinutes =
    completedVisits.length === 0
      ? null
      : Math.round(
          completedVisits.reduce((sum, e) => sum + (new Date(e.checkOutAt!).getTime() - new Date(e.checkInAt).getTime()) / 60000, 0) / completedVisits.length,
        );

  const { studentById, staffById } = await joinContext();
  const hostCounts = new Map<string, number>();
  for (const e of entries) {
    const label = hostLabel(e, studentById, staffById);
    hostCounts.set(label, (hostCounts.get(label) ?? 0) + 1);
  }
  const topHosts = Array.from(hostCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return mockDelay({ currentlyOnPremises, visitsToday, visitsLast30Days, visitsByPurpose, avgVisitDurationMinutes, topHosts }, 350);
}
