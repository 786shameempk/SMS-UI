import * as health from "./api";
import { bmiCategory, calculateBmi, vaccinationStatus } from "./constants";
import { campusHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [
    { id: "st1", status: "active", medical: { allergies: "Peanuts", conditions: "" } },
    { id: "st2", status: "active", medical: { allergies: " ", conditions: "Asthma" } },
    { id: "st3", status: "alumni", medical: {} },
  ]),
}));
vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [{ id: "nurse1", firstName: "Annie" }]),
}));

const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const checkup = (overrides: Record<string, unknown> = {}) => ({
  id: "hc1", tenantId: "t", branchId: "b", studentId: "st1", checkupDate: "2026-06-01", heightCm: 140, weightKg: 35, visionLeft: "6/6", visionRight: "6/6",
  dentalRemarks: null, generalRemarks: null, examinedByStaffId: "nurse1", ...overrides,
});
const vaccination = (overrides: Record<string, unknown> = {}) => ({
  id: "vc1", tenantId: "t", branchId: "b", studentId: "st1", vaccineName: "MMR", doseNumber: 1, dueDate: daysFromNow(-10), dateAdministered: null, administeredByStaffId: null, notes: null, ...overrides,
});
const visit = (overrides: Record<string, unknown> = {}) => ({
  id: "iv1", tenantId: "t", branchId: "b", studentId: "st1", visitedAt: new Date().toISOString(), symptoms: "Fever", temperatureC: null, treatmentGiven: "Rest",
  medicineGiven: null, outcome: "SentHome", parentNotified: true, attendedByStaffId: null, ...overrides,
});

describe("health helpers", () => {
  it("BMI and vaccination status", () => {
    expect(calculateBmi(140, 35)).toBe(17.9);
    expect([bmiCategory(17.9), bmiCategory(22), bmiCategory(27), bmiCategory(31)]).toEqual(["underweight", "normal", "overweight", "obese"]);
    expect(vaccinationStatus({ dueDate: daysFromNow(-1) })).toBe("overdue");
    expect(vaccinationStatus({ dueDate: daysFromNow(3) })).toBe("due");
    expect(vaccinationStatus({ dueDate: daysFromNow(-1), dateAdministered: "x" })).toBe("completed");
  });
});

describe("health api", () => {
  it("checkups join the student and examiner and derive BMI", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/healthcheckups": [checkup(), checkup({ id: "hc2", studentId: "gone" })],
      "POST /api/healthcheckups": checkup(),
      "DELETE /api/healthcheckups/hc1": null,
    });

    const rows = await health.listHealthCheckups("st1");
    await health.createHealthCheckup({ studentId: "st1", checkupDate: "2026-06-01", heightCm: 140, weightKg: 35, visionLeft: "6/6", visionRight: "6/6", dentalRemarks: " ", generalRemarks: " Fit ", examinedByStaffId: "" } as never);
    await health.deleteHealthCheckup("hc1");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bmi: 17.9, bmiCategory: "underweight", examinedBy: { firstName: "Annie" }, dentalRemarks: undefined });
    expect((calls[0].config as { params: unknown }).params).toEqual({ studentId: "st1" });
    expect(calls[1].body).toMatchObject({ dentalRemarks: null, generalRemarks: "Fit", examinedByStaffId: null });
  });

  it("vaccinations derive their status and can be administered", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/vaccinationrecords": [vaccination(), vaccination({ id: "vc2", dueDate: daysFromNow(5), administeredByStaffId: "nurse1" })],
      "POST /api/vaccinationrecords": vaccination(),
      "POST /api/vaccinationrecords/vc1/administer": vaccination({ dateAdministered: "2026-10-01" }),
      "DELETE /api/vaccinationrecords/vc1": null,
    });

    const rows = await health.listVaccinations();
    await health.createVaccination({ studentId: "st1", vaccineName: "MMR", doseNumber: 1, dueDate: "2026-10-10", notes: "" } as never);
    expect((await health.markVaccinationAdministered("vc1", { dateAdministered: "2026-10-01", administeredByStaffId: "" } as never)).dateAdministered).toBe("2026-10-01");
    await health.deleteVaccination("vc1");

    expect(rows.map((r) => r.status)).toEqual(["overdue", "due"]);
    expect(rows[1].administeredBy?.firstName).toBe("Annie");
    expect((calls[0].config as { params: unknown }).params).toBeUndefined();
    expect(calls[1].body).toMatchObject({ notes: null });
    expect(calls[2].body).toEqual({ dateAdministered: "2026-10-01", administeredByStaffId: null });
  });

  it("infirmary visits store UTC and translate outcomes", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/infirmaryvisits": [visit(), visit({ id: "iv2", outcome: "?", attendedByStaffId: "nurse1" }), visit({ id: "iv3", studentId: "gone" })],
      "POST /api/infirmaryvisits": visit(),
      "DELETE /api/infirmaryvisits/iv1": null,
    });

    const rows = await health.listInfirmaryVisits();
    await health.createInfirmaryVisit({ studentId: "st1", visitedAt: "2026-10-01T10:30", symptoms: "Fever", treatmentGiven: "Rest", medicineGiven: "", outcome: "referred_to_hospital", parentNotified: false, attendedByStaffId: "nurse1" } as never);
    await health.deleteInfirmaryVisit("iv1");

    expect(rows.map((r) => r.outcome)).toEqual(["sent_home", "returned_to_class"]);
    expect(rows[1].attendedBy?.firstName).toBe("Annie");
    expect(calls[1].body).toMatchObject({ visitedAt: new Date("2026-10-01T10:30").toISOString(), temperatureC: null, medicineGiven: null, outcome: "ReferredToHospital", attendedByStaffId: "nurse1" });
  });

  it("composes the per-student overview and the reports summary", async () => {
    stubClient(campusHttpClient, {
      "GET /api/healthcheckups": [checkup({ checkupDate: "2026-01-01", heightCm: 100, weightKg: 40 }), checkup({ id: "hc2", checkupDate: "2026-06-01" }), checkup({ id: "hc3", studentId: "st2", heightCm: 150, weightKg: 50 })],
      "GET /api/vaccinationrecords": [vaccination(), vaccination({ id: "vc2", dueDate: daysFromNow(4) }), vaccination({ id: "vc3", studentId: "st2", dateAdministered: "x" })],
      "GET /api/infirmaryvisits": [visit(), visit({ id: "iv2", visitedAt: "2020-01-01T00:00:00Z", outcome: "ReturnedToClass" })],
    });

    const records = await health.listHealthRecords();
    const summary = await health.getHealthReportsSummary();

    expect(records.map((r) => r.student.id)).toEqual(["st1", "st2"]);
    expect(records[0]).toMatchObject({ lastCheckupDate: "2026-06-01", overdueVaccinations: 1, visitCountThisYear: 1 });
    expect(summary).toMatchObject({ totalActiveStudents: 2, studentsWithAllergies: 1, studentsWithConditions: 1, visitsLast30Days: 1 });
    expect(summary.overdueVaccinations).toHaveLength(1);
    expect(summary.upcomingVaccinations.map((v) => v.id)).toEqual(["vc2"]);
    expect(summary.visitsByOutcome).toEqual(expect.arrayContaining([{ outcome: "sent_home", count: 1 }, { outcome: "returned_to_class", count: 1 }]));
    expect(summary.bmiDistribution).toEqual(expect.arrayContaining([{ category: "underweight", count: 1 }, { category: "normal", count: 1 }]));
  });
});
