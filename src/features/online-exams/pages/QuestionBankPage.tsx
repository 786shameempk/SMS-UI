import { useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, FileQuestionMark, FileUp, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listClasses, listSubjects } from "@/features/academics/api";
import GenerateQuestionsDialog from "@/features/ai/components/generation/GenerateQuestionsDialog";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "@/features/ai/capabilities";
import { createQuestion, deleteQuestions, duplicateQuestion, importQuestions, listQuestions, listQuestionTopics, updateQuestion } from "../api";
import { DIFFICULTIES, DIFFICULTY_TONE, formatMarks, isExamStaff, QUESTION_TYPE_LABEL, QUESTION_TYPES } from "../constants";
import type { QuestionBankInput, QuestionBankItem, QuestionDifficulty, QuestionFilters, QuestionType } from "../types";
import ImportQuestionsDialog from "../components/ImportQuestionsDialog";
import QuestionFormDialog from "../components/QuestionFormDialog";

const ALL = "__all";

export default function QuestionBankPage() {
  const role = useAuthStore((s) => s.user?.role);
  // The school and role include AI Features (same rule as the nav), and the AI service can run this feature.
  const aiModule = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.aiFeatures);
  const { can: canAi } = useAiCapabilities();
  const canUseAi = aiModule && canAi("generate-questions");
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  const filters: QuestionFilters = {
    subjectId: params.get("subjectId") ?? undefined,
    classId: params.get("classId") ?? undefined,
    topic: params.get("topic") ?? undefined,
    difficulty: (params.get("difficulty") as QuestionDifficulty | null) ?? undefined,
    type: (params.get("type") as QuestionType | null) ?? undefined,
  };
  const filtered = Object.values(filters).some(Boolean);

  const questions = useQuery({ queryKey: ["online-exams", "question-bank", filters], queryFn: () => listQuestions(filters), enabled: isExamStaff(role) });
  const subjects = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const classes = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const topics = useQuery({ queryKey: ["online-exams", "topics", filters.subjectId], queryFn: () => listQuestionTopics(filters.subjectId) });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["online-exams"] });
  const onError = (err: unknown) => toast.error(err instanceof Error ? err.message : "Something went wrong");

  const save = useMutation({
    mutationFn: (input: QuestionBankInput) => (editing ? updateQuestion(editing.id, input) : createQuestion(input)),
    onSuccess: () => {
      refresh();
      toast.success(editing ? "Question updated" : "Question added to the bank");
      setFormOpen(false);
      setEditing(null);
    },
    onError,
  });
  const duplicate = useMutation({
    mutationFn: duplicateQuestion,
    onSuccess: () => {
      refresh();
      toast.success("Copy added");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: deleteQuestions,
    onSuccess: (count) => {
      refresh();
      toast.success(`${count} question${count === 1 ? "" : "s"} deleted`);
      setSelected(new Set());
      setToDelete(null);
    },
    onError,
  });
  const importing = useMutation({ mutationFn: importQuestions, onSuccess: () => refresh(), onError });

  const data = useMemo(() => questions.data ?? [], [questions.data]);
  const deletable = data.filter((q) => q.canEdit);
  const allSelected = deletable.length > 0 && deletable.every((q) => selected.has(q.id));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    if (key === "subjectId") next.delete("topic");
    setParams(next, { replace: true });
    setSelected(new Set());
  };

  const columns = useMemo<ColumnDef<QuestionBankItem, unknown>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(c) => setSelected(c === true ? new Set(deletable.map((q) => q.id)) : new Set())}
            aria-label="Select all questions you can edit"
            disabled={deletable.length === 0}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected.has(row.original.id)}
              disabled={!row.original.canEdit}
              onCheckedChange={(c) =>
                setSelected((s) => {
                  const next = new Set(s);
                  if (c === true) next.add(row.original.id);
                  else next.delete(row.original.id);
                  return next;
                })
              }
              aria-label={`Select question: ${row.original.text.slice(0, 40)}`}
            />
          </div>
        ),
      },
      {
        accessorKey: "text",
        header: "Question",
        cell: ({ row }) => (
          <div className="min-w-[16rem] max-w-xl">
            <p className="line-clamp-2 text-foreground">{row.original.text}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[row.original.topic, row.original.tags.length ? row.original.tags.map((t) => `#${t}`).join(" ") : null].filter(Boolean).join(" · ") || "No topic"}
            </p>
          </div>
        ),
      },
      { accessorKey: "type", header: "Type", cell: ({ row }) => <span className="whitespace-nowrap">{QUESTION_TYPE_LABEL[row.original.type]}</span> },
      {
        id: "subject",
        header: "Subject / class",
        accessorFn: (q) => `${q.subjectName ?? ""} ${q.className ?? ""}`,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.subjectName ?? "—"}
            <span className="text-muted-foreground"> · {row.original.className ?? "Any class"}</span>
          </span>
        ),
      },
      { accessorKey: "difficulty", header: "Difficulty", cell: ({ row }) => <Badge variant={DIFFICULTY_TONE[row.original.difficulty]}>{row.original.difficulty}</Badge> },
      { accessorKey: "marks", header: "Marks", cell: ({ row }) => <span className="tabular-nums">{formatMarks(row.original.marks)}</span> },
      { accessorKey: "usedInExams", header: "Used", cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.usedInExams}×</span> },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions label="Question actions">
              {row.original.canEdit && (
                <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => duplicate.mutate(row.original.id)}>
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
              {row.original.canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setToDelete([row.original.id])}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </RowActions>
          </div>
        ),
      },
    ],
    [allSelected, deletable, selected, duplicate],
  );

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my" replace />;

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={FileQuestionMark}
        title="Question bank"
        description="Reusable questions for your subjects. Exams copy a question when it's added, so editing here never changes an exam already set."
        actions={
          <div className="flex flex-wrap gap-2">
            {canUseAi && (
              <Button variant="outline" onClick={() => setAiOpen(true)}>
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              Add question
            </Button>
          </div>
        }
      />

      {selected.size > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent/60 px-4 py-2.5 text-sm">
          <span>
            <strong className="tabular-nums">{selected.size}</strong> selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setToDelete([...selected])}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={questions.isLoading}
        isError={questions.isError}
        onRetry={() => questions.refetch()}
        searchable
        searchPlaceholder="Search questions or tags…"
        onRowClick={(q) => {
          if (!q.canEdit) return;
          setEditing(q);
          setFormOpen(true);
        }}
        empty={
          filtered
            ? { icon: FileQuestionMark, title: "No questions match these filters", action: <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>Clear filters</Button> }
            : {
                icon: FileQuestionMark,
                title: "Your question bank is empty",
                description: "Add questions one by one or import a CSV. Then pick them while creating an exam.",
                action: <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>Add question</Button>,
              }
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filters.subjectId ?? ALL} onValueChange={(v) => setParam("subjectId", v)}>
              <SelectTrigger className="w-[10rem]" aria-label="Subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.classId ?? ALL} onValueChange={(v) => setParam("classId", v)}>
              <SelectTrigger className="w-[9rem]" aria-label="Class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.topic ?? ALL} onValueChange={(v) => setParam("topic", v)} disabled={!topics.data?.length}>
              <SelectTrigger className="w-[9.5rem]" aria-label="Topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All topics</SelectItem>
                {(topics.data ?? []).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.difficulty ?? ALL} onValueChange={(v) => setParam("difficulty", v)}>
              <SelectTrigger className="w-[9rem]" aria-label="Difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any difficulty</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.type ?? ALL} onValueChange={(v) => setParam("type", v)}>
              <SelectTrigger className="w-[10rem]" aria-label="Question type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {QUESTION_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        }
      />

      <QuestionFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        question={editing}
        subjects={subjects.data ?? []}
        classes={classes.data ?? []}
        defaultSubjectId={filters.subjectId}
        submitting={save.isPending}
        onSubmit={(input) => save.mutate(input)}
      />

      {canUseAi && (
        <GenerateQuestionsDialog
          open={aiOpen}
          onOpenChange={setAiOpen}
          defaults={{ classId: filters.classId, subjectId: filters.subjectId, chapter: filters.topic }}
          onPublished={refresh}
        />
      )}

      <ImportQuestionsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="bank"
        subjects={subjects.data ?? []}
        classes={classes.data ?? []}
        defaultSubjectId={filters.subjectId}
        submitting={importing.isPending}
        onImport={async (parsed, target) => {
          try {
            const result = await importing.mutateAsync(
              parsed.map((p) => ({ content: p.content, subjectId: target.subjectId, classId: target.classId, topic: p.topic, difficulty: p.difficulty, tags: p.tags })),
            );
            if (result.imported) toast.success(`${result.imported} question${result.imported === 1 ? "" : "s"} imported`);
            return result;
          } catch {
            return undefined; // already toasted by the mutation
          }
        }}
      />

      {toDelete && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setToDelete(null)}
          title={toDelete.length === 1 ? "Delete this question?" : `Delete ${toDelete.length} questions?`}
          description="They're removed from the bank. Exams that already use them keep their own copy."
          confirmLabel="Delete"
          confirmVariant="destructive"
          submitting={remove.isPending}
          onConfirm={() => remove.mutate(toDelete)}
        />
      )}
    </PageContainer>
  );
}
