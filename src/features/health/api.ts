import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { bmiCategory, calculateBmi, vaccinationStatus } from "./constants";
import type {
  HealthCheckup,
  HealthCheckupFormValues,
  HealthCheckupRow,
  HealthRecordRow,
  HealthReportsSummary,
  InfirmaryVisit,
  InfirmaryVisitFormValues,
  InfirmaryVisitRow,
  MarkVaccinationAdministeredFormValues,
  VaccinationFormValues,
  VaccinationRecord,
  VaccinationRow,
  VisitOutcome,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// snake_case unions here - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const OUTCOME_TO_API: Record<VisitOutcome, string> = {
  returned_to_class: "ReturnedToClass",
  sent_home: "SentHome",
  referred_to_hospital: "ReferredToHospital",
  admitted_to_infirmary: "AdmittedToInfirmary",
};
const OUTCOME_FROM_API: Record<string, VisitOutcome> = {
  ReturnedToClass: "returned_to_class",
  SentHome: "sent_home",
  ReferredToHospital: "referred_to_hospital",
  AdmittedToInfirmary: "admitted_to_infirmary",
};

// ── API response shapes (CampusService DTOs) ────────────────────────────────

interface ApiHealthCheckup {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  checkupDate: string;
  heightCm: number;
  weightKg: number;
  visionLeft: string;
  visionRight: string;
  dentalRemarks: string | null;
  generalRemarks: string | null;
  examinedByStaffId: string | null;
}

interface ApiVaccinationRecord {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  vaccineName: string;
  doseNumber: number;
  dueDate: string;
  dateAdministered: string | null;
  administeredByStaffId: string | null;
  notes: string | null;
}

interface ApiInfirmaryVisit {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  visitedAt: string;
  symptoms: string;
  temperatureC: number | null;
  treatmentGiven: string;
  medicineGiven: string | null;
  outcome: string;
  parentNotified: boolean;
  attendedByStaffId: string | null;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapCheckup(dto: ApiHealthCheckup): HealthCheckup {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    studentId: dto.studentId,
    checkupDate: dto.checkupDate,
    heightCm: dto.heightCm,
    weightKg: dto.weightKg,
    visionLeft: dto.visionLeft,
    visionRight: dto.visionRight,
    dentalRemarks: dto.dentalRemarks ?? undefined,
    generalRemarks: dto.generalRemarks ?? undefined,
    examinedByStaffId: dto.examinedByStaffId ?? undefined,
  };
}

function mapVaccination(dto: ApiVaccinationRecord): VaccinationRecord {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    studentId: dto.studentId,
    vaccineName: dto.vaccineName,
    doseNumber: dto.doseNumber,
    dueDate: dto.dueDate,
    dateAdministered: dto.dateAdministered ?? undefined,
    administeredByStaffId: dto.administeredByStaffId ?? undefined,
    notes: dto.notes ?? undefined,
  };
}

function mapVisit(dto: ApiInfirmaryVisit): InfirmaryVisit {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    studentId: dto.studentId,
    visitedAt: dto.visitedAt,
    symptoms: dto.symptoms,
    temperatureC: dto.temperatureC ?? undefined,
    treatmentGiven: dto.treatmentGiven,
    medicineGiven: dto.medicineGiven ?? undefined,
    outcome: OUTCOME_FROM_API[dto.outcome] ?? "returned_to_class",
    parentNotified: dto.parentNotified,
    attendedByStaffId: dto.attendedByStaffId ?? undefined,
  };
}

function blankToNull(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function studentParams(studentId?: string) {
  return studentId ? { studentId } : undefined;
}

async function joinContext(): Promise<{ studentById: Map<string, Student>; staffById: Map<string, StaffMember> }> {
  const [students, staff] = await Promise.all([listStudents(), listStaff()]);
  return {
    studentById: new Map(students.map((s) => [s.id, s] as const)),
    staffById: new Map(staff.map((s) => [s.id, s] as const)),
  };
}

async function fetchVisits(studentId?: string): Promise<InfirmaryVisit[]> {
  const visits = await unwrap(campusHttpClient.get<ApiInfirmaryVisit[]>("/api/infirmaryvisits", { params: studentParams(studentId) }));
  return visits.map(mapVisit);
}

// ── Checkups ─────────────────────────────────────────────────────────────

/** Rows whose student no longer resolves are dropped, matching the mock; BMI is derived here, not stored. */
export async function listHealthCheckups(studentId?: string): Promise<HealthCheckupRow[]> {
  const [checkups, { studentById, staffById }] = await Promise.all([
    unwrap(campusHttpClient.get<ApiHealthCheckup[]>("/api/healthcheckups", { params: studentParams(studentId) })),
    joinContext(),
  ]);
  return checkups
    .map(mapCheckup)
    .map((c): HealthCheckupRow | null => {
      const student = studentById.get(c.studentId);
      if (!student) return null;
      const bmi = calculateBmi(c.heightCm, c.weightKg);
      return { ...c, student, examinedBy: c.examinedByStaffId ? staffById.get(c.examinedByStaffId) : undefined, bmi, bmiCategory: bmiCategory(bmi) };
    })
    .filter((row): row is HealthCheckupRow => row !== null);
}

export async function createHealthCheckup(values: HealthCheckupFormValues): Promise<HealthCheckup> {
  const dto = await unwrap(
    campusHttpClient.post<ApiHealthCheckup>("/api/healthcheckups", {
      studentId: values.studentId,
      checkupDate: values.checkupDate,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
      visionLeft: values.visionLeft,
      visionRight: values.visionRight,
      dentalRemarks: blankToNull(values.dentalRemarks),
      generalRemarks: blankToNull(values.generalRemarks),
      examinedByStaffId: values.examinedByStaffId || null,
    }),
  );
  return mapCheckup(dto);
}

export async function deleteHealthCheckup(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/healthcheckups/${id}`));
}

// ── Vaccinations ─────────────────────────────────────────────────────────

/** Status (completed/due/overdue) is derived against the viewer's today, not stored. */
export async function listVaccinations(studentId?: string): Promise<VaccinationRow[]> {
  const [records, { studentById, staffById }] = await Promise.all([
    unwrap(campusHttpClient.get<ApiVaccinationRecord[]>("/api/vaccinationrecords", { params: studentParams(studentId) })),
    joinContext(),
  ]);
  return records
    .map(mapVaccination)
    .map((v): VaccinationRow | null => {
      const student = studentById.get(v.studentId);
      if (!student) return null;
      return {
        ...v,
        student,
        administeredBy: v.administeredByStaffId ? staffById.get(v.administeredByStaffId) : undefined,
        status: vaccinationStatus(v),
      };
    })
    .filter((row): row is VaccinationRow => row !== null);
}

export async function createVaccination(values: VaccinationFormValues): Promise<VaccinationRecord> {
  const dto = await unwrap(
    campusHttpClient.post<ApiVaccinationRecord>("/api/vaccinationrecords", {
      studentId: values.studentId,
      vaccineName: values.vaccineName,
      doseNumber: values.doseNumber,
      dueDate: values.dueDate,
      notes: blankToNull(values.notes),
    }),
  );
  return mapVaccination(dto);
}

export async function markVaccinationAdministered(id: string, values: MarkVaccinationAdministeredFormValues): Promise<VaccinationRecord> {
  const dto = await unwrap(
    campusHttpClient.post<ApiVaccinationRecord>(`/api/vaccinationrecords/${id}/administer`, {
      dateAdministered: values.dateAdministered,
      administeredByStaffId: values.administeredByStaffId || null,
    }),
  );
  return mapVaccination(dto);
}

export async function deleteVaccination(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/vaccinationrecords/${id}`));
}

// ── Infirmary visits ─────────────────────────────────────────────────────

export async function listInfirmaryVisits(studentId?: string): Promise<InfirmaryVisitRow[]> {
  const [visits, { studentById, staffById }] = await Promise.all([fetchVisits(studentId), joinContext()]);
  return visits
    .map((v): InfirmaryVisitRow | null => {
      const student = studentById.get(v.studentId);
      if (!student) return null;
      return { ...v, student, attendedBy: v.attendedByStaffId ? staffById.get(v.attendedByStaffId) : undefined };
    })
    .filter((row): row is InfirmaryVisitRow => row !== null);
}

export async function createInfirmaryVisit(values: InfirmaryVisitFormValues): Promise<InfirmaryVisit> {
  const dto = await unwrap(
    campusHttpClient.post<ApiInfirmaryVisit>("/api/infirmaryvisits", {
      studentId: values.studentId,
      // The form's datetime-local value is local wall-clock time; CampusService stores UTC.
      visitedAt: new Date(values.visitedAt).toISOString(),
      symptoms: values.symptoms,
      temperatureC: values.temperatureC ?? null,
      treatmentGiven: values.treatmentGiven,
      medicineGiven: blankToNull(values.medicineGiven),
      outcome: OUTCOME_TO_API[values.outcome],
      parentNotified: values.parentNotified,
      attendedByStaffId: values.attendedByStaffId || null,
    }),
  );
  return mapVisit(dto);
}

export async function deleteInfirmaryVisit(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/infirmaryvisits/${id}`));
}

// ── Health records overview + reports ────────────────────────────────────
// Composed client-side: baseline medical data lives on AcademicService's Student record, and the
// overdue/this-year/last-30-days cut-offs are the viewer's local calendar.

export async function listHealthRecords(): Promise<HealthRecordRow[]> {
  const [students, checkups, vaccinations, visits] = await Promise.all([
    listStudents(),
    unwrap(campusHttpClient.get<ApiHealthCheckup[]>("/api/healthcheckups")),
    unwrap(campusHttpClient.get<ApiVaccinationRecord[]>("/api/vaccinationrecords")),
    fetchVisits(),
  ]);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();

  return students
    .filter((s) => s.status === "active")
    .map((student) => {
      const lastCheckupDate = checkups
        .filter((c) => c.studentId === student.id)
        .map((c) => c.checkupDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const overdueVaccinations = vaccinations
        .map(mapVaccination)
        .filter((v) => v.studentId === student.id && vaccinationStatus(v) === "overdue").length;
      const visitCountThisYear = visits.filter((v) => v.studentId === student.id && new Date(v.visitedAt).getTime() >= yearStart).length;
      return { student, lastCheckupDate, overdueVaccinations, visitCountThisYear };
    });
}

export async function getHealthReportsSummary(): Promise<HealthReportsSummary> {
  const [students, checkupRows, vaccinationRows, visits] = await Promise.all([
    listStudents(),
    listHealthCheckups(),
    listVaccinations(),
    fetchVisits(),
  ]);
  const activeStudents = students.filter((s) => s.status === "active");

  const studentsWithAllergies = activeStudents.filter((s) => s.medical.allergies?.trim()).length;
  const studentsWithConditions = activeStudents.filter((s) => s.medical.conditions?.trim()).length;

  const overdueVaccinations = vaccinationRows.filter((v) => v.status === "overdue");
  const upcomingVaccinations = vaccinationRows
    .filter((v) => v.status === "due")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const visitsLast30Days = visits.filter((v) => new Date(v.visitedAt).getTime() >= thirtyDaysAgo).length;

  const outcomeCounts = new Map<VisitOutcome, number>();
  for (const v of visits) outcomeCounts.set(v.outcome, (outcomeCounts.get(v.outcome) ?? 0) + 1);
  const visitsByOutcome = Array.from(outcomeCounts.entries()).map(([outcome, count]) => ({ outcome, count }));

  const latestCheckupByStudent = new Map<string, HealthCheckupRow>();
  for (const row of checkupRows) {
    const existing = latestCheckupByStudent.get(row.studentId);
    if (!existing || new Date(row.checkupDate) > new Date(existing.checkupDate)) latestCheckupByStudent.set(row.studentId, row);
  }
  const bmiCounts = new Map<HealthCheckupRow["bmiCategory"], number>();
  for (const row of latestCheckupByStudent.values()) bmiCounts.set(row.bmiCategory, (bmiCounts.get(row.bmiCategory) ?? 0) + 1);
  const bmiDistribution = Array.from(bmiCounts.entries()).map(([category, count]) => ({ category, count }));

  return {
    totalActiveStudents: activeStudents.length,
    studentsWithAllergies,
    studentsWithConditions,
    overdueVaccinations,
    upcomingVaccinations,
    visitsLast30Days,
    visitsByOutcome,
    bmiDistribution,
  };
}
