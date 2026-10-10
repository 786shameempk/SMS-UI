import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Pagination } from "@/components/tables/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { createActivity, deleteActivity, listActivities, listCategories, requestEnrollment, updateActivity } from "../api";
import ActivityFormDialog from "../components/ActivityFormDialog";
import EnrollDialog from "../components/EnrollDialog";
import { ACTIVITY_STATUS_LABEL, KIND_LABEL, SETTING_LABEL } from "../constants";
import { ColorDot, SelectField, formatDate, options, useAcademicYears, useApiMutation, useExtracurricularAccess } from "../shared";
import type { Activity, ActivityStatus } from "../types";

const PAGE_SIZE = 12;

export default function ActivitiesPage() {
  const access = useExtracurricularAccess();
  const years = useAcademicYears();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [status, setStatus] = useState<ActivityStatus | undefined>();
  const [year, setYear] = useState<string | undefined>();
  const [openOnly, setOpenOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [enrolling, setEnrolling] = useState<Activity | null>(null);
  const [removing, setRemoving] = useState<Activity | null>(null);

  const categories = useQuery({ queryKey: ["extracurricular", "categories"], queryFn: () => listCategories(true) });
  const filters = { search: search.trim() || undefined, categoryId, status, academicYear: year, openOnly, pageNumber: page + 1, pageSize: PAGE_SIZE };
  const activities = useQuery({ queryKey: ["extracurricular", "activities", filters], queryFn: () => listActivities(filters), placeholderData: (previous) => previous });

  const save = useApiMutation((input: Parameters<typeof createActivity>[0]) => (editing ? updateActivity(editing.id, input) : createActivity(input)), {
    success: () => (editing ? "Activity saved" : "Activity created"),
    onSuccess: () => setFormOpen(false),
  });
  const remove = useApiMutation(deleteActivity, {
    success: (r) => (r.removed ? "Activity deleted" : "This activity has history, so it was set to inactive instead"),
    onSuccess: () => setRemoving(null),
  });
  const enroll = useApiMutation(requestEnrollment, {
    success: (e) => (e.status === "Approved" ? "Enrolled" : e.status === "Waitlisted" ? "Added to the waiting list" : "Request sent"),
    onSuccess: () => setEnrolling(null),
  });

  const data = activities.data;
  const pageCount = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <SearchInput value={search} onValueChange={reset(setSearch)} placeholder="Search activities" aria-label="Search activities" />
        </div>
        <div className="w-52">
          <SelectField value={categoryId} onChange={reset(setCategoryId)} allLabel="All categories" items={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        {!access.isFamily && (
          <>
            <div className="w-36">
              <SelectField value={status} onChange={reset(setStatus)} allLabel="Any status" items={options(ACTIVITY_STATUS_LABEL)} />
            </div>
            <div className="w-32">
              <SelectField value={year} onChange={reset(setYear)} allLabel="Any year" items={years.names.map((n) => ({ value: n, label: n }))} />
            </div>
          </>
        )}
        <Button variant={openOnly ? "default" : "outline"} onClick={() => reset(setOpenOnly)(!openOnly)} aria-pressed={openOnly}>
          Open for enrollment
        </Button>
        {access.canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New activity
          </Button>
        )}
      </div>

      {activities.isError && <ErrorState onRetry={() => activities.refetch()} retrying={activities.isFetching} />}
      {activities.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      )}
      {data && data.items.length === 0 && (
        <EmptyState
          title="No activities match"
          description={access.canManage ? "Try different filters, or create the first activity." : "Nothing is open right now. Check back soon."}
          action={
            access.canManage ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> New activity
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((a) => {
          const category = categories.data?.find((c) => c.id === a.categoryId);
          const full = a.capacity != null && a.enrolled >= a.capacity;
          return (
            <Card key={a.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">{a.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ColorDot color={category?.color ?? "#64748b"} />
                      <span className="truncate">{a.categoryName ?? category?.name}</span>
                      <span>· {a.code}</span>
                    </p>
                  </div>
                  <StatusBadge status={a.status} label={ACTIVITY_STATUS_LABEL[a.status]} />
                </div>
                {a.description && <p className="line-clamp-2 text-sm text-secondary-foreground">{a.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="neutral">{KIND_LABEL[a.kind]}</Badge>
                  <Badge variant="neutral">{SETTING_LABEL[a.setting]}</Badge>
                  {a.eligibility && <Badge variant="info">{a.eligibility}</Badge>}
                  {a.requiresConsent && <Badge variant="warning">Consent needed</Badge>}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <dt>Places</dt>
                  <dd className="text-right text-foreground">
                    {a.enrolled}
                    {a.capacity ? ` / ${a.capacity}` : ""} {full && <Badge variant="warning">Full</Badge>}
                  </dd>
                  {!access.isFamily && (
                    <>
                      <dt>Waiting / pending</dt>
                      <dd className="text-right text-foreground">
                        {a.waitlisted} / {a.pending}
                      </dd>
                    </>
                  )}
                  {a.coordinatorName && (
                    <>
                      <dt>Coordinator</dt>
                      <dd className="truncate text-right text-foreground">{a.coordinatorName}</dd>
                    </>
                  )}
                  {a.scheduleNote && (
                    <>
                      <dt>Meets</dt>
                      <dd className="truncate text-right text-foreground">{a.scheduleNote}</dd>
                    </>
                  )}
                  {(a.enrollmentStart || a.enrollmentEnd) && (
                    <>
                      <dt>Enrollment</dt>
                      <dd className="text-right text-foreground">
                        {formatDate(a.enrollmentStart)} – {formatDate(a.enrollmentEnd)}
                      </dd>
                    </>
                  )}
                </dl>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <Button size="sm" variant={a.enrollmentOpen || !access.isFamily ? "default" : "outline"} disabled={a.status !== "Active" || (access.isFamily && !a.enrollmentOpen)} onClick={() => setEnrolling(a)}>
                    <UserPlus className="h-4 w-4" />
                    {access.isFamily ? (full ? "Join waiting list" : "Ask to join") : "Enroll"}
                  </Button>
                  {access.canManage && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={`Edit ${a.name}`}
                        onClick={() => {
                          setEditing(a);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${a.name}`} onClick={() => setRemoving(a)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive-strong" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data && data.totalCount > PAGE_SIZE && (
        <Pagination
          pageIndex={page}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          totalCount={data.totalCount}
          from={page * PAGE_SIZE + 1}
          to={Math.min(data.totalCount, (page + 1) * PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        activity={editing}
        categories={categories.data ?? []}
        years={years.names}
        currentYear={years.current}
        submitting={save.isPending}
        onSubmit={async (input) => {
          await save.mutateAsync(input).catch(() => undefined);
        }}
      />
      <EnrollDialog
        open={Boolean(enrolling)}
        onOpenChange={(v) => !v && setEnrolling(null)}
        activity={enrolling}
        isFamily={access.isFamily}
        submitting={enroll.isPending}
        onSubmit={async (v) => {
          if (enrolling) await enroll.mutateAsync({ activityId: enrolling.id, ...v }).catch(() => undefined);
        }}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Delete activity"
        description={`Delete "${removing?.name}"? If it already has enrollments, teams or sessions it is set to inactive instead, so history is kept.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
      />
    </div>
  );
}
