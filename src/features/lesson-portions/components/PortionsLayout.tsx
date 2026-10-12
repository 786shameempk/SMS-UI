import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { cn } from "@/utils/cn";
import { usePortionAccess, type PortionAccess } from "../shared";

interface Section {
  to: string;
  label: string;
  end?: boolean;
  show: (a: PortionAccess) => boolean;
}

const SECTIONS: Section[] = [
  { to: "/lesson-portions", label: "Overview", end: true, show: () => true },
  { to: "/lesson-portions/my-plan", label: "My plan", show: (a) => a.canPlan || a.canApprove },
  { to: "/lesson-portions/progress", label: "Daily progress", show: (a) => a.canProgress || a.canApprove },
  { to: "/lesson-portions/calendar", label: "Calendar", show: () => true },
  { to: "/lesson-portions/tracking", label: "Class tracking", show: () => true },
  { to: "/lesson-portions/approvals", label: "Approvals", show: (a) => a.canApprove },
  { to: "/lesson-portions/syllabus", label: "Syllabus", show: () => true },
  { to: "/lesson-portions/exams", label: "Exam portions", show: (a) => a.canManage || a.canApprove || a.canPlan },
  { to: "/lesson-portions/reports/subjects", label: "Subject report", show: () => true },
  { to: "/lesson-portions/reports/teachers", label: "Teacher report", show: (a) => a.seesAll },
  { to: "/lesson-portions/resources", label: "Resources", show: () => true },
  { to: "/lesson-portions/settings", label: "Settings", show: () => true },
];

/** The module's frame: a title and a tab bar whose entries depend on what the signed-in user may do. Families get only their own view. */
export default function PortionsLayout() {
  const access = usePortionAccess();
  const { pathname } = useLocation();
  const familyPath = "/lesson-portions/family";

  if (access.isFamily) return pathname === familyPath ? <FamilyFrame /> : <Navigate to={familyPath} replace />;
  if (pathname === familyPath) return <Navigate to="/lesson-portions" replace />;

  const sections = SECTIONS.filter((s) => s.show(access));
  // A page the user has no tab for (typed into the address bar, or an old bookmark) goes back to the overview.
  const current = SECTIONS.find((s) => !s.end && (pathname === s.to || pathname.startsWith(`${s.to}/`)));
  if (current && !sections.includes(current) && pathname !== "/lesson-portions") return <Navigate to="/lesson-portions" replace />;

  return (
    <PageContainer>
      <PageHeader title="Lesson & Portions" description="Plan the syllabus, record what is taught, and see which classes and subjects are on track." />
      <nav aria-label="Lesson and portion sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        {sections.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              cn(
                "relative shrink-0 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "text-primary after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </PageContainer>
  );
}

function FamilyFrame() {
  return (
    <PageContainer>
      <PageHeader title="Syllabus progress" description="What has been taught in each subject, what is coming next, and the portions for upcoming exams." />
      <Outlet />
    </PageContainer>
  );
}
