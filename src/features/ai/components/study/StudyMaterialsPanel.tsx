import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { listClasses, listSubjects } from "@/features/academics/api";
import { deleteAiDocument, listAiDocuments, uploadAiDocument, UPLOAD_EXTENSIONS, validateUpload } from "../../study/api";
import type { AiDocument, DocumentVisibility } from "../../study/types";
import { ClassSubjectFields } from "../generation/shared";

const DOCUMENTS_KEY = ["ai", "documents"] as const;
const POLL_MS = 3000;

const ERROR_TEXT: Record<string, string> = {
  AI_DOCUMENT_PROCESSING_ERROR: "The text could not be read. Scanned PDFs without a text layer are not supported yet.",
  AI_QUOTA_EXCEEDED: "The school's monthly AI limit was reached while indexing.",
  AI_PROVIDER_ERROR: "The AI provider failed while indexing. Upload it again later.",
  AI_TIMEOUT: "Indexing timed out. Upload it again later.",
};

const isPending = (d: AiDocument) => d.status === "Queued" || d.status === "Processing";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Staff upload class material here; the AI service indexes it so the study assistant can answer from it with page citations. */
export default function StudyMaterialsPanel() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState({ classId: "", subjectId: "" });
  const [visibility, setVisibility] = useState<DocumentVisibility>("Class");
  const [filterClassId, setFilterClassId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AiDocument | null>(null);

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const documents = useQuery({
    queryKey: [...DOCUMENTS_KEY, filterClassId],
    queryFn: () => listAiDocuments(filterClassId || undefined),
    // Keep polling while anything is still being indexed, then stop.
    refetchInterval: (q) => (q.state.data?.some(isPending) ? POLL_MS : false),
  });

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "Unknown class";
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";

  const resetForm = () => {
    setFile(null);
    setTitle("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const upload = useMutation({
    mutationFn: uploadAiDocument,
    onSuccess: (d) => {
      toast.success(`"${d.title}" uploaded. Indexing has started.`);
      resetForm();
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteAiDocument,
    onSuccess: () => {
      toast.success("Material removed from the study assistant.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fileError = file ? validateUpload(file) : null;
  const canUpload = Boolean(file && !fileError && target.classId && target.subjectId) && !upload.isPending;

  const submit = () => {
    if (!file || !canUpload) return;
    upload.mutate({ file, title: title.trim() || file.name.replace(/\.[^.]+$/, ""), classId: target.classId, subjectId: target.subjectId, visibility });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add study material</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <FormField label="File" htmlFor="ai-doc-file" error={fileError ?? undefined} hint={`${UPLOAD_EXTENSIONS.join(", ")} up to 20 MB`}>
              <Input
                id="ai-doc-file"
                ref={fileInput}
                type="file"
                accept={UPLOAD_EXTENSIONS.join(",")}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </FormField>
            <FormField label="Title" htmlFor="ai-doc-title">
              <Input id="ai-doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "e.g. Chapter 4 — Force and Pressure"} />
            </FormField>
            <ClassSubjectFields classId={target.classId} subjectId={target.subjectId} onChange={setTarget} idPrefix="ai-doc" />
            <FormField label="Who can use it" htmlFor="ai-doc-visibility">
              <Select value={visibility} onValueChange={(v) => setVisibility(v as DocumentVisibility)}>
                <SelectTrigger id="ai-doc-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Class">Students and parents of this class</SelectItem>
                  <SelectItem value="StaffOnly">Staff only</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <Button type="submit" disabled={!canUpload}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload and index
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Indexed materials</CardTitle>
          <div className="w-48">
            <Select value={filterClassId || "__all"} onValueChange={(v) => setFilterClassId(v === "__all" ? "" : v)}>
              <SelectTrigger aria-label="Filter by class">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {documents.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading materials…
            </div>
          ) : documents.isError ? (
            <p className="text-sm text-destructive">{(documents.error as Error).message}</p>
          ) : !documents.data?.length ? (
            <EmptyState bare size="sm" icon={FileText} title="No materials yet" description="Upload notes, chapters or slides so the study assistant can answer from them." />
          ) : (
            <ul className="divide-y divide-border" aria-label="Indexed materials">
              {documents.data.map((d) => (
                <li key={d.id} className="flex items-start gap-3 py-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{d.title}</span>
                      <StatusBadge status={d.status} label={d.status === "Ready" ? "Ready" : undefined} variant={d.status === "Ready" ? "success" : undefined} />
                      {d.visibility === "StaffOnly" && <StatusBadge status="staff" label="Staff only" variant="neutral" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {className(d.classId)} · {subjectName(d.subjectId)} · {d.fileName} · {formatBytes(d.sizeBytes)}
                      {d.status === "Ready" && ` · ${d.pageCount} page${d.pageCount === 1 ? "" : "s"}`}
                    </p>
                    {isPending(d) && (
                      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Indexing ${d.title}`} aria-valuenow={d.progress} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(d.progress, 5)}%` }} />
                      </div>
                    )}
                    {d.status === "Failed" && <p className="text-xs text-destructive">{ERROR_TEXT[d.errorCode ?? ""] ?? "Indexing failed. Upload the file again."}</p>}
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${d.title}`} onClick={() => setDeleteTarget(d)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove study material"
        description={`"${deleteTarget?.title}" will be deleted and the study assistant will stop using it.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
