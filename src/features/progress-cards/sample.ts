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

const part = (examName: string, obtained: number, max: number, avg: number, top: number) => ({ examName, obtained, max, weight: max, absent: false, classAvg: avg, classTop: top });

function twoTermSubject(name: string, code: string, t1: number[], t2: number[]): CardData["subjects"][number] {
  const parts = [
    part("PT-1", t1[0], 10, 55, 90), part("NBS-1", t1[1], 5, 90, 100), part("SEA-1", t1[2], 5, 90, 100), part("Half Yearly", t1[3], 80, 52, 88),
    part("PT-2", t2[0], 10, 55, 90), part("NBS-2", t2[1], 5, 90, 100), part("SEA-2", t2[2], 5, 90, 100), part("Annual", t2[3], 80, 50, 90),
    // Names the three-term layout looks for, so its preview is filled too.
    part("PT-3", t1[0], 10, 55, 90), part("NBS-3", t1[1], 5, 90, 100), part("SEA-3", t1[2], 5, 90, 100),
    part("Term 1 Exam", t1[3], 80, 52, 88), part("Term 2 Exam", t2[3], 80, 50, 90), part("Term 3 Exam", Math.round((t1[3] + t2[3]) / 2), 80, 51, 89),
  ];
  const obtained = parts.slice(0, 8).reduce((a, p) => a + p.obtained, 0);
  return { name, code, max: 200, obtained, internal: null, internalMax: null, external: null, externalMax: null, percentage: obtained / 2, grade: "C1", gradePoint: 6, passed: true, absent: false, passMarks: 66, parts };
}

/** Preview data for the two-term layout (made up). */
export const SAMPLE_TWO_TERM_CARD: CardData = {
  ...SAMPLE_CARD, className: "IV", examName: "Half Yearly (50%) + Annual (50%)", academicYear: "2025-2026", fatherName: "Sample Father", motherName: "Sample Mother",
  subjects: [
    twoTermSubject("English", "ENG", [3, 5, 5, 37], [4, 5, 5, 29]), twoTermSubject("Malayalam", "MAL", [6, 5, 5, 22], [6, 5, 5, 29]),
    twoTermSubject("Mathematics", "MAT", [6, 5, 5, 43], [6, 5, 5, 54]), twoTermSubject("Arabic", "ARAB", [8, 5, 5, 46], [2, 5, 5, 54]),
    twoTermSubject("Hindi", "HIN", [3, 5, 5, 32], [4, 5, 5, 50]), twoTermSubject("Environmental Studies", "EVS", [4, 5, 5, 38], [5, 5, 5, 32]),
  ],
  coScholastic: ["Work Education", "Art Education", "Health & Physical Education", "Discipline"].flatMap((area) =>
    ["Half Yearly", "Annual", "Term 1 Exam", "Term 2 Exam", "Term 3 Exam"].map((examName) => ({ area, grade: "A", remark: null, examName }))),
  bands: [{ grade: "A1", min: 91 }, { grade: "A2", min: 81 }, { grade: "B1", min: 71 }, { grade: "B2", min: 61 }, { grade: "C1", min: 51 }, { grade: "C2", min: 41 }, { grade: "D", min: 33 }, { grade: "E", min: 0 }],
  remarks: "Good, need more improvement in all subjects.",
};
