import { mockDelay } from "@/utils/mockDelay";
import { createStaff, listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { bmiCategory, calculateBmi, vaccinationStatus } from "./constants";
import { buildSeedHealthData, EXTRA_NURSE_SEEDS } from "./mock";
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
} from "./types";

const CHECKUPS_KEY = "sms-mock-health-checkups";
const VACCINATIONS_KEY = "sms-mock-health-vaccinations";
const VISITS_KEY = "sms-mock-health-visits";
const SEEDED_KEY = "sms-mock-health-seeded";

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

let checkups = loadJson<HealthCheckup[]>(CHECKUPS_KEY, []);
let vaccinations = loadJson<VaccinationRecord[]>(VACCINATIONS_KEY, []);
let visits = loadJson<InfirmaryVisit[]>(VISITS_KEY, []);

function persistCheckups() {
  saveJson(CHECKUPS_KEY, checkups);
}
function persistVaccinations() {
  saveJson(VACCINATIONS_KEY, vaccinations);
}
function persistVisits() {
  saveJson(VISITS_KEY, visits);
}

/**
 * Nurses are staff members with designation "Nurse" (see staff/types.ts + EXTRA_NURSE_SEEDS
 * here); checkups/vaccinations/infirmary visits are owned outright by this module, same
 * convention as the hostel and transport modules. Baseline per-student medical info
 * (blood group/allergies/conditions/medications/doctor) already lives on the real
 * `Student.medical` record from the Students module and is read from there, never duplicated.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  const existingStaff = await listStaff();
  const staffIdByEmail = new Map(existingStaff.map((s) => [s.email.toLowerCase(), s.id] as const));
  const toCreate = EXTRA_NURSE_SEEDS.filter((n) => !staffIdByEmail.has(n.email.toLowerCase()));
  const created = await Promise.all(toCreate.map((values) => createStaff(values)));
  for (const member of created) staffIdByEmail.set(member.email.toLowerCase(), member.id);
  const nurseStaffId = staffIdByEmail.get(EXTRA_NURSE_SEEDS[0].email.toLowerCase());

  if (checkups.length === 0 && vaccinations.length === 0 && visits.length === 0) {
    const students = await listStudents();
    const seeded = buildSeedHealthData(students, nurseStaffId);
    checkups = seeded.checkups;
    vaccinations = seeded.vaccinations;
    visits = seeded.visits;
    persistCheckups();
    persistVaccinations();
    persistVisits();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Health & Medical seed failed", err);
});

async function joinContext(): Promise<{ studentById: Map<string, Student>; staffById: Map<string, StaffMember> }> {
  const [students, staff] = await Promise.all([listStudents(), listStaff()]);
  return {
    studentById: new Map(students.map((s) => [s.id, s] as const)),
    staffById: new Map(staff.map((s) => [s.id, s] as const)),
  };
}

// ── Health checkups ─────────────────────────────────────────────────────

export async function listHealthCheckups(studentId?: string): Promise<HealthCheckupRow[]> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  const rows = checkups
    .filter((c) => !studentId || c.studentId === studentId)
    .map((c): HealthCheckupRow | null => {
      const student = studentById.get(c.studentId);
      if (!student) return null;
      const bmi = calculateBmi(c.heightCm, c.weightKg);
      return {
        ...c,
        student,
        examinedBy: c.examinedByStaffId ? staffById.get(c.examinedByStaffId) : undefined,
        bmi,
        bmiCategory: bmiCategory(bmi),
      };
    })
    .filter((row): row is HealthCheckupRow => row !== null)
    .sort((a, b) => new Date(b.checkupDate).getTime() - new Date(a.checkupDate).getTime());
  return mockDelay(rows, 350);
}

export async function createHealthCheckup(values: HealthCheckupFormValues): Promise<HealthCheckup> {
  await seedPromise;
  const checkup: HealthCheckup = { id: genId("checkup"), ...values };
  checkups = [checkup, ...checkups];
  persistCheckups();
  return mockDelay(checkup, 400);
}

export async function deleteHealthCheckup(id: string): Promise<void> {
  await seedPromise;
  requireEntity(checkups, id, "Checkup");
  checkups = checkups.filter((c) => c.id !== id);
  persistCheckups();
  return mockDelay(undefined, 300);
}

// ── Vaccinations ─────────────────────────────────────────────────────────

export async function listVaccinations(studentId?: string): Promise<VaccinationRow[]> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  const rows = vaccinations
    .filter((v) => !studentId || v.studentId === studentId)
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
    .filter((row): row is VaccinationRow => row !== null)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return mockDelay(rows, 350);
}

export async function createVaccination(values: VaccinationFormValues): Promise<VaccinationRecord> {
  await seedPromise;
  const record: VaccinationRecord = { id: genId("vax"), ...values };
  vaccinations = [record, ...vaccinations];
  persistVaccinations();
  return mockDelay(record, 400);
}

export async function markVaccinationAdministered(id: string, values: MarkVaccinationAdministeredFormValues): Promise<VaccinationRecord> {
  await seedPromise;
  const record = requireEntity(vaccinations, id, "Vaccination record");
  const updated: VaccinationRecord = { ...record, dateAdministered: values.dateAdministered, administeredByStaffId: values.administeredByStaffId };
  vaccinations = vaccinations.map((v) => (v.id === id ? updated : v));
  persistVaccinations();
  return mockDelay(updated, 350);
}

export async function deleteVaccination(id: string): Promise<void> {
  await seedPromise;
  requireEntity(vaccinations, id, "Vaccination record");
  vaccinations = vaccinations.filter((v) => v.id !== id);
  persistVaccinations();
  return mockDelay(undefined, 300);
}

// ── Infirmary visits ────────────────────────────────────────────────────

export async function listInfirmaryVisits(studentId?: string): Promise<InfirmaryVisitRow[]> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  const rows = visits
    .filter((v) => !studentId || v.studentId === studentId)
    .map((v): InfirmaryVisitRow | null => {
      const student = studentById.get(v.studentId);
      if (!student) return null;
      return { ...v, student, attendedBy: v.attendedByStaffId ? staffById.get(v.attendedByStaffId) : undefined };
    })
    .filter((row): row is InfirmaryVisitRow => row !== null)
    .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
  return mockDelay(rows, 350);
}

export async function createInfirmaryVisit(values: InfirmaryVisitFormValues): Promise<InfirmaryVisit> {
  await seedPromise;
  const visit: InfirmaryVisit = { id: genId("visit"), ...values };
  visits = [visit, ...visits];
  persistVisits();
  return mockDelay(visit, 400);
}

export async function deleteInfirmaryVisit(id: string): Promise<void> {
  await seedPromise;
  requireEntity(visits, id, "Infirmary visit");
  visits = visits.filter((v) => v.id !== id);
  persistVisits();
  return mockDelay(undefined, 300);
}

// ── Health records overview & reports ──────────────────────────────────

export async function listHealthRecords(): Promise<HealthRecordRow[]> {
  await seedPromise;
  const students = await listStudents();
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();

  const rows: HealthRecordRow[] = students
    .filter((s) => s.status === "active")
    .map((student) => {
      const studentCheckups = checkups.filter((c) => c.studentId === student.id);
      const lastCheckupDate = studentCheckups
        .map((c) => c.checkupDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const overdueVaccinations = vaccinations.filter((v) => v.studentId === student.id && vaccinationStatus(v) === "overdue").length;
      const visitCountThisYear = visits.filter((v) => v.studentId === student.id && new Date(v.visitedAt).getTime() >= yearStart).length;
      return { student, lastCheckupDate, overdueVaccinations, visitCountThisYear };
    });

  return mockDelay(rows, 350);
}

export async function getHealthReportsSummary(): Promise<HealthReportsSummary> {
  await seedPromise;
  const [students, checkupRows, vaccinationRows] = await Promise.all([listStudents(), listHealthCheckups(), listVaccinations()]);
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

  const outcomeCounts = new Map<string, number>();
  for (const v of visits) outcomeCounts.set(v.outcome, (outcomeCounts.get(v.outcome) ?? 0) + 1);
  const visitsByOutcome = Array.from(outcomeCounts.entries()).map(([outcome, count]) => ({ outcome: outcome as InfirmaryVisit["outcome"], count }));

  const bmiCounts = new Map<string, number>();
  const latestCheckupByStudent = new Map<string, HealthCheckupRow>();
  for (const row of checkupRows) {
    const existing = latestCheckupByStudent.get(row.studentId);
    if (!existing || new Date(row.checkupDate) > new Date(existing.checkupDate)) latestCheckupByStudent.set(row.studentId, row);
  }
  for (const row of latestCheckupByStudent.values()) bmiCounts.set(row.bmiCategory, (bmiCounts.get(row.bmiCategory) ?? 0) + 1);
  const bmiDistribution = Array.from(bmiCounts.entries()).map(([category, count]) => ({ category: category as HealthCheckupRow["bmiCategory"], count }));

  return mockDelay(
    {
      totalActiveStudents: activeStudents.length,
      studentsWithAllergies,
      studentsWithConditions,
      overdueVaccinations,
      upcomingVaccinations,
      visitsLast30Days,
      visitsByOutcome,
      bmiDistribution,
    },
    350,
  );
}
