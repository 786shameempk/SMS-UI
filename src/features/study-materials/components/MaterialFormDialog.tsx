import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { FileUp, Globe2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, FormField, FormRow, FormSection } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listAcademicYears, listClasses, listSections, listSubjects } from "@/features/academics/api";
import { cn } from "@/utils/cn";
import { ACCEPTED_EXTENSIONS, AUDIENCE_LABEL, CATEGORY_OPTIONS, MAX_FILE_MB, formatBytes } from "../constants";
import type { StudyMaterial, StudyMaterialFormValues } from "../types";

const NONE = "__none__";

const schema = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(200, "Keep the title under 200 characters"),
    description: z.string().max(4000, "Keep the description under 4000 characters").optional(),
    category: z.enum(["notes", "textbook", "worksheet", "assignment", "questionPaper", "previousYearPaper", "answerKey", "video", "presentation", "reference"]),
    academicYearId: z.string().optional(),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    subjectId: z.string().optional(),
    gradeLabel: z.string().max(100).optional(),
    subjectLabel: z.string().max(100).optional(),
    chapter: z.string().max(200, "Keep this under 200 characters").optional(),
    audience: z.enum(["allStudents", "class", "section"]),
    availableFrom: z.string().optional(),
    availableUntil: z.string().optional(),
    linkUrl: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Enter a full web address starting with http:// or https://"),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "class" && !v.classId) ctx.addIssue({ code: "custom", path: ["classId"], message: "Choose the class this is for" });
    if (v.audience === "section" && !v.sectionId) ctx.addIssue({ code: "custom", path: ["sectionId"], message: "Choose the section this is for" });
    if (v.availableFrom && v.availableUntil && v.availableUntil < v.availableFrom) {
      ctx.addIssue({ code: "custom", path: ["availableUntil"], message: "End date must be on or after the start date" });
    }
  });

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  title: "",
  description: "",
  category: "notes",
  academicYearId: "",
  classId: "",
  sectionId: "",
  subjectId: "",
  gradeLabel: "",
  subjectLabel: "",
  chapter: "",
  audience: "allStudents",
  availableFrom: "",
  availableUntil: "",
  linkUrl: "",
};

export interface MaterialSubmit {
  values: StudyMaterialFormValues;
  publish: boolean;
  file: File | null;
  removeFile: boolean;
}

export default function MaterialFormDialog({
  open,
  onOpenChange,
  material,
  isPlatform,
  submitting,
  progress,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: StudyMaterial | null;
  /** SuperAdmin: the material is shared with every school, so it uses free-text grade/subject labels. */
  isPlatform: boolean;
  submitting: boolean;
  progress: number | null;
  onSubmit: (submit: MaterialSubmit) => Promise<void>;
}) {
  const isEdit = Boolean(material);
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const schoolLists = !isPlatform && open;
  const years = useQuery({ queryKey: ["academics", "years"], queryFn: listAcademicYears, enabled: schoolLists });
  const classes = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses, enabled: schoolLists });
  const sections = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections, enabled: schoolLists });
  const subjects = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects, enabled: schoolLists });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setRemoveFile(false);
    setFileError(undefined);
    reset(
      material
        ? {
            title: material.title,
            description: material.description ?? "",
            category: material.category,
            academicYearId: material.academicYearId ?? "",
            classId: material.classId ?? "",
            sectionId: material.sectionId ?? "",
            subjectId: material.subjectId ?? "",
            gradeLabel: material.isGlobal ? (material.className ?? "") : "",
            subjectLabel: material.isGlobal ? (material.subjectName ?? "") : "",
            chapter: material.chapter ?? "",
            audience: material.audience,
            availableFrom: material.availableFrom ?? "",
            availableUntil: material.availableUntil ?? "",
            linkUrl: material.linkUrl ?? "",
          }
        : { ...EMPTY, academicYearId: "" },
    );
  }, [open, material, reset]);

  // Default the academic year to the current one for new materials.
  useEffect(() => {
    if (!open || material) return;
    const current = years.data?.find((y) => y.isCurrent);
    if (current) setValue("academicYearId", current.id);
  }, [open, material, years.data, setValue]);

  const classId = watch("classId");
  const audience = watch("audience");
  const sectionOptions = useMemo(() => (sections.data ?? []).filter((s) => s.classId === classId), [sections.data, classId]);
  const subjectOptions = useMemo(
    () => (subjects.data ?? []).filter((s) => !classId || s.classIds.length === 0 || s.classIds.includes(classId)),
    [subjects.data, classId],
  );

  const hasExistingFile = Boolean(material?.fileName) && !removeFile;

  const pickFile = (picked: File | undefined) => {
    setFileError(undefined);
    if (!picked) return;
    const ext = `.${picked.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return setFileError("That file type isn't supported. Use PDF, Word, PowerPoint, Excel, images, ZIP or text.");
    if (picked.size > MAX_FILE_MB * 1024 * 1024) return setFileError(`Files can be up to ${MAX_FILE_MB} MB.`);
    setFile(picked);
  };

  const submit = (publish: boolean) =>
    handleSubmit(async (v) => {
      if (!file && !hasExistingFile && !v.linkUrl) {
        setFileError("Attach a file or add a video/external link.");
        return;
      }
      const clean = (s?: string) => (s && s !== NONE ? s : undefined);
      await onSubmit({
        publish,
        file,
        removeFile: removeFile && !file,
        values: {
          title: v.title.trim(),
          description: clean(v.description?.trim()),
          category: v.category,
          academicYearId: isPlatform ? undefined : clean(v.academicYearId),
          classId: isPlatform ? undefined : clean(v.classId),
          sectionId: isPlatform || v.audience !== "section" ? undefined : clean(v.sectionId),
          subjectId: isPlatform ? undefined : clean(v.subjectId),
          gradeLabel: isPlatform ? clean(v.gradeLabel?.trim()) : undefined,
          subjectLabel: isPlatform ? clean(v.subjectLabel?.trim()) : undefined,
          chapter: clean(v.chapter?.trim()),
          audience: isPlatform ? "allStudents" : v.audience,
          availableFrom: clean(v.availableFrom),
          availableUntil: clean(v.availableUntil),
          linkUrl: clean(v.linkUrl?.trim()),
        },
      });
    });

  const selectField = (
    name: "academicYearId" | "classId" | "sectionId" | "subjectId",
    placeholder: string,
    options: Array<{ id: string; name: string }>,
    opts: { allowNone?: boolean; disabled?: boolean; onChange?: (v: string) => void } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={field.value || NONE}
          onValueChange={(v) => {
            field.onChange(v === NONE ? "" : v);
            opts.onChange?.(v === NONE ? "" : v);
          }}
          disabled={opts.disabled}
        >
          <SelectTrigger id={`sm-${name}`} aria-invalid={errors[name] ? true : undefined}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {opts.allowNone !== false && <SelectItem value={NONE}>{placeholder}</SelectItem>}
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  const isPublished = material?.status === "published";

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit study material" : "Add study material"}</DialogTitle>
          <DialogDescription>
            {isPlatform
              ? "Platform materials are shared with every school on EduCore."
              : "Visible only inside your school, to the students you choose below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <FormSection title="Basics">
            <FormField label="Title" htmlFor="sm-title" required error={errors.title?.message}>
              <Input id="sm-title" placeholder="e.g. Algebra: introduction to equations" aria-invalid={errors.title ? true : undefined} {...register("title")} />
            </FormField>
            <FormRow>
              <FormField label="Material type" htmlFor="sm-category" required>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="sm-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Chapter / topic" htmlFor="sm-chapter" optional error={errors.chapter?.message}>
                <Input id="sm-chapter" placeholder="e.g. Chapter 4" {...register("chapter")} />
              </FormField>
            </FormRow>
            <FormField label="Description" htmlFor="sm-description" optional error={errors.description?.message} hint="What it covers and how students should use it.">
              <Textarea id="sm-description" rows={3} {...register("description")} />
            </FormField>
          </FormSection>

          {isPlatform ? (
            <FormSection title="Grade & subject" description="Free text, because class and subject lists differ between schools.">
              <FormRow>
                <FormField label="Grade" htmlFor="sm-grade" optional hint="e.g. Grade 8">
                  <Input id="sm-grade" {...register("gradeLabel")} />
                </FormField>
                <FormField label="Subject" htmlFor="sm-subjectLabel" optional hint="e.g. Mathematics">
                  <Input id="sm-subjectLabel" {...register("subjectLabel")} />
                </FormField>
              </FormRow>
              <div className="flex items-start gap-2.5 rounded-lg border border-info/25 bg-info-soft px-3 py-2.5 text-sm text-info-strong">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Every school&apos;s students and staff will see this once it&apos;s published.
              </div>
            </FormSection>
          ) : (
            <>
              <FormSection title="Class & subject">
                <FormRow>
                  <FormField label="Academic year" htmlFor="sm-academicYearId" optional>
                    {selectField("academicYearId", "Any year", (years.data ?? []).map((y) => ({ id: y.id, name: y.name })))}
                  </FormField>
                  <FormField label="Subject" htmlFor="sm-subjectId" optional>
                    {selectField("subjectId", "Any subject", subjectOptions.map((s) => ({ id: s.id, name: s.name })))}
                  </FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Class" htmlFor="sm-classId" required={audience !== "allStudents"} optional={audience === "allStudents"} error={errors.classId?.message}>
                    {selectField("classId", "Any class", (classes.data ?? []).map((c) => ({ id: c.id, name: c.name })), {
                      onChange: () => setValue("sectionId", ""),
                    })}
                  </FormField>
                  {audience === "section" && (
                    <FormField label="Section" htmlFor="sm-sectionId" required error={errors.sectionId?.message}>
                      {selectField("sectionId", classId ? "Choose section" : "Choose a class first", sectionOptions.map((s) => ({ id: s.id, name: s.name })), {
                        disabled: !classId,
                        allowNone: false,
                      })}
                    </FormField>
                  )}
                </FormRow>
              </FormSection>

              <FormSection title="Who can see it" description="Only students of your school, never other schools.">
                <Controller
                  control={control}
                  name="audience"
                  render={({ field }) => (
                    <div role="radiogroup" aria-label="Audience" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(["allStudents", "class", "section"] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          role="radio"
                          aria-checked={field.value === a}
                          onClick={() => field.onChange(a)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            field.value === a ? "border-primary bg-accent text-accent-foreground font-medium" : "border-input hover:bg-muted",
                          )}
                        >
                          {AUDIENCE_LABEL[a]}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </FormSection>
            </>
          )}

          <FormSection title="File or link" description={`PDF, Word, PowerPoint, Excel, images, ZIP or text, up to ${MAX_FILE_MB} MB. Add a link for videos.`}>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {file || hasExistingFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file?.name ?? material?.fileName}</p>
                  <p className="text-xs text-muted-foreground">{file ? `${formatBytes(file.size)} · new file` : formatBytes(material?.sizeBytes)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove file"
                  onClick={() => {
                    setFile(null);
                    if (material?.fileName) setRemoveFile(true);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  dragging ? "border-primary bg-accent" : "border-input hover:border-primary/60 hover:bg-muted/60",
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <FileUp className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-foreground">Drop a file here or browse</span>
                <span className="text-xs text-muted-foreground">One file per material</span>
              </button>
            )}
            <FieldError>{fileError}</FieldError>
            <FormField label="Video or external link" htmlFor="sm-link" optional error={errors.linkUrl?.message} hint="YouTube, Google Drive, a website…">
              <Input id="sm-link" type="url" inputMode="url" placeholder="https://" {...register("linkUrl")} />
            </FormField>
          </FormSection>

          <FormSection title="Availability" description="Optional. Students only see it between these dates.">
            <FormRow>
              <FormField label="Available from" htmlFor="sm-from" optional>
                <Input id="sm-from" type="date" {...register("availableFrom")} />
              </FormField>
              <FormField label="Available until" htmlFor="sm-until" optional error={errors.availableUntil?.message}>
                <Input id="sm-until" type="date" {...register("availableUntil")} />
              </FormField>
            </FormRow>
          </FormSection>

          {progress !== null && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading…</span>
                <span className="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            {isPublished ? (
              <Button type="button" onClick={submit(true)} loading={submitting}>
                Save changes
              </Button>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={submit(false)} disabled={submitting}>
                  Save as draft
                </Button>
                <Button type="button" onClick={submit(true)} loading={submitting}>
                  Publish
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
