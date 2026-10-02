import * as students from "./api";
import { academicHttpClient } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { stubClient } from "@/test/utils";

vi.mock("@/features/academics/api", () => ({
  listClasses: vi.fn(async () => [
    { id: "c5", name: "Class 5", branchId: "tenant-educore-main" },
    { id: "c5n", name: "Class 5", branchId: "tenant-educore-north" },
    { id: "c6", name: "Class 6", branchId: "tenant-educore-main" },
    { id: "c10", name: "Class 10", branchId: "tenant-educore-main" },
  ]),
  listSections: vi.fn(async () => [
    { id: "s5a", classId: "c5", name: "A", capacity: 40, currentStrength: 38 },
    { id: "s5b", classId: "c5", name: "B", capacity: 40, currentStrength: 45 },
    { id: "s5na", classId: "c5n", name: "A", capacity: 30, currentStrength: 10 },
    { id: "s6a", classId: "c6", name: "A", capacity: 40, currentStrength: 20 },
    { id: "s10a", classId: "c10", name: "A", capacity: 35, currentStrength: 35 },
  ]),
}));

const apiStudent = (overrides: Record<string, unknown> = {}) => ({
  id: "st1", tenantId: "t", branchId: "tenant-educore-main", admissionNumber: "ADM-1", firstName: "Asha", lastName: "Nair",
  photoUrl: "api/people-files/st1?sig=1", dateOfBirth: "2015-01-01", gender: "Female", sectionId: "s5a", rollNumber: null,
  status: "Transferred", admissionDate: "2020-06-01", address: "Kochi",
  emergencyContact: { name: "Ravi", relation: "Uncle", phone: "999" },
  medical: { bloodGroup: "O+", allergies: null, conditions: "Asthma", medications: null, doctorName: null, doctorPhone: null },
  transport: { required: true, routeName: "R1", pickupPoint: null },
  hostel: { required: false, hostelName: null, roomNumber: null },
  guardians: [{ id: "g1", name: "Ravi", relation: "Father", phone: "999", email: null, occupation: "Engineer" }, { id: "g2", name: "X", relation: "Aunt", phone: "1", email: "x@y", occupation: null }],
  documents: [{ id: "d1", name: "Birth cert", category: "BirthCertificate", uploadedAt: "2026-01-01", fileDataUrl: "data:application/pdf;base64,AA" }, { id: "d2", name: "?", category: "Weird", uploadedAt: "", fileDataUrl: null }],
  transferRecord: { transferredAt: "2026-05-01", toSchool: "Other", reason: "Moved", transferCertificateNumber: "TC-1" },
  ...overrides,
});

const form = {
  branchId: "tenant-educore-north", firstName: " Asha ", lastName: " Nair ", dateOfBirth: "2015-01-01", gender: "female", className: "Class 5", section: "A",
  rollNumber: " 12 ", address: " Kochi ", guardianName: " Ravi ", guardianRelation: "mother", guardianPhone: " 999 ",
} as never;

const apiAdmission = (overrides: Record<string, unknown> = {}) => ({
  id: "ad1", tenantId: "t", branchId: "b", applicationNumber: "APP-1", applicantFirstName: "Kiran", applicantLastName: "M", dateOfBirth: "2016-01-01",
  gender: "Male", guardianName: "M", guardianPhone: "1", guardianEmail: null, appliedClass: "Class 5", stage: "EntranceExam", submittedAt: "2026-01-01",
  notes: null, address: null, previousSchool: null, registeredAt: null, examDate: "2026-02-01", examScore: 80, examStatus: "Completed",
  interviewDate: null, interviewerName: null, interviewRating: null, interviewRemarks: null, decision: "Waitlisted", decisionRemarks: null,
  decidedAt: null, admissionFeeAmount: null, admissionFeePaid: false, admissionFeePaidOn: null, admissionFeeReceiptNumber: null,
  studentId: null, enrolledAt: null, ...overrides,
});

describe("students api", () => {
  it("maps a student, resolving class/section names and file links", async () => {
    stubClient(academicHttpClient, { "GET /api/students": [apiStudent(), apiStudent({ id: "st2", sectionId: "unknown", gender: "?", status: "?", transferRecord: null })] });

    const [student, orphan] = await students.listStudents();

    expect(student).toMatchObject({
      className: "Class 5", section: "A", gender: "female", status: "transferred", rollNumber: undefined,
      guardians: [{ relation: "father", email: undefined, occupation: "Engineer" }, { relation: "guardian", email: "x@y" }],
      medical: { bloodGroup: "O+", conditions: "Asthma", allergies: undefined },
      transport: { required: true, routeName: "R1", pickupPoint: undefined },
      documents: [{ category: "birth_certificate", fileDataUrl: "data:application/pdf;base64,AA" }, { category: "other", fileDataUrl: undefined }],
      transferRecord: { transferCertificateNumber: "TC-1" },
    });
    expect(student.photoUrl).toMatch(/api\/people-files\/st1\?sig=1$/);
    expect(orphan).toMatchObject({ className: "", section: "", gender: "other", status: "active", transferRecord: undefined });
  });

  it("pages and looks up by id with server-side filters", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/students": { items: [apiStudent()], totalCount: 120 },
      "GET /api/students/st1": apiStudent(),
    });

    const page = await students.listStudentsPage({ pageIndex: 1, pageSize: 25, search: "  asha ", classId: "c5", status: "graduated" });
    expect(await students.listStudentsByIds([])).toEqual([]);
    await students.listStudentsByIds(["a", "b", "a"]);
    expect((await students.getStudent("st1")).id).toBe("st1");

    expect(page.totalCount).toBe(120);
    expect((calls[0].config as { params: unknown }).params).toEqual({ pageNumber: 2, pageSize: 25, search: "asha", classId: "c5", status: "Graduated" });
    expect((calls[1].config as { params: unknown }).params).toEqual({ pageNumber: 1, pageSize: 100, ids: "a,b" });
  });

  it("creates and updates against the section in the student's own branch, trimming input", async () => {
    const calls = stubClient(academicHttpClient, { "POST /api/students": apiStudent(), "PUT /api/students/st1": apiStudent() });

    await students.createStudent(form);
    await students.updateStudent("st1", form);

    expect(calls[0].body).toEqual({
      branchId: "tenant-educore-north", firstName: "Asha", lastName: "Nair", dateOfBirth: "2015-01-01", gender: "Female", sectionId: "s5na",
      rollNumber: "12", address: "Kochi", guardianName: "Ravi", guardianRelation: "Mother", guardianPhone: "999",
    });
    expect(calls[1].body).toMatchObject({ sectionId: "s5na", firstName: "Asha" });
  });

  it("explains a class or section that doesn't exist", async () => {
    await expect(students.createStudent({ ...(form as object), className: "Class 99" } as never)).rejects.toThrow('No class named "Class 99" was found in the selected branch');
    await expect(students.createStudent({ ...(form as object), section: "Z" } as never)).rejects.toThrow('No section "Z" was found in class "Class 5"');
  });

  it("saves each profile tab to its own endpoint", async () => {
    const calls = stubClient(academicHttpClient, {
      "PUT /api/students/st1/guardians": apiStudent(),
      "PUT /api/students/st1/emergency-contact": apiStudent(),
      "PUT /api/students/st1/medical": apiStudent(),
      "PUT /api/students/st1/transport": apiStudent(),
      "PUT /api/students/st1/hostel": apiStudent(),
      "PUT /api/students/st1/photo": apiStudent(),
      "POST /api/students/st1/documents": apiStudent(),
      "DELETE /api/students/st1/documents/d1": apiStudent(),
      "POST /api/students/st1/transfer": apiStudent(),
    });

    await students.updateGuardians("st1", [
      { id: "0f8fad5b-d9cb-469f-a165-70867728950e", name: "Ravi", relation: "father", phone: "1" },
      { id: "g-abc1234", name: "New", relation: "guardian", phone: "2", email: "n@x" },
    ] as never);
    await students.updateEmergencyContact("st1", { name: "R", relation: "Uncle", phone: "1" });
    await students.updateMedical("st1", { bloodGroup: "A+" } as never);
    await students.updateTransport("st1", { required: false });
    await students.updateHostel("st1", { required: true, hostelName: "Boys", roomNumber: "101" });
    await students.uploadStudentPhoto("st1", null);
    await students.uploadStudentDocument("st1", { name: "ID", category: "id_proof" });
    await students.deleteStudentDocument("st1", "d1");
    await students.transferStudent("st1", { toSchool: "Other", reason: "Moved" } as never);

    expect(calls[0].body).toEqual([
      { id: "0f8fad5b-d9cb-469f-a165-70867728950e", name: "Ravi", relation: "Father", phone: "1", email: null, occupation: null },
      { id: null, name: "New", relation: "Guardian", phone: "2", email: "n@x", occupation: null },
    ]);
    expect(calls[2].body).toEqual({ bloodGroup: "A+", allergies: null, conditions: null, medications: null, doctorName: null, doctorPhone: null });
    expect(calls[3].body).toEqual({ required: false, routeName: null, pickupPoint: null });
    expect(calls[6].body).toEqual({ name: "ID", category: "IdProof", fileDataUrl: null });
  });

  it("promotes and graduates within the active branch", async () => {
    useAuthStore.setState({ activeTenantId: "tenant-educore", activeBranchId: "tenant-educore-main" });
    const calls = stubClient(academicHttpClient, {
      "POST /api/students/promote": { promotedCount: 38 },
      "POST /api/students/graduate": { graduatedCount: 35 },
    });

    expect(await students.promoteStudents({ fromClass: "Class 5", fromSection: "A", toClass: "Class 6", toSection: "A" })).toEqual({ promotedCount: 38 });
    expect(await students.graduateStudents("Class 10")).toEqual({ graduatedCount: 35 });
    await expect(students.graduateStudents("Class 12")).rejects.toThrow('No class named "Class 12" was found');

    expect(calls[0].body).toEqual({ fromSectionId: "s5a", toSectionId: "s6a" });
    expect(calls[1].body).toEqual({ classId: "c10" });
  });

  it("walks an admission through every stage", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/admissions": [apiAdmission(), apiAdmission({ id: "ad2", stage: "Odd", examStatus: "Odd", decision: null, gender: "Odd" })],
      "POST /api/admissions": apiAdmission({ stage: "Inquiry" }),
      "POST /api/admissions/ad1/register": apiAdmission({ stage: "Registration" }),
      "POST /api/admissions/ad1/exam": apiAdmission(),
      "POST /api/admissions/ad1/interview": apiAdmission({ stage: "Interview" }),
      "POST /api/admissions/ad1/decision": apiAdmission({ stage: "FeeCollection", decision: "Selected" }),
      "POST /api/admissions/ad1/promote-from-waitlist": apiAdmission({ stage: "FeeCollection" }),
      "POST /api/admissions/ad1/fee-payment": apiAdmission({ admissionFeePaid: true }),
      "POST /api/admissions/ad1/reject": apiAdmission({ stage: "Rejected" }),
      "POST /api/admissions/ad1/withdraw": apiAdmission({ stage: "Withdrawn" }),
      "POST /api/admissions/ad1/enroll": { application: apiAdmission({ stage: "Enrolled", studentId: "st1" }), student: apiStudent() },
    });

    const [first, odd] = await students.listAdmissions();
    expect(first).toMatchObject({ stage: "entrance_exam", examStatus: "completed", decision: "waitlisted", guardianEmail: undefined });
    expect(odd).toMatchObject({ stage: "inquiry", examStatus: undefined, decision: undefined, gender: "other" });

    await students.createAdmission({ branchId: "b", applicantFirstName: "K", applicantLastName: "M", dateOfBirth: "2016-01-01", gender: "male", guardianName: "M", guardianPhone: "1", appliedClass: "Class 5" } as never);
    await students.registerAdmission("ad1", { address: "Kochi" } as never);
    await students.updateAdmissionExam("ad1", { examDate: "2026-02-01", examStatus: "absent" } as never);
    await students.updateAdmissionInterview("ad1", { interviewDate: "2026-02-05", interviewerName: "P" } as never);
    expect((await students.decideAdmission("ad1", { decision: "selected" } as never)).decision).toBe("selected");
    await students.promoteFromWaitlist("ad1");
    expect((await students.recordAdmissionFeePayment("ad1", { amount: 5000, paymentMode: "cash" } as never)).admissionFeePaid).toBe(true);
    expect((await students.rejectAdmission("ad1")).stage).toBe("rejected");
    expect((await students.withdrawAdmission("ad1")).stage).toBe("withdrawn");
    const enrolled = await students.enrollAdmission("ad1");

    expect([enrolled.application.stage, enrolled.student.className]).toEqual(["enrolled", "Class 5"]);
    expect(calls[1].body).toMatchObject({ gender: "Male", guardianEmail: null, notes: null });
    expect(calls[2].body).toEqual({ address: "Kochi", previousSchool: null });
    expect(calls[3].body).toEqual({ examDate: "2026-02-01", examStatus: "Absent", examScore: null });
    expect(calls[5].body).toEqual({ decision: "Selected", decisionRemarks: null });
    expect(calls[8].body).toEqual({ remarks: null });
  });

  it("aggregates seat availability per class name, optionally per branch", async () => {
    const all = await students.listSeatAvailability();
    const main = await students.listSeatAvailability("tenant-educore-main");

    expect(all.map((s) => s.className)).toEqual(["Class 5", "Class 6", "Class 10"]);
    expect(all[0]).toEqual({ className: "Class 5", capacity: 110, currentStrength: 93, availableSeats: 17 });
    expect(main[0]).toEqual({ className: "Class 5", capacity: 80, currentStrength: 83, availableSeats: 0 });
    expect(await students.getSeatAvailability("Class 6")).toMatchObject({ availableSeats: 20 });
    expect(await students.getSeatAvailability("Class 99")).toBeNull();
  });
});
