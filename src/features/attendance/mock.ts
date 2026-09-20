import { SEED_STAFF } from "@/features/staff/mock";
import type { AttendanceRecord, AttendanceStatus, StaffAttendanceRecord, StaffAttendanceStatus, StudentRosterEntry } from "./types";

/**
 * Real Class/Section records live in the academics module, but Student records key off
 * plain className/section strings with no shared id, so there's no clean join between the
 * two for a "students in this section" query. We seed our own lightweight roster here,
 * keyed by real academics sectionIds (sec-1-a, sec-6-a, sec-9-a) so pickers stay in sync
 * with Academic Setup while the roster data itself is self-contained.
 */
const FIRST_NAMES_F = [
  "Ananya", "Diya", "Ira", "Myra", "Sara", "Anika", "Kavya", "Riya", "Aadhya", "Navya",
  "Pari", "Siya", "Tara", "Zara", "Meher", "Aisha", "Ishita", "Kiara", "Naina", "Reet",
];
const FIRST_NAMES_M = [
  "Aarav", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Rohan", "Aditya", "Kabir",
  "Yash", "Dhruv", "Karan", "Nikhil", "Rudra", "Om", "Aryan", "Vivaan", "Shaurya", "Advait",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Nair", "Menon", "Iyer", "Reddy", "Rao", "Kapoor", "Singh",
  "Patel", "Joshi", "Bose", "Chatterjee", "Pillai", "Desai", "Malhotra", "Kulkarni", "Bhat", "Shetty",
];

function buildSectionRoster(sectionId: string, classCode: string, sectionLabel: string, count: number): StudentRosterEntry[] {
  return Array.from({ length: count }).map((_, i) => {
    const isFemale = i % 2 === 0;
    const first = isFemale ? FIRST_NAMES_F[i % FIRST_NAMES_F.length] : FIRST_NAMES_M[i % FIRST_NAMES_M.length];
    const last = LAST_NAMES[(i * 3 + sectionId.length) % LAST_NAMES.length];
    const roll = String(i + 1).padStart(2, "0");
    return {
      id: `${sectionId}-stu-${roll}`,
      sectionId,
      admissionNumber: `EDU-2023-${classCode}${sectionLabel}-${roll}`,
      firstName: first,
      lastName: last,
      rollNumber: `${classCode}${sectionLabel}-${roll}`,
    };
  });
}

export const SEED_ROSTER: StudentRosterEntry[] = [
  ...buildSectionRoster("sec-1-a", "1", "A", 18),
  ...buildSectionRoster("sec-6-a", "6", "A", 20),
  ...buildSectionRoster("sec-9-a", "9", "A", 17),
];

const DAY_MS = 1000 * 60 * 60 * 24;
const HISTORY_DAYS = 100;

function daysAgo(n: number): Date {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(9, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Deterministic string hash so seed data is stable across reloads before the first real save. */
function simpleHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function studentStatusForRoll(roll: number): AttendanceStatus {
  if (roll < 84) return "present";
  if (roll < 92) return "absent";
  if (roll < 97) return "late";
  if (roll < 99) return "half-day";
  return "leave";
}

function staffStatusForRoll(roll: number): StaffAttendanceStatus {
  if (roll < 90) return "present";
  if (roll < 96) return "absent";
  return "late";
}

function buildSeedAttendanceRecords(): Omit<AttendanceRecord, "tenantId" | "branchId">[] {
  const records: Omit<AttendanceRecord, "tenantId" | "branchId">[] = [];
  for (let offset = HISTORY_DAYS; offset >= 1; offset--) {
    const date = daysAgo(offset);
    if (date.getDay() === 0) continue;
    const key = dateKey(date);
    for (const student of SEED_ROSTER) {
      const roll = simpleHash(`${student.id}-${key}`) % 100;
      records.push({
        id: `att-${student.id}-${key}`,
        studentId: student.id,
        sectionId: student.sectionId,
        date: key,
        status: studentStatusForRoll(roll),
        captureMode: "manual",
        markedAt: date.toISOString(),
      });
    }
  }
  return records;
}

function buildSeedStaffAttendanceRecords(): Omit<StaffAttendanceRecord, "tenantId" | "branchId">[] {
  const records: Omit<StaffAttendanceRecord, "tenantId" | "branchId">[] = [];
  const staffPool = SEED_STAFF.filter((s) => s.status === "active" || s.status === "on-leave");
  for (let offset = HISTORY_DAYS; offset >= 1; offset--) {
    const date = daysAgo(offset);
    if (date.getDay() === 0) continue;
    const key = dateKey(date);
    for (const member of staffPool) {
      const roll = simpleHash(`${member.id}-${key}`) % 100;
      records.push({
        id: `satt-${member.id}-${key}`,
        staffId: member.id,
        date: key,
        status: staffStatusForRoll(roll),
        markedAt: date.toISOString(),
      });
    }
  }
  return records;
}

export const SEED_ATTENDANCE_RECORDS: Omit<AttendanceRecord, "tenantId" | "branchId">[] = buildSeedAttendanceRecords();
export const SEED_STAFF_ATTENDANCE_RECORDS: Omit<StaffAttendanceRecord, "tenantId" | "branchId">[] = buildSeedStaffAttendanceRecords();
