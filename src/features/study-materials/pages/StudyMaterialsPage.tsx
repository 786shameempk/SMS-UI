import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { BookOpenText, Globe2, Plus } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listClasses, listSubjects } from "@/features/academics/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import {
  createStudyMaterial,
  deleteStudyMaterial,
  getMyStudyMaterialCounts,
  listStudyMaterials,
  pinStudyMaterial,
  transitionStudyMaterial,
  updateStudyMaterial,
} from "../api";
import MaterialCard, { type MaterialAction } from "../components/MaterialCard";
import MaterialDetailDialog from "../components/MaterialDetailDialog";
import MaterialFormDialog, { type MaterialSubmit } from "../components/MaterialFormDialog";
import { CATEGORY_OPTIONS } from "../constants";
import type { StudyMaterial, StudyMaterialCategory, StudyMaterialStatus } from "../types";

const ALL = "__all__";
type View = "browse" | "mine";
type Source = "all" | "school" | "platform";

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  className?: string;
}) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading materials">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="space-y-3 p-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </Card>
      ))}
    </div>
  );
}

export default function StudyMaterialsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "superAdmin";
  const canUpload = isSuperAdmin || role === "teacher";
  const isLearner = role === "student" || role === "parent";
  const isStaff = !isLearner;

  const [view, setView] = useState<View>("browse");
  const [status, setStatus] = useState<StudyMaterialStatus>("published");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [category, setCategory] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [source, setSource] = useState<Source>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudyMaterial | null>(null);
  const [viewing, setViewing] = useState<StudyMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyMaterial | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const filters = {
    view,
    status: view === "mine" ? status : undefined,
    category: (category || undefined) as StudyMaterialCategory | undefined,
    subjectId: subjectId || undefined,
    classId: classId || undefined,
    scope: source === "all" ? undefined : source,
    search: deferredSearch,
  } as const;

  const materials = useQuery({ queryKey: ["study-materials", filters], queryFn: () => listStudyMaterials(filters) });
  const counts = useQuery({ queryKey: ["study-materials", "counts"], queryFn: getMyStudyMaterialCounts, enabled: canUpload });
  // School lists power the filters; platform admins and learners don't filter by a school's class list.
  const subjects = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects, enabled: !isSuperAdmin });
  const classes = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses, enabled: isStaff && !isSuperAdmin });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["study-materials"] });

  const save = useMutation({
    mutationFn: async ({ values, publish, file, removeFile }: MaterialSubmit) => {
      setProgress(file ? 0 : null);
      try {
        return editing
          ? await updateStudyMaterial(editing.id, values, { publish, file, removeFile, onProgress: file ? setProgress : undefined })
          : await createStudyMaterial(values, { publish, file, onProgress: file ? setProgress : undefined });
      } finally {
        setProgress(null);
      }
    },
    onSuccess: (m, { publish }) => {
      invalidate();
      toast.success(editing ? "Changes saved" : publish ? "Material published" : "Saved as draft");
      setFormOpen(false);
      setEditing(null);
      if (!editing) {
        setView("mine");
        setStatus(m.status);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't save this material"),
  });

  const act = useMutation({
    mutationFn: async ({ action, material }: { action: MaterialAction; material: StudyMaterial }) => {
      if (action === "publish" || action === "archive" || action === "restore") return transitionStudyMaterial(material.id, action);
      if (action === "pin" || action === "unpin") return pinStudyMaterial(material.id, action === "pin");
      if (action === "delete") return deleteStudyMaterial(material.id);
    },
    onSuccess: (_r, { action }) => {
      invalidate();
      setViewing(null);
      setDeleteTarget(null);
      toast.success(
        { publish: "Published", archive: "Archived", restore: "Restored as a draft", pin: "Pinned to the top", unpin: "Unpinned", delete: "Deleted" }[
          action as "publish"
        ] ?? "Done",
      );
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Something went wrong"),
  });

  const handleAction = (action: MaterialAction, material: StudyMaterial) => {
    if (action === "open") return setViewing(material);
    if (action === "edit") {
      setViewing(null);
      setEditing(material);
      return setFormOpen(true);
    }
    if (action === "delete") return setDeleteTarget(material);
    act.mutate({ action, material });
  };

  const items = materials.data ?? [];
  const hasFilters = Boolean(search || category || subjectId || classId || source !== "all");
  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setSubjectId("");
    setClassId("");
    setSource("all");
  };

  const description = isSuperAdmin
    ? "Share notes, papers and videos with every school on EduCore. School uploads stay inside their own school."
    : canUpload
      ? "Share notes, worksheets, papers and videos with your students. Your uploads are visible only inside your school."
      : "Notes, worksheets, question papers and videos from your teachers and EduCore.";

  return (
    <PageContainer>
      <PageHeader
        title="Study materials"
        description={description}
        actions={
          canUpload ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add material
            </Button>
          ) : undefined
        }
      />

      {canUpload && (
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList variant="line">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="mine">
              {isSuperAdmin ? "Platform library" : "My materials"}
              {counts.data && <span className="rounded bg-secondary px-1.5 text-xs tabular-nums">{counts.data.drafts + counts.data.published + counts.data.archived}</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {view === "mine" && (
        <div role="radiogroup" aria-label="Status" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
          {(
            [
              ["published", "Published", counts.data?.published],
              ["draft", "Drafts", counts.data?.drafts],
              ["archived", "Archived", counts.data?.archived],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => setStatus(value)}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors cursor-pointer",
                status === value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {count !== undefined && <span className="tabular-nums text-xs text-muted-foreground">{count}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput value={search} onValueChange={setSearch} placeholder="Search title, topic, subject…" containerClassName="sm:w-80" />
        <FilterSelect label="Material type" value={category} onChange={setCategory} allLabel="All types" options={CATEGORY_OPTIONS} />
        {!isSuperAdmin && (subjects.data?.length ?? 0) > 0 && (
          <FilterSelect label="Subject" value={subjectId} onChange={setSubjectId} allLabel="All subjects" options={(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        )}
        {isStaff && !isSuperAdmin && (classes.data?.length ?? 0) > 0 && (
          <FilterSelect label="Class" value={classId} onChange={setClassId} allLabel="All classes" options={(classes.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        )}
        {view === "browse" && (
          <FilterSelect
            label="Source"
            value={source === "all" ? "" : source}
            onChange={(v) => setSource((v || "all") as Source)}
            allLabel="All sources"
            options={[
              { value: "school", label: "My school" },
              { value: "platform", label: "EduCore library" },
            ]}
          />
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {materials.isLoading ? (
        <GridSkeleton />
      ) : materials.isError ? (
        <ErrorState onRetry={() => void materials.refetch()} retrying={materials.isRefetching} />
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState icon={BookOpenText} title="No materials match" description="Try a different search or clear the filters." action={<Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>} />
        ) : view === "mine" ? (
          <EmptyState
            icon={BookOpenText}
            title={status === "draft" ? "No drafts" : status === "archived" ? "Nothing archived" : "Nothing published yet"}
            description={status === "published" ? "Materials you publish appear here with their view and download counts." : undefined}
            action={
              status !== "archived" ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" /> Add material
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={isSuperAdmin ? Globe2 : BookOpenText}
            title="No study materials yet"
            description={isLearner ? "When your teachers share notes, papers or videos, they'll appear here." : "Published materials from your school and EduCore appear here."}
          />
        )
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {items.length} {items.length === 1 ? "material" : "materials"}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((m) => (
              <MaterialCard key={m.id} material={m} showStatus={view === "mine"} showStats={isStaff} onAction={(a) => handleAction(a, m)} />
            ))}
          </div>
        </>
      )}

      <MaterialDetailDialog material={viewing} onOpenChange={(v) => !v && setViewing(null)} onAction={handleAction} showStats={isStaff} />

      <MaterialFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        material={editing}
        isPlatform={editing ? editing.isGlobal : isSuperAdmin}
        submitting={save.isPending}
        progress={progress}
        onSubmit={async (submit) => {
          await save.mutateAsync(submit).catch(() => undefined);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete material"
        description={`Delete "${deleteTarget?.title}" and its file permanently? This can't be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={act.isPending}
        onConfirm={() => {
          if (deleteTarget) act.mutate({ action: "delete", material: deleteTarget });
        }}
      />
    </PageContainer>
  );
}
