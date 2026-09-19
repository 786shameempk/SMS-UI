import type { StudentFormValues } from "@/features/students/types";
import type { Exam, ExamSchedule } from "./types";

/** class-9 and class-10 (Grade 9 / Grade 10) with terms/subjects from the academics seed. */
export const SEED_EXAMS: Exam[] = [
  {
    id: "exam-1",
    name: "Mid-term Examination",
    examType: "midterm",
    termId: "term-2",
    classId: "class-9",
    startDate: "2025-11-10",
    endDate: "2025-11-14",
    status: "completed",
  },
  {
    id: "exam-2",
    name: "Final Examination",
    examType: "final",
    termId: "term-2",
    classId: "class-10",
    startDate: "2025-12-01",
    endDate: "2025-12-05",
    status: "completed",
  },
  {
    id: "exam-3",
    name: "Unit Test 1",
    examType: "internal",
    termId: "term-3",
    classId: "class-9",
    startDate: "2026-02-02",
    endDate: "2026-02-06",
    status: "scheduled",
  },
];

export const SEED_EXAM_SCHEDULES: ExamSchedule[] = [
  // exam-1: Grade 9 mid-term
  { id: "exsch-1", examId: "exam-1", subjectId: "subj-1", date: "2025-11-10", startTime: "09:00", endTime: "11:00", maxMarks: 100, passMarks: 35, room: "Room 101" },
  { id: "exsch-2", examId: "exam-1", subjectId: "subj-2", date: "2025-11-11", startTime: "09:00", endTime: "11:00", maxMarks: 100, passMarks: 35, room: "Room 101" },
  { id: "exsch-3", examId: "exam-1", subjectId: "subj-4", date: "2025-11-12", startTime: "09:00", endTime: "11:00", maxMarks: 100, passMarks: 35, room: "Room 101" },
  { id: "exsch-4", examId: "exam-1", subjectId: "subj-5", date: "2025-11-13", startTime: "09:00", endTime: "11:00", maxMarks: 100, passMarks: 35, room: "Room 101" },
  { id: "exsch-5", examId: "exam-1", subjectId: "subj-6", date: "2025-11-14", startTime: "09:00", endTime: "11:00", maxMarks: 100, passMarks: 35, room: "Room 101" },

  // exam-2: Grade 10 final
  { id: "exsch-6", examId: "exam-2", subjectId: "subj-1", date: "2025-12-01", startTime: "09:00", endTime: "12:00", maxMarks: 100, passMarks: 35, room: "Room 201" },
  { id: "exsch-7", examId: "exam-2", subjectId: "subj-2", date: "2025-12-02", startTime: "09:00", endTime: "12:00", maxMarks: 100, passMarks: 35, room: "Room 201" },
  { id: "exsch-8", examId: "exam-2", subjectId: "subj-4", date: "2025-12-03", startTime: "09:00", endTime: "12:00", maxMarks: 100, passMarks: 35, room: "Room 201" },
  { id: "exsch-9", examId: "exam-2", subjectId: "subj-5", date: "2025-12-04", startTime: "09:00", endTime: "12:00", maxMarks: 100, passMarks: 35, room: "Room 201" },
  { id: "exsch-10", examId: "exam-2", subjectId: "subj-6", date: "2025-12-05", startTime: "09:00", endTime: "12:00", maxMarks: 100, passMarks: 35, room: "Room 201" },

  // exam-3: Grade 9 unit test (upcoming, no marks yet)
  { id: "exsch-11", examId: "exam-3", subjectId: "subj-1", date: "2026-02-02", startTime: "10:00", endTime: "11:00", maxMarks: 50, passMarks: 18, room: "Room 101" },
  { id: "exsch-12", examId: "exam-3", subjectId: "subj-2", date: "2026-02-03", startTime: "10:00", endTime: "11:00", maxMarks: 50, passMarks: 18, room: "Room 101" },
  { id: "exsch-13", examId: "exam-3", subjectId: "subj-4", date: "2026-02-04", startTime: "10:00", endTime: "11:00", maxMarks: 50, passMarks: 18, room: "Room 101" },
  { id: "exsch-14", examId: "exam-3", subjectId: "subj-5", date: "2026-02-05", startTime: "10:00", endTime: "11:00", maxMarks: 50, passMarks: 18, room: "Room 101" },
  { id: "exsch-15", examId: "exam-3", subjectId: "subj-6", date: "2026-02-06", startTime: "10:00", endTime: "11:00", maxMarks: 50, passMarks: 18, room: "Room 101" },
];

const DAY_MS = 1000 * 60 * 60 * 24;
const yearsAgo = (n: number) => new Date(Date.now() - n * DAY_MS * 365).toISOString();

/**
 * The generic students module only ships one active student in Grade 9/10 combined.
 * These extra roster students are created through students' own createStudent() API
 * (see performSeed in api.ts) rather than by editing students/mock.ts, so that
 * feature folder stays untouched — same pattern the teachers module uses for staff.
 */
export const EXAM_ROSTER_SEEDS: StudentFormValues[] = [
  { firstName: "Aditi", lastName: "Rao", dateOfBirth: yearsAgo(14), gender: "female", className: "Grade 9", section: "A", rollNumber: "9A-01", address: "14 Malleswaram, Bengaluru", guardianName: "Shyam Rao", guardianRelation: "father", guardianPhone: "+91 98450 91001" },
  { firstName: "Karan", lastName: "Malhotra", dateOfBirth: yearsAgo(14), gender: "male", className: "Grade 9", section: "A", rollNumber: "9A-02", address: "22 Indiranagar, Bengaluru", guardianName: "Deepa Malhotra", guardianRelation: "mother", guardianPhone: "+91 98450 91002" },
  { firstName: "Zara", lastName: "Ahmed", dateOfBirth: yearsAgo(15), gender: "female", className: "Grade 9", section: "B", rollNumber: "9B-01", address: "5 Frazer Town, Bengaluru", guardianName: "Farhan Ahmed", guardianRelation: "father", guardianPhone: "+91 98450 91003" },
  { firstName: "Yusuf", lastName: "Sheikh", dateOfBirth: yearsAgo(15), gender: "male", className: "Grade 9", section: "B", rollNumber: "9B-02", address: "18 Shivajinagar, Bengaluru", guardianName: "Nasreen Sheikh", guardianRelation: "mother", guardianPhone: "+91 98450 91004" },
  { firstName: "Ananya", lastName: "Pillai", dateOfBirth: yearsAgo(14), gender: "female", className: "Grade 9", section: "B", rollNumber: "9B-03", address: "31 Malleswaram, Bengaluru", guardianName: "Rajesh Pillai", guardianRelation: "father", guardianPhone: "+91 98450 91005" },

  { firstName: "Ritika", lastName: "Verma", dateOfBirth: yearsAgo(16), gender: "female", className: "Grade 10", section: "A", rollNumber: "10A-01", address: "9 Whitefield, Bengaluru", guardianName: "Manoj Verma", guardianRelation: "father", guardianPhone: "+91 98450 92001" },
  { firstName: "Simran", lastName: "Kaur", dateOfBirth: yearsAgo(15), gender: "female", className: "Grade 10", section: "A", rollNumber: "10A-02", address: "27 Domlur, Bengaluru", guardianName: "Harpreet Kaur", guardianRelation: "mother", guardianPhone: "+91 98450 92002" },
  { firstName: "Aditya", lastName: "Nambiar", dateOfBirth: yearsAgo(16), gender: "male", className: "Grade 10", section: "B", rollNumber: "10B-08", address: "11 Ulsoor, Bengaluru", guardianName: "Vinod Nambiar", guardianRelation: "father", guardianPhone: "+91 98450 92003" },
  { firstName: "Farhan", lastName: "Ali", dateOfBirth: yearsAgo(16), gender: "male", className: "Grade 10", section: "B", rollNumber: "10B-09", address: "40 Richmond Town, Bengaluru", guardianName: "Samina Ali", guardianRelation: "mother", guardianPhone: "+91 98450 92004" },
];

/** One deliberate absence, seeded for realism in Results/Report Card views. */
export const SEED_ABSENT_RESULT = { examId: "exam-2", subjectId: "subj-5" };
