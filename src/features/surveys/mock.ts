import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import type { Survey, SurveyAnswer, SurveyQuestion, SurveyResponse } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function findStaffByDesignation(staff: StaffMember[], designation: string): StaffMember | undefined {
  return staff.find((s) => s.designation === designation);
}

function q(text: string, type: SurveyQuestion["type"], required: boolean, options?: string[]): SurveyQuestion {
  return { id: genId("q"), text, type, options, required };
}

export function buildSeedSurveyData(students: Student[], staff: StaffMember[]): { surveys: Omit<Survey, "tenantId">[]; responses: Omit<SurveyResponse, "tenantId">[] } {
  const activeStudents = students.filter((s) => s.status === "active");
  const principal = findStaffByDesignation(staff, "Principal") ?? staff[0];

  const parentSurveyQuestions = [
    q("Overall, how satisfied are you with the school this year?", "rating", true),
    q("Which area most needs improvement?", "multiple_choice", true, ["Academics", "Facilities", "Communication", "Extracurriculars"]),
    q("Would you recommend this school to other parents?", "yes_no", true),
    q("Any additional comments?", "text", false),
  ];

  const staffSurveyQuestions = [
    q("How manageable is your current workload?", "rating", true),
    q("How supported do you feel by school leadership?", "rating", true),
    q("Are you interested in additional professional development training?", "yes_no", false),
    q("Any suggestions for improving staff wellbeing?", "text", false),
  ];

  const studentSurveyQuestions = [
    q("How much do you enjoy your classes this term?", "rating", true),
    q("Which subject do you enjoy most?", "multiple_choice", true, ["Mathematics", "Science", "English", "Social Studies", "Arts", "Sports"]),
    q("What would you like to see more of at school?", "text", false),
  ];

  const cafeteriaSurveyQuestions = [
    q("How would you rate the new menu options?", "rating", true),
    q("Which meal do you look forward to least?", "multiple_choice", true, ["Breakfast", "Lunch", "Snacks"]),
    q("Suggestions for the cafeteria", "text", false),
  ];

  const parentSurvey: Omit<Survey, "tenantId"> = {
    id: genId("survey"),
    title: "Annual Parent Satisfaction Survey",
    description: "Help us understand what's working well and what we can do better for your family.",
    audience: "parents",
    status: "published",
    anonymousAllowed: true,
    opensAt: daysAgo(30),
    closesAt: daysFromNow(10),
    createdByStaffId: principal?.id,
    createdAt: daysAgo(31),
    questions: parentSurveyQuestions,
  };

  const staffSurvey: Omit<Survey, "tenantId"> = {
    id: genId("survey"),
    title: "Teacher Wellness Check-in",
    description: "A confidential check-in on workload and support — your honest feedback helps leadership prioritize.",
    audience: "staff",
    status: "published",
    anonymousAllowed: true,
    opensAt: daysAgo(15),
    createdByStaffId: principal?.id,
    createdAt: daysAgo(16),
    questions: staffSurveyQuestions,
  };

  const studentSurvey: Omit<Survey, "tenantId"> = {
    id: genId("survey"),
    title: "Student Experience Survey — Grades 9 & 10",
    description: "Tell us about your experience this term so we can make school better for you.",
    audience: "students",
    status: "published",
    anonymousAllowed: false,
    opensAt: daysAgo(7),
    closesAt: daysFromNow(7),
    createdByStaffId: principal?.id,
    createdAt: daysAgo(8),
    questions: studentSurveyQuestions,
  };

  const cafeteriaSurvey: Omit<Survey, "tenantId"> = {
    id: genId("survey"),
    title: "New Cafeteria Menu Feedback",
    description: "We just refreshed the menu — let us know what you think before we publish this survey school-wide.",
    audience: "all",
    status: "draft",
    anonymousAllowed: true,
    opensAt: daysFromNow(2),
    createdByStaffId: principal?.id,
    createdAt: daysAgo(1),
    questions: cafeteriaSurveyQuestions,
  };

  const surveys = [parentSurvey, staffSurvey, studentSurvey, cafeteriaSurvey];

  function answer(questionId: string, value: string): SurveyAnswer {
    return { questionId, value };
  }

  const responses: Omit<SurveyResponse, "tenantId">[] = [];

  const [pq1, pq2, pq3, pq4] = parentSurveyQuestions;
  const parentSeeds: Array<{ name?: string; studentIndex?: number; anonymous?: boolean; rating: string; area: string; recommend: string; comment?: string; daysBack: number }> = [
    { name: "Neeraj Verma", studentIndex: 0, rating: "5", area: "Extracurriculars", recommend: "yes", comment: "The teachers genuinely care about the kids. More sports facilities would be great.", daysBack: 25 },
    { name: "Kavitha Iyer", studentIndex: 1, rating: "4", area: "Communication", recommend: "yes", comment: "Would love faster responses to emails from the front office.", daysBack: 22 },
    { name: "Salim Ahmed", rating: "3", area: "Facilities", recommend: "yes", comment: "The washrooms could use more regular maintenance.", daysBack: 20 },
    { name: "Suresh Reddy", studentIndex: 3, rating: "5", area: "Academics", recommend: "yes", daysBack: 18 },
    { anonymous: true, rating: "2", area: "Communication", recommend: "no", comment: "Felt like concerns raised at PTA meetings weren't followed up on.", daysBack: 15 },
    { name: "Rohit Gupta", rating: "4", area: "Facilities", recommend: "yes", daysBack: 12 },
    { anonymous: true, rating: "5", area: "Extracurriculars", recommend: "yes", comment: "The annual day event was wonderful this year!", daysBack: 9 },
    { name: "Imran Khan", rating: "4", area: "Academics", recommend: "yes", comment: "Appreciate the extra doubt-clearing sessions.", daysBack: 5 },
  ];
  for (const seed of parentSeeds) {
    const answers = [answer(pq1.id, seed.rating), answer(pq2.id, seed.area), answer(pq3.id, seed.recommend)];
    if (seed.comment) answers.push(answer(pq4.id, seed.comment));
    responses.push({
      id: genId("resp"),
      surveyId: parentSurvey.id,
      respondentType: seed.anonymous ? "anonymous" : "parent",
      respondentName: seed.anonymous ? undefined : seed.name,
      respondentStudentId: seed.studentIndex !== undefined ? activeStudents[seed.studentIndex % activeStudents.length]?.id : undefined,
      submittedAt: daysAgo(seed.daysBack),
      answers,
    });
  }

  const [sq1, sq2, sq3, sq4] = staffSurveyQuestions;
  const nonAdminStaff = staff.filter((s) => s.designation !== "Principal");
  const staffSeeds: Array<{ staffIndex: number; workload: string; support: string; training?: string; comment?: string; anonymous?: boolean; daysBack: number }> = [
    { staffIndex: 0, workload: "3", support: "4", training: "yes", comment: "Would appreciate more prep periods.", daysBack: 12 },
    { staffIndex: 1, workload: "4", support: "5", training: "no", daysBack: 10 },
    { staffIndex: 2, workload: "2", support: "3", training: "yes", comment: "Class sizes have grown a lot this year.", anonymous: true, daysBack: 9 },
    { staffIndex: 3, workload: "4", support: "4", training: "yes", daysBack: 7 },
    { staffIndex: 4, workload: "3", support: "3", comment: "More notice before schedule changes would help.", anonymous: true, daysBack: 5 },
    { staffIndex: 5, workload: "5", support: "5", training: "no", comment: "Really happy with the support this term.", daysBack: 2 },
  ];
  for (const seed of staffSeeds) {
    const member = nonAdminStaff[seed.staffIndex % nonAdminStaff.length];
    const answers = [answer(sq1.id, seed.workload), answer(sq2.id, seed.support)];
    if (seed.training) answers.push(answer(sq3.id, seed.training));
    if (seed.comment) answers.push(answer(sq4.id, seed.comment));
    responses.push({
      id: genId("resp"),
      surveyId: staffSurvey.id,
      respondentType: seed.anonymous ? "anonymous" : "staff",
      respondentStaffId: seed.anonymous ? undefined : member?.id,
      submittedAt: daysAgo(seed.daysBack),
      answers,
    });
  }

  const [stq1, stq2, stq3] = studentSurveyQuestions;
  const studentSeeds: Array<{ studentIndex: number; rating: string; subject: string; comment?: string; daysBack: number }> = [
    { studentIndex: 0, rating: "5", subject: "Science", comment: "More science lab sessions please!", daysBack: 6 },
    { studentIndex: 1, rating: "4", subject: "Sports", daysBack: 6 },
    { studentIndex: 2, rating: "3", subject: "Mathematics", comment: "Math homework feels like a lot some weeks.", daysBack: 5 },
    { studentIndex: 3, rating: "5", subject: "Arts", comment: "Would love an art club after school.", daysBack: 5 },
    { studentIndex: 4, rating: "4", subject: "English", daysBack: 4 },
    { studentIndex: 5, rating: "2", subject: "Social Studies", comment: "Classes feel a bit repetitive.", daysBack: 3 },
    { studentIndex: 6, rating: "5", subject: "Science", daysBack: 2 },
    { studentIndex: 7, rating: "4", subject: "Mathematics", comment: "More group projects would be fun.", daysBack: 1 },
  ];
  for (const seed of studentSeeds) {
    const student = activeStudents[seed.studentIndex % activeStudents.length];
    const answers = [answer(stq1.id, seed.rating), answer(stq2.id, seed.subject)];
    if (seed.comment) answers.push(answer(stq3.id, seed.comment));
    responses.push({
      id: genId("resp"),
      surveyId: studentSurvey.id,
      respondentType: "student",
      respondentStudentId: student?.id,
      submittedAt: daysAgo(seed.daysBack),
      answers,
    });
  }

  return { surveys, responses };
}
