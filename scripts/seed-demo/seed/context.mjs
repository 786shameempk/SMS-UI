// Rebuilds a branch's seeding context (classes, sections, subjects, staff, students...) from the API, so module
// seeders can fill an existing branch - e.g. after a school moves to a bigger plan (--only=fill).

const gradeOf = (name) => Number(/(\d+)/.exec(name ?? "")?.[1] ?? 0);

export async function loadBranchContext(s) {
  const [years, classesRaw, sectionsRaw, subjectsRaw, staffRaw, studentsRaw] = await Promise.all([
    s.get("academic", "/api/academicyears"),
    s.get("academic", "/api/classes"),
    s.get("academic", "/api/sections"),
    s.get("academic", "/api/subjects"),
    s.get("academic", "/api/staff"),
    s.get("academic", "/api/students"),
  ]);
  const classes = (classesRaw ?? []).map((c) => ({ ...c, grade: gradeOf(c.name) })).sort((a, b) => a.grade - b.grade);
  const gradeOfClass = new Map(classes.map((c) => [c.id, c.grade]));
  const sections = (sectionsRaw ?? []).map((sec) => ({ ...sec, grade: gradeOfClass.get(sec.classId), label: `Grade ${gradeOfClass.get(sec.classId)}-${sec.name}` }));
  const classOfSection = new Map(sections.map((sec) => [sec.id, sec.classId]));
  const subjects = subjectsRaw ?? [];
  const staff = (staffRaw ?? []).map((m) => ({ ...m, first: m.firstName, last: m.lastName }));
  const teachers = staff.filter((m) => m.designation === "Teacher").map((m) => ({ ...m, subject: subjects[0] }));
  const students = (studentsRaw ?? []).filter((st) => st.status === "Active").map((st) => {
    const classId = classOfSection.get(st.sectionId);
    return { ...st, first: st.firstName, last: st.lastName, classId, grade: gradeOfClass.get(classId) };
  });
  return {
    year: (years ?? []).find((y) => y.isCurrent) ?? (years ?? [])[0],
    classes,
    sections,
    subjects,
    staff,
    teachers,
    students,
    byRole: (role) => staff.filter((m) => m.designation === role),
    studentsIn: (classId) => students.filter((st) => st.classId === classId),
  };
}

/** True when a list endpoint already has rows (for this branch, where the rows carry a branchId). */
export async function hasRows(s, service, path) {
  const data = await s.get(service, path).catch(() => null);
  const rows = Array.isArray(data) ? data : data?.items ?? [];
  return rows.some((row) => !row.branchId || row.branchId === s.branch);
}
