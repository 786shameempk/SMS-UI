/**
 * Attendance/Homework/Fees/etc. don't have their own modules yet, so the parent portal
 * owns lightweight mock data for them, keyed by student id. The children themselves are
 * real records from the Student Management module — this map is just the guardian link.
 */
export const PARENT_CHILDREN_MAP: Record<string, string[]> = {
  "parent@educore.dev": ["stu-1", "stu-2"],
};
