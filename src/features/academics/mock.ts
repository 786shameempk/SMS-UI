import type { AcademicYear, CalendarEvent, Department, SchoolClass, Section, Subject, Term } from "./types";

export const SEED_ACADEMIC_YEARS: AcademicYear[] = [
  { id: "ay-1", name: "2023-2024", startDate: "2023-06-01", endDate: "2024-04-30", isCurrent: false, status: "closed" },
  { id: "ay-2", name: "2024-2025", startDate: "2024-06-01", endDate: "2025-04-30", isCurrent: false, status: "closed" },
  { id: "ay-3", name: "2025-2026", startDate: "2025-06-01", endDate: "2026-04-30", isCurrent: true, status: "active" },
  { id: "ay-4", name: "2026-2027", startDate: "2026-06-01", endDate: "2027-04-30", isCurrent: false, status: "upcoming" },
];

export const SEED_TERMS: Term[] = [
  { id: "term-1", name: "Term 1", academicYearId: "ay-3", startDate: "2025-06-01", endDate: "2025-09-15", status: "completed" },
  { id: "term-2", name: "Term 2", academicYearId: "ay-3", startDate: "2025-09-16", endDate: "2026-01-10", status: "ongoing" },
  { id: "term-3", name: "Term 3", academicYearId: "ay-3", startDate: "2026-01-11", endDate: "2026-04-30", status: "upcoming" },
  { id: "term-4", name: "Term 1", academicYearId: "ay-2", startDate: "2024-06-01", endDate: "2024-09-15", status: "completed" },
];

export const SEED_DEPARTMENTS: Department[] = [
  { id: "dept-1", name: "Primary", description: "Grades 1 through 5" },
  { id: "dept-2", name: "Secondary", description: "Grades 6 through 10" },
  { id: "dept-3", name: "Science", description: "Senior secondary science stream" },
  { id: "dept-4", name: "Commerce", description: "Senior secondary commerce stream" },
  { id: "dept-5", name: "Arts", description: "Senior secondary arts/humanities stream" },
];

export const SEED_CLASSES: SchoolClass[] = [
  { id: "class-1", name: "Grade 1", departmentId: "dept-1", academicYearId: "ay-3" },
  { id: "class-2", name: "Grade 2", departmentId: "dept-1", academicYearId: "ay-3" },
  { id: "class-3", name: "Grade 3", departmentId: "dept-1", academicYearId: "ay-3" },
  { id: "class-4", name: "Grade 4", departmentId: "dept-1", academicYearId: "ay-3" },
  { id: "class-5", name: "Grade 5", departmentId: "dept-1", academicYearId: "ay-3" },
  { id: "class-6", name: "Grade 6", departmentId: "dept-2", academicYearId: "ay-3" },
  { id: "class-7", name: "Grade 7", departmentId: "dept-2", academicYearId: "ay-3" },
  { id: "class-8", name: "Grade 8", departmentId: "dept-2", academicYearId: "ay-3" },
  { id: "class-9", name: "Grade 9", departmentId: "dept-2", academicYearId: "ay-3" },
  { id: "class-10", name: "Grade 10", departmentId: "dept-2", academicYearId: "ay-3" },
];

export const SEED_SECTIONS: Section[] = [
  { id: "sec-1-a", name: "Section A", classId: "class-1", classTeacherName: "Meera Pillai", capacity: 40, currentStrength: 36 },
  { id: "sec-1-b", name: "Section B", classId: "class-1", classTeacherName: "Divya Nair", capacity: 40, currentStrength: 32 },
  { id: "sec-2-a", name: "Section A", classId: "class-2", classTeacherName: "Anjali Rao", capacity: 40, currentStrength: 38 },
  { id: "sec-2-b", name: "Section B", classId: "class-2", classTeacherName: "Kiran Bose", capacity: 40, currentStrength: 30 },
  { id: "sec-3-a", name: "Section A", classId: "class-3", classTeacherName: "Farah Sheikh", capacity: 38, currentStrength: 34 },
  { id: "sec-3-b", name: "Section B", classId: "class-3", classTeacherName: "Nikhil Verma", capacity: 38, currentStrength: 29 },
  { id: "sec-4-a", name: "Section A", classId: "class-4", classTeacherName: "Priya Menon", capacity: 38, currentStrength: 35 },
  { id: "sec-4-b", name: "Section B", classId: "class-4", classTeacherName: "Suresh Iyer", capacity: 38, currentStrength: 27 },
  { id: "sec-5-a", name: "Section A", classId: "class-5", classTeacherName: "Ritu Malhotra", capacity: 38, currentStrength: 33 },
  { id: "sec-5-b", name: "Section B", classId: "class-5", classTeacherName: "Deepak Chawla", capacity: 38, currentStrength: 20 },
  { id: "sec-6-a", name: "Section A", classId: "class-6", classTeacherName: "Sonia Kapoor", capacity: 36, currentStrength: 34 },
  { id: "sec-6-b", name: "Section B", classId: "class-6", classTeacherName: "Vivek Shetty", capacity: 36, currentStrength: 22 },
  { id: "sec-7-a", name: "Section A", classId: "class-7", classTeacherName: "Nandita Rao", capacity: 36, currentStrength: 31 },
  { id: "sec-7-b", name: "Section B", classId: "class-7", classTeacherName: "Arjun Desai", capacity: 36, currentStrength: 28 },
  { id: "sec-8-a", name: "Section A", classId: "class-8", classTeacherName: "Lavanya Krishnan", capacity: 36, currentStrength: 35 },
  { id: "sec-8-b", name: "Section B", classId: "class-8", classTeacherName: "Rohit Agarwal", capacity: 36, currentStrength: 12 },
  { id: "sec-8-c", name: "Section C", classId: "class-8", classTeacherName: "Fatima Ansari", capacity: 36, currentStrength: 10 },
  { id: "sec-9-a", name: "Section A", classId: "class-9", classTeacherName: "Manoj Pillai", capacity: 34, currentStrength: 32 },
  { id: "sec-9-b", name: "Section B", classId: "class-9", classTeacherName: "Sneha Kulkarni", capacity: 34, currentStrength: 25 },
  { id: "sec-10-a", name: "Section A", classId: "class-10", classTeacherName: "Ashwin Nair", capacity: 34, currentStrength: 33 },
  { id: "sec-10-b", name: "Section B", classId: "class-10", classTeacherName: "Geeta Reddy", capacity: 34, currentStrength: 31 },
];

export const SEED_SUBJECTS: Subject[] = [
  {
    id: "subj-1",
    name: "English",
    code: "ENG",
    type: "core",
    classIds: ["class-1", "class-2", "class-3", "class-4", "class-5", "class-6", "class-7", "class-8", "class-9", "class-10"],
  },
  {
    id: "subj-2",
    name: "Mathematics",
    code: "MATH",
    type: "core",
    classIds: ["class-1", "class-2", "class-3", "class-4", "class-5", "class-6", "class-7", "class-8", "class-9", "class-10"],
  },
  {
    id: "subj-3",
    name: "Science",
    code: "SCI",
    type: "core",
    classIds: ["class-3", "class-4", "class-5", "class-6", "class-7", "class-8"],
  },
  {
    id: "subj-4",
    name: "Physics",
    code: "PHY",
    type: "core",
    classIds: ["class-9", "class-10"],
  },
  {
    id: "subj-5",
    name: "Chemistry",
    code: "CHEM",
    type: "core",
    classIds: ["class-9", "class-10"],
  },
  {
    id: "subj-6",
    name: "Biology",
    code: "BIO",
    type: "core",
    classIds: ["class-9", "class-10"],
  },
  {
    id: "subj-7",
    name: "Social Studies",
    code: "SST",
    type: "core",
    classIds: ["class-3", "class-4", "class-5", "class-6", "class-7", "class-8"],
  },
  {
    id: "subj-8",
    name: "Hindi",
    code: "HIN",
    type: "core",
    classIds: ["class-1", "class-2", "class-3", "class-4", "class-5", "class-6", "class-7", "class-8"],
  },
  {
    id: "subj-9",
    name: "Computer Science",
    code: "CS",
    type: "elective",
    classIds: ["class-6", "class-7", "class-8", "class-9", "class-10"],
  },
  {
    id: "subj-10",
    name: "Fine Arts",
    code: "ART",
    type: "elective",
    classIds: ["class-1", "class-2", "class-3", "class-4", "class-5"],
  },
];

export const SEED_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "cal-1", title: "Term 1 begins", type: "term_start", startDate: "2025-06-01", academicYearId: "ay-3" },
  { id: "cal-2", title: "Term 1 ends", type: "term_end", startDate: "2025-09-15", academicYearId: "ay-3" },
  { id: "cal-3", title: "Term 2 begins", type: "term_start", startDate: "2025-09-16", academicYearId: "ay-3" },
  {
    id: "cal-4",
    title: "Mid-term examinations",
    type: "exam",
    startDate: "2025-11-10",
    endDate: "2025-11-21",
    academicYearId: "ay-3",
    description: "Mid-term examinations for all classes.",
  },
  { id: "cal-5", title: "Winter break", type: "holiday", startDate: "2025-12-22", endDate: "2026-01-02", academicYearId: "ay-3" },
  { id: "cal-6", title: "Term 2 ends", type: "term_end", startDate: "2026-01-10", academicYearId: "ay-3" },
  { id: "cal-7", title: "Term 3 begins", type: "term_start", startDate: "2026-01-11", academicYearId: "ay-3" },
  {
    id: "cal-8",
    title: "Final examinations",
    type: "exam",
    startDate: "2026-03-02",
    endDate: "2026-03-20",
    academicYearId: "ay-3",
    description: "Annual final examinations for all classes.",
  },
  { id: "cal-9", title: "Republic Day", type: "holiday", startDate: "2026-01-26", academicYearId: "ay-3" },
  { id: "cal-10", title: "Term 3 ends", type: "term_end", startDate: "2026-04-30", academicYearId: "ay-3" },
];
