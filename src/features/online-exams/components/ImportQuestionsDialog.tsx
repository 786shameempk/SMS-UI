import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, FormRow } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SchoolClass, Subject } from "@/features/academics/types";
import { QUESTION_TYPE_LABEL } from "../constants";
import { CSV_TEMPLATE, parseQuestionsCsv, type ParsedQuestion } from "../csvQuestions";
import type { QuestionImportResult } from "../types";
import { validateQuestion } from "./QuestionEditor";

const ANY_CLASS = "__any";

interface ImportQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "bank": pick subject/class and send to the Question Bank. "exam": hand the parsed questions to the wizard. */
  mode: "bank" | "exam";
  subjects?: Subject[];
  classes?: SchoolClass[];
  defaultSubjectId?: string;
  submitting?: boolean;
  onImport: (questions: ParsedQuestion[], target: { subjectId: string; classId: string | null }) => void | Promise<QuestionImportResult | void>;
}

/** CSV import with a live preview: every row is checked with the same rules as the editor before anything is sent. */
export default function ImportQuestionsDialog({ open, onOpenChange, mode, subjects = [], classes = [], defaultSubjectId, submitting, onImport }: ImportQuestionsDialogProps) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? "");
  const [classId, setClassId] = useState(ANY_CLASS);
  const [serverResult, setServerResult] = useState<QuestionImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setFileName(null);
    setServerResult(null);
    setSubjectId(defaultSubjectId ?? "");
    setClassId(ANY_CLASS);
  }, [open, defaultSubjectId]);

  const parsed = useMemo(() => (text.trim() ? parseQuestionsCsv(text) : null), [text]);
  const checked = useMemo(() => {
    if (!parsed) return { valid: [] as ParsedQuestion[], problems: [] as string[] };
    const problems = [...parsed.errors];
    const valid: ParsedQuestion[] = [];
    for (const q of parsed.questions) {
      const errs = Object.values(validateQuestion(q.content));
      if (errs.length) problems.push(`Row ${q.row}: ${errs.join(" ")}`);
      else valid.push(q);
    }
    return { valid, problems };
  }, [parsed]);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "question-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File) => {
    setFileName(file.name);
    setServerResult(null);
    setText(await file.text());
  };

  const submit = async () => {
    const result = await onImport(checked.valid, { subjectId, classId: classId === ANY_CLASS ? null : classId });
    if (result) setServerResult(result);
  };

  const canImport = checked.valid.length > 0 && (mode === "exam" || !!subjectId) && !serverResult;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import questions</DialogTitle>
          <DialogDescription>
            Upload a CSV (from Excel or Google Sheets) with one question per row. Every row is checked before it's imported.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            {fileName ? "Choose another file" : "Choose CSV file"}
          </Button>
          <Button variant="ghost" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Download template
          </Button>
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <FormField label="…or paste CSV" htmlFor="import-csv" optional hint="Columns: type, question, marks, difficulty, topic, options (A|B|C), correct (B or A|C), answers, explanation, model_answer, tags.">
          <Textarea id="import-csv" rows={5} value={text} onChange={(e) => { setText(e.target.value); setServerResult(null); }} className="font-mono text-xs" placeholder={CSV_TEMPLATE.split("\n").slice(0, 2).join("\n")} />
        </FormField>

        {mode === "bank" && (
          <FormRow>
            <FormField label="Add to subject" htmlFor="import-subject" required>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="import-subject">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Class" htmlFor="import-class" optional>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger id="import-class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_CLASS}>Any class</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormRow>
        )}

        {parsed && (
          <div className="space-y-3 rounded-xl border border-border/80 p-4" aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {checked.valid.length} question{checked.valid.length === 1 ? "" : "s"} ready to import
            </p>
            {checked.valid.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {checked.valid.slice(0, 50).map((q) => (
                  <li key={q.row} className="flex gap-2 text-secondary-foreground">
                    <span className="shrink-0 text-xs text-muted-foreground">{QUESTION_TYPE_LABEL[q.content.type]}</span>
                    <span className="truncate">{q.content.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {checked.problems.length > 0 && (
              <div className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-strong">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  {checked.problems.length} row{checked.problems.length === 1 ? "" : "s"} will be skipped
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                  {checked.problems.slice(0, 20).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {serverResult && (
          <div className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success-strong" role="status">
            Imported {serverResult.imported} question{serverResult.imported === 1 ? "" : "s"}.
            {serverResult.errors.length > 0 && ` ${serverResult.errors.length} were rejected: ${serverResult.errors.slice(0, 3).join(" ")}`}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {serverResult ? "Done" : "Cancel"}
          </Button>
          {!serverResult && (
            <Button onClick={submit} disabled={!canImport} loading={submitting}>
              Import {checked.valid.length > 0 ? checked.valid.length : ""} question{checked.valid.length === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
