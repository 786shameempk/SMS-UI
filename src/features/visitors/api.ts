import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import type {
  HostDetails,
  PreApprovalStatus,
  PreApprovedVisit,
  PreApprovedVisitFormValues,
  PreApprovedVisitRow,
  VisitorCheckInFormValues,
  VisitorEntry,
  VisitorEntryRow,
  VisitorHostType,
  VisitorReportsSummary,
  VisitorStatus,
  VisitPurpose,
  WatchlistEntry,
  WatchlistEntryFormValues,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase/kebab-case unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const STATUS_TO_API: Record<VisitorStatus, string> = { "checked-in": "CheckedIn", "checked-out": "CheckedOut" };
const STATUS_FROM_API: Record<string, VisitorStatus> = { CheckedIn: "checked-in", CheckedOut: "checked-out" };

const HOST_TYPE_TO_API: Record<VisitorHostType, string> = { student: "Student", staff: "Staff", other: "Other" };
const HOST_TYPE_FROM_API: Record<string, VisitorHostType> = { Student: "student", Staff: "staff", Other: "other" };

const PURPOSE_TO_API: Record<VisitPurpose, string> = {
  meeting: "Meeting",
  pickup: "Pickup",
  delivery: "Delivery",
  maintenance: "Maintenance",
  interview: "Interview",
  event: "Event",
  other: "Other",
};
const PURPOSE_FROM_API: Record<string, VisitPurpose> = {
  Meeting: "meeting",
  Pickup: "pickup",
  Delivery: "delivery",
  Maintenance: "maintenance",
  Interview: "interview",
  Event: "event",
  Other: "other",
};

const PRE_APPROVAL_STATUS_TO_API: Record<PreApprovalStatus, string> = {
  scheduled: "Scheduled",
  arrived: "Arrived",
  cancelled: "Cancelled",
  "no-show": "NoShow",
};
const PRE_APPROVAL_STATUS_FROM_API: Record<string, PreApprovalStatus> = {
  Scheduled: "scheduled",
  Arrived: "arrived",
  Cancelled: "cancelled",
  NoShow: "no-show",
};

// ── API response shapes (CampusService DTOs) ────────────────────────────────

interface ApiHostFields {
  visitorName: string;
  phone: string;
  purpose: string;
  purposeNotes: string | null;
  hostType: string;
  hostStudentId: string | null;
  hostStaffId: string | null;
  hostOtherLabel: string | null;
}

interface ApiVisitorEntry extends ApiHostFields {
  id: string;
  tenantId: string;
  branchId: string;
  idProofType: string | null;
  idProofNumber: string | null;
  badgeNumber: string;
  checkInAt: string;
  checkOutAt: string | null;
  status: string;
  preApprovalId: string | null;
}

interface ApiPreApprovedVisit extends ApiHostFields {
  id: string;
  tenantId: string;
  branchId: string;
  scheduledAt: string;
  status: string;
  visitorEntryId: string | null;
}

interface ApiWatchlistEntry {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  reason: string;
  addedAt: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapHost(dto: ApiHostFields): HostDetails & { visitorName: string; phone: string; purpose: VisitPurpose; purposeNotes?: string } {
  return {
    visitorName: dto.visitorName,
    phone: dto.phone,
    purpose: PURPOSE_FROM_API[dto.purpose] ?? "other",
    purposeNotes: dto.purposeNotes ?? undefined,
    hostType: HOST_TYPE_FROM_API[dto.hostType] ?? "other",
    hostStudentId: dto.hostStudentId ?? undefined,
    hostStaffId: dto.hostStaffId ?? undefined,
    hostOtherLabel: dto.hostOtherLabel ?? undefined,
  };
}

function mapEntry(dto: ApiVisitorEntry): VisitorEntry {
  return {
    ...mapHost(dto),
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    idProofType: dto.idProofType ?? undefined,
    idProofNumber: dto.idProofNumber ?? undefined,
    badgeNumber: dto.badgeNumber,
    checkInAt: dto.checkInAt,
    checkOutAt: dto.checkOutAt ?? undefined,
    status: STATUS_FROM_API[dto.status] ?? "checked-in",
    preApprovalId: dto.preApprovalId ?? undefined,
  };
}

function mapPreApproval(dto: ApiPreApprovedVisit): PreApprovedVisit {
  return {
    ...mapHost(dto),
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    scheduledAt: dto.scheduledAt,
    status: PRE_APPROVAL_STATUS_FROM_API[dto.status] ?? "scheduled",
    visitorEntryId: dto.visitorEntryId ?? undefined,
  };
}

function mapWatchlist(dto: ApiWatchlistEntry): WatchlistEntry {
  return { id: dto.id, tenantId: dto.tenantId, name: dto.name, phone: dto.phone ?? undefined, reason: dto.reason, addedAt: dto.addedAt };
}

function blankToNull(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

/** Only the host id matching hostType is sent, so a stale id from a previously-picked host type never leaks through. */
function hostPayload(values: HostDetails & { visitorName: string; phone: string; purpose: VisitPurpose; purposeNotes?: string }) {
  return {
    visitorName: values.visitorName,
    phone: values.phone,
    purpose: PURPOSE_TO_API[values.purpose],
    purposeNotes: blankToNull(values.purposeNotes),
    hostType: HOST_TYPE_TO_API[values.hostType],
    hostStudentId: values.hostType === "student" ? values.hostStudentId || null : null,
    hostStaffId: values.hostType === "staff" ? values.hostStaffId || null : null,
    hostOtherLabel: values.hostType === "other" ? blankToNull(values.hostOtherLabel) : null,
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

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

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ── Watchlist (checked first so check-in flows can flag matches) ──────────

export async function listWatchlist(): Promise<WatchlistEntry[]> {
  const entries = await unwrap(campusHttpClient.get<ApiWatchlistEntry[]>("/api/watchlist"));
  return entries.map(mapWatchlist);
}

/** Advisory match by case-insensitive trimmed name, same rule as the mock - never blocks a check-in. */
export async function getWatchlistMatch(visitorName: string): Promise<WatchlistEntry | undefined> {
  const normalized = normalizeName(visitorName);
  return (await listWatchlist()).find((w) => normalizeName(w.name) === normalized);
}

export async function addWatchlistEntry(values: WatchlistEntryFormValues): Promise<WatchlistEntry> {
  const dto = await unwrap(
    campusHttpClient.post<ApiWatchlistEntry>("/api/watchlist", { name: values.name, phone: blankToNull(values.phone), reason: values.reason }),
  );
  return mapWatchlist(dto);
}

export async function deleteWatchlistEntry(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/watchlist/${id}`));
}

// ── Visitor log (check-in / check-out) ─────────────────────────────────

export async function listVisitorEntries(status?: VisitorEntry["status"]): Promise<VisitorEntryRow[]> {
  const [entries, watchlist, { studentById, staffById }] = await Promise.all([
    unwrap(campusHttpClient.get<ApiVisitorEntry[]>("/api/visitorentries", { params: status ? { status: STATUS_TO_API[status] } : undefined })),
    listWatchlist(),
    joinContext(),
  ]);
  const watchNames = new Set(watchlist.map((w) => normalizeName(w.name)));
  return entries.map(mapEntry).map(
    (e): VisitorEntryRow => ({
      ...e,
      hostStudent: e.hostStudentId ? studentById.get(e.hostStudentId) : undefined,
      hostStaff: e.hostStaffId ? staffById.get(e.hostStaffId) : undefined,
      hostLabel: hostLabel(e, studentById, staffById),
      durationMinutes: e.checkOutAt ? Math.round((new Date(e.checkOutAt).getTime() - new Date(e.checkInAt).getTime()) / 60000) : undefined,
      onWatchlist: watchNames.has(normalizeName(e.visitorName)),
    }),
  );
}

export async function checkInVisitor(values: VisitorCheckInFormValues): Promise<VisitorEntry> {
  const dto = await unwrap(
    campusHttpClient.post<ApiVisitorEntry>("/api/visitorentries", {
      ...hostPayload(values),
      idProofType: blankToNull(values.idProofType),
      idProofNumber: blankToNull(values.idProofNumber),
      preApprovalId: values.preApprovalId || null,
    }),
  );
  return mapEntry(dto);
}

export async function checkInFromPreApproval(preApprovalId: string): Promise<VisitorEntry> {
  const dto = await unwrap(campusHttpClient.post<ApiVisitorEntry>(`/api/visitorentries/from-pre-approval/${preApprovalId}`));
  return mapEntry(dto);
}

export async function checkOutVisitor(id: string): Promise<VisitorEntry> {
  const dto = await unwrap(campusHttpClient.post<ApiVisitorEntry>(`/api/visitorentries/${id}/check-out`));
  return mapEntry(dto);
}

export async function deleteVisitorEntry(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/visitorentries/${id}`));
}

// ── Pre-approved visits ──────────────────────────────────────────────────

export async function listPreApprovedVisits(status?: PreApprovedVisit["status"]): Promise<PreApprovedVisitRow[]> {
  const [visits, { studentById, staffById }] = await Promise.all([
    unwrap(
      campusHttpClient.get<ApiPreApprovedVisit[]>("/api/preapprovedvisits", {
        params: status ? { status: PRE_APPROVAL_STATUS_TO_API[status] } : undefined,
      }),
    ),
    joinContext(),
  ]);
  return visits.map(mapPreApproval).map(
    (p): PreApprovedVisitRow => ({
      ...p,
      hostStudent: p.hostStudentId ? studentById.get(p.hostStudentId) : undefined,
      hostStaff: p.hostStaffId ? staffById.get(p.hostStaffId) : undefined,
      hostLabel: hostLabel(p, studentById, staffById),
    }),
  );
}

export async function createPreApprovedVisit(values: PreApprovedVisitFormValues): Promise<PreApprovedVisit> {
  const dto = await unwrap(
    campusHttpClient.post<ApiPreApprovedVisit>("/api/preapprovedvisits", {
      ...hostPayload(values),
      // The form's datetime-local value is local wall-clock time; CampusService stores UTC.
      scheduledAt: new Date(values.scheduledAt).toISOString(),
    }),
  );
  return mapPreApproval(dto);
}

export async function cancelPreApprovedVisit(id: string): Promise<PreApprovedVisit> {
  const dto = await unwrap(campusHttpClient.post<ApiPreApprovedVisit>(`/api/preapprovedvisits/${id}/cancel`));
  return mapPreApproval(dto);
}

export async function deletePreApprovedVisit(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/preapprovedvisits/${id}`));
}

// ── Reports ────────────────────────────────────────────────────────────

/**
 * Composed client-side from listVisitorEntries: "today" is the viewer's local day and the top-hosts
 * labels need AcademicService student/staff names, neither of which CampusService can know.
 */
export async function getVisitorReportsSummary(): Promise<VisitorReportsSummary> {
  const entries = await listVisitorEntries();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const currentlyOnPremises = entries.filter((e) => e.status === "checked-in").length;
  const visitsToday = entries.filter((e) => new Date(e.checkInAt).getTime() >= todayStart.getTime()).length;
  const visitsLast30Days = entries.filter((e) => new Date(e.checkInAt).getTime() >= thirtyDaysAgo).length;

  const purposeCounts = new Map<VisitPurpose, number>();
  for (const e of entries) purposeCounts.set(e.purpose, (purposeCounts.get(e.purpose) ?? 0) + 1);
  const visitsByPurpose = Array.from(purposeCounts.entries())
    .map(([purpose, count]) => ({ purpose, count }))
    .sort((a, b) => b.count - a.count);

  const durations = entries.map((e) => e.durationMinutes).filter((d): d is number => d !== undefined);
  const avgVisitDurationMinutes = durations.length === 0 ? null : Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);

  const hostCounts = new Map<string, number>();
  for (const e of entries) hostCounts.set(e.hostLabel, (hostCounts.get(e.hostLabel) ?? 0) + 1);
  const topHosts = Array.from(hostCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { currentlyOnPremises, visitsToday, visitsLast30Days, visitsByPurpose, avgVisitDurationMinutes, topHosts };
}
