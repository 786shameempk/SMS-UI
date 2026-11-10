import type { CardData } from "./types";

/** Made-up data for the designer preview and the sample print. Never shown as a real result. */
export const SAMPLE_CARD: CardData = {
  studentId: "sample", studentName: "Sample Student", admissionNumber: "ADM-0001", className: "Class 8", section: "A", rollNumber: "12", dateOfBirth: "2013-05-14",
  guardian: "Sample Guardian", photoUrl: null, examName: "Term 1 Examination", academicYear: "2026-27", termName: "Term 1",
  subjects: [
    { name: "English", code: "ENG", max: 100, obtained: 86, internal: 18, internalMax: 20, external: 68, externalMax: 80, percentage: 86, grade: "A", gradePoint: 9, passed: true, absent: false, passMarks: 33 },
    { name: "Mathematics", code: "MAT", max: 100, obtained: 74, internal: 16, internalMax: 20, external: 58, externalMax: 80, percentage: 74, grade: "B+", gradePoint: 8, passed: true, absent: false, passMarks: 33 },
    { name: "Science", code: "SCI", max: 100, obtained: 91, internal: 19, internalMax: 20, external: 72, externalMax: 80, percentage: 91, grade: "A+", gradePoint: 10, passed: true, absent: false, passMarks: 33 },
    { name: "Social Science", code: "SOC", max: 100, obtained: 68, internal: 15, internalMax: 20, external: 53, externalMax: 80, percentage: 68, grade: "B", gradePoint: 7, passed: true, absent: false, passMarks: 33 },
  ],
  total: 319, totalMax: 400, percentage: 79.8, grade: "B+", gpa: 8.5, rank: 4, classAverage: 72.4, result: "Pass", daysPresent: 88, daysTotal: 92,
  remarks: "A hardworking student. Keep up the good work.", schemeName: "Sample scheme", schemeMode: "Grade",
};
