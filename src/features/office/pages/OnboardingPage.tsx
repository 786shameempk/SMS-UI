import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, GitPullRequestArrow, Hourglass, ListChecks } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "../components/salesKit";
import { listSchools, onboardingSummary } from "../api/sales";
import { ago, day } from "../helpers";
import { ONBOARDING_STAGES } from "../onboarding";

/** The pipeline: a column for every stage, with the schools that are in it. */
export default function OnboardingPage() {
  const summary = useQuery({ queryKey: ["office", "onboarding-summary"], queryFn: onboardingSummary });
  const schools = useQuery({ queryKey: ["office", "onboarding-board"], queryFn: () => listSchools({ status: "open", pageSize: 100 }) });

  if (summary.isLoading || schools.isLoading) return <PageContainer><Skeleton className="h-72 rounded-xl" /></PageContainer>;
  if (summary.isError || schools.isError) return <PageContainer><ErrorState onRetry={() => { void summary.refetch(); void schools.refetch(); }} retrying={summary.isRefetching || schools.isRefetching} /></PageContainer>;

  const s = summary.data!;
  const items = schools.data!.items;
  const tiles = [
    { label: "Open schools", value: s.openSchools, icon: GitPullRequestArrow },
    { label: "Blocked", value: s.blocked, icon: AlertTriangle, warn: s.blocked > 0 },
    { label: "Overdue tasks", value: s.overdueTasks, icon: ListChecks, warn: s.overdueTasks > 0 },
    { label: "Stuck for a while", value: s.stuckSchools, icon: Hourglass, warn: s.stuckSchools > 0 },
  ];

  return (
    <PageContainer>
      <PageHeader icon={GitPullRequestArrow} title="Onboarding" description="Where every school is between first enquiry and an active subscription." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, warn }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </div>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? "text-destructive-strong" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={GitPullRequestArrow} title="No schools in the pipeline" description="Add a school from the Schools page." />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2" role="list" aria-label="Onboarding stages">
          {ONBOARDING_STAGES.map((label, i) => {
            const here = items.filter((x) => x.stageNumber === i + 1);
            return (
              <section key={label} role="listitem" aria-label={`${i + 1}. ${label}`} className="w-60 shrink-0 rounded-xl border border-border bg-muted/30 p-2">
                <h2 className="flex items-center justify-between px-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{`${i + 1}. ${label}`}</span>
                  <span className="tabular-nums">{here.length}</span>
                </h2>
                <div className="space-y-2">
                  {here.map((x) => (
                    <Link key={x.id} to={`/office/schools/${x.id}`} className="block rounded-lg border border-border bg-card p-3 text-sm shadow-sm hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <p className="font-medium">{x.schoolName}</p>
                      <p className="text-xs text-muted-foreground">{x.ownerName ?? "Unassigned"} · {ago(x.stageChangedAt)}</p>
                      {x.blocker && <p className="mt-1 flex items-center gap-1 text-xs text-destructive-strong"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{x.blocker}{x.dueDate ? ` · ${day(x.dueDate)}` : ""}</p>}
                      {x.openTasks > 0 && <p className="mt-1 text-xs text-muted-foreground">{x.openTasks} open task{x.openTasks === 1 ? "" : "s"}</p>}
                      {x.subscriptionStatus && <div className="mt-1"><StatusBadge status={x.subscriptionStatus} /></div>}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
