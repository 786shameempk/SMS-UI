import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { cn } from "@/utils/cn";
import { useAppraisalAccess, NS, type AppraisalAccess } from "../shared";

import { useTranslation } from "react-i18next";

interface Section {
  to: string;
  label: string;
  end?: boolean;
  show: (a: AppraisalAccess) => boolean;
}

const BASE = "/appraisal";

const SECTIONS: Section[] = [
  { to: `${BASE}/dashboard`, label: "Dashboard", show: (a) => a.seesCycles },
  { to: `${BASE}/pending`, label: "Pending reviews", show: (a) => a.canSubmit },
  { to: `${BASE}/mine`, label: "My appraisals", show: (a) => a.canViewOwn },
  { to: `${BASE}/cycles`, label: "Appraisal cycles", show: (a) => a.seesCycles },
  { to: `${BASE}/questions`, label: "Criteria & questions", show: (a) => a.canManageQuestions },
  { to: `${BASE}/configuration`, label: "Configuration", show: (a) => a.canConfigure },
  { to: `${BASE}/reports`, label: "Results & reports", show: (a) => a.canViewReports },
  { to: `${BASE}/history`, label: "History", show: (a) => a.canViewReports || a.canConfigure },
];

/** The first section this person may open: the dashboard for managers, otherwise their own work. */
export function firstSection(access: AppraisalAccess): string {
  return SECTIONS.find((s) => s.show(access))?.to ?? "/dashboard";
}

/** Index route: sends the user to the first page they are allowed to see. */
export function AppraisalHome() {
  const access = useAppraisalAccess();
  return <Navigate to={firstSection(access)} replace />;
}

/** The module's frame: a title and a tab bar whose entries depend on what the signed-in user may do. */
export default function AppraisalLayout() {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const { pathname } = useLocation();

  const sections = SECTIONS.filter((s) => s.show(access));
  // A page the user has no tab for (typed into the address bar, or an old bookmark) goes to the first page they may open.
  const current = SECTIONS.filter((s) => (s.end ? pathname === s.to : pathname === s.to || pathname.startsWith(`${s.to}/`))).sort((a, b) => b.to.length - a.to.length)[0];
  if (current && !current.show(access)) return <Navigate to={sections[0]?.to ?? "/dashboard"} replace />;
  // The review form is opened from a pending-review row, so it needs the same right as that list.
  if (pathname.startsWith(`${BASE}/review/`) && !access.canSubmit) return <Navigate to={sections[0]?.to ?? "/dashboard"} replace />;

  return (
    <PageContainer>
      <PageHeader
        title={access.isFamily ? t("Teacher feedback") : t("Performance & Appraisal")}
        description={access.isFamily ? t("Share your feedback about the teachers you were asked to review.") : t("Run appraisal cycles, collect 360-degree feedback and finalize results.")}
      />
      {sections.length > 1 && (
        <nav aria-label={t("Appraisal sections")} className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
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
              {t(s.label)}
            </NavLink>
          ))}
        </nav>
      )}
      <Outlet />
    </PageContainer>
  );
}
