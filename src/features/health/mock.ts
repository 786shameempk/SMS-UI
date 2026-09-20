import type { StaffFormValues } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import { ageInYears } from "./constants";
import type { HealthCheckup, InfirmaryVisit, VaccinationRecord } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

/**
 * The generic staff seed ships no "Nurse" designated records. Created through staff's own
 * createStaff() API (see performSeed in api.ts), same convention as EXTRA_WARDEN_SEEDS in
 * the hostel module and EXTRA_DRIVER_SEEDS in transport.
 */
export const EXTRA_NURSE_SEEDS: StaffFormValues[] = [
  {
    firstName: "Meenal",
    lastName: "Joshi",
    dateOfBirth: new Date(Date.now() - 34 * 365 * DAY_MS).toISOString(),
    gender: "female",
    designation: "Nurse",
    department: "Health & Medical",
    phone: "+91 98450 88001",
    email: "meenal.joshi@educore.dev",
    address: "School Infirmary, Ground Floor",
  },
];

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Rough age-based height/weight approximation for a plausible seed checkup — a stand-in for
 * real pediatric growth data, same simplification noted for BMI categorization in constants.ts.
 * Height is derived from age directly; weight is then back-computed from a target BMI that
 * cycles through a realistic spread (mostly "normal", a few "underweight"/"overweight", one
 * "obese") rather than a fixed height/weight ratio, which put every seeded student in the
 * same BMI band regardless of age.
 */
const TARGET_BMI_CYCLE = [19.5, 21, 17.6, 23, 26.5, 20, 18.2, 24.5, 31, 19, 22, 17.9, 20.5, 25.5, 21.5, 18.8];

function approximateVitals(dateOfBirth: string, index: number): { heightCm: number; weightKg: number } {
  const age = Math.max(4, ageInYears(dateOfBirth));
  const heightCm = Math.round(98 + age * 5.6);
  const heightM = heightCm / 100;
  const targetBmi = TARGET_BMI_CYCLE[index % TARGET_BMI_CYCLE.length];
  return { heightCm, weightKg: Math.round(targetBmi * heightM * heightM) };
}

export function buildSeedHealthData(
  students: Student[],
  nurseStaffId: string | undefined,
): { checkups: HealthCheckup[]; vaccinations: VaccinationRecord[]; visits: InfirmaryVisit[] } {
  const activeStudents = students.filter((s) => s.status === "active");
  const checkups: HealthCheckup[] = [];
  const vaccinations: VaccinationRecord[] = [];
  const visits: InfirmaryVisit[] = [];

  activeStudents.forEach((student, index) => {
    const { heightCm, weightKg } = approximateVitals(student.dateOfBirth, index);
    const needsGlasses = index % 5 === 0;
    checkups.push({
      id: genId("checkup"),
      studentId: student.id,
      checkupDate: daysAgo(20 + index * 6),
      heightCm,
      weightKg,
      visionLeft: needsGlasses ? "6/12" : "6/6",
      visionRight: needsGlasses ? "6/9" : "6/6",
      dentalRemarks: index % 4 === 0 ? "Minor cavity noted, referred to dentist" : "No cavities",
      generalRemarks: needsGlasses ? "Recommend vision correction follow-up" : "No concerns",
      examinedByStaffId: nurseStaffId,
    });

    vaccinations.push({
      id: genId("vax"),
      studentId: student.id,
      vaccineName: "MMR Booster",
      doseNumber: 2,
      dueDate: daysAgo(200),
      dateAdministered: daysAgo(190 + index),
      administeredByStaffId: nurseStaffId,
    });

    const secondDoseVariant = index % 3;
    vaccinations.push({
      id: genId("vax"),
      studentId: student.id,
      vaccineName: "Typhoid",
      doseNumber: 1,
      dueDate: secondDoseVariant === 0 ? daysAgo(15) : secondDoseVariant === 1 ? daysFromNow(20) : daysAgo(60),
      dateAdministered: secondDoseVariant === 2 ? daysAgo(55) : undefined,
      administeredByStaffId: secondDoseVariant === 2 ? nurseStaffId : undefined,
    });
  });

  const visitPlan: Array<{ studentIndex: number; daysBack: number; symptoms: string; temperatureC?: number; treatment: string; medicine?: string; outcome: InfirmaryVisit["outcome"]; parentNotified: boolean }> = [
    { studentIndex: 0, daysBack: 3, symptoms: "Headache and mild fever", temperatureC: 37.8, treatment: "Rest in infirmary, paracetamol given", medicine: "Paracetamol 250mg", outcome: "returned_to_class", parentNotified: false },
    { studentIndex: 1, daysBack: 5, symptoms: "Stomach ache after lunch", treatment: "Observed for 30 minutes, symptoms settled", outcome: "returned_to_class", parentNotified: false },
    { studentIndex: 2, daysBack: 8, symptoms: "High fever, chills", temperatureC: 39.2, treatment: "Temperature monitored, advised to see a doctor", outcome: "sent_home", parentNotified: true },
    { studentIndex: 3, daysBack: 10, symptoms: "Scraped knee during PE", treatment: "Wound cleaned and dressed", medicine: "Antiseptic ointment", outcome: "returned_to_class", parentNotified: false },
    { studentIndex: 4, daysBack: 14, symptoms: "Persistent cough and sore throat", temperatureC: 37.5, treatment: "Warm water gargle advised, monitored", outcome: "returned_to_class", parentNotified: false },
    { studentIndex: 5, daysBack: 18, symptoms: "Fell during recess, wrist pain and swelling", treatment: "Ice pack applied, immobilized with a splint", outcome: "referred_to_hospital", parentNotified: true },
    { studentIndex: 0, daysBack: 22, symptoms: "Allergic reaction, mild skin rash", treatment: "Antihistamine given, observed for an hour", medicine: "Cetirizine", outcome: "admitted_to_infirmary", parentNotified: true },
    { studentIndex: 6, daysBack: 27, symptoms: "Dizziness after sports practice", treatment: "Rest, fluids, and monitoring", outcome: "returned_to_class", parentNotified: false },
    { studentIndex: 7, daysBack: 33, symptoms: "Nosebleed", treatment: "Bleeding controlled, rested in infirmary", outcome: "returned_to_class", parentNotified: false },
    { studentIndex: 8, daysBack: 40, symptoms: "Vomiting and nausea", temperatureC: 37.1, treatment: "Observed, advised light diet", outcome: "sent_home", parentNotified: true },
    { studentIndex: 2, daysBack: 45, symptoms: "Follow-up fever check", temperatureC: 36.9, treatment: "Temperature normal, cleared to attend class", outcome: "returned_to_class", parentNotified: false },
    { studentIndex: 9, daysBack: 50, symptoms: "Minor cut on finger during art class", treatment: "Wound cleaned and bandaged", medicine: "Antiseptic ointment", outcome: "returned_to_class", parentNotified: false },
  ];

  for (const plan of visitPlan) {
    const student = activeStudents[plan.studentIndex % activeStudents.length];
    if (!student) continue;
    visits.push({
      id: genId("visit"),
      studentId: student.id,
      visitedAt: daysAgo(plan.daysBack),
      symptoms: plan.symptoms,
      temperatureC: plan.temperatureC,
      treatmentGiven: plan.treatment,
      medicineGiven: plan.medicine,
      outcome: plan.outcome,
      parentNotified: plan.parentNotified,
      attendedByStaffId: nurseStaffId,
    });
  }

  return { checkups, vaccinations, visits };
}
