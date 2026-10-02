import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { listClasses, listSections, listSubjects } from "@/features/academics/api";
import { createHomework } from "@/features/homework/api";
import HomeworkFormDialog from "@/features/homework/components/HomeworkFormDialog";
import type { HomeworkFormValues } from "@/features/homework/types";
import { listTeachers } from "@/features/teachers/api";
import { useAuthStore } from "@/store/authStore";
import { HOMEWORK_TITLE_MAX } from "../../generation/assignment";

/**
 * Hands a reviewed AI draft to the homework module through its own form, prefilled. The teacher still picks the
 * section and dates, and it is saved as a Draft unless they choose Published.
 */
export default function AssignHomeworkButton({
  title,
  description,
  classId,
  subjectId,
  disabled,
}: {
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const email = useAuthStore((s) => s.user?.email);
  const [open, setOpen] = useState(false);
  const [assigned, setAssigned] = useState(false);

  // Same query keys as the homework page, so the lists are shared from cache. Loaded up front so the form is
  // complete when it opens (a late teacher list would reset what the teacher already typed).
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: sections = [] } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });

  // Taken once when the form opens: the dialog resets whenever these change, so they must not follow refetches.
  const [initialValues, setInitialValues] = useState<Partial<HomeworkFormValues>>({});
  const openForm = () => {
    setInitialValues({
      title: title.trim().slice(0, HOMEWORK_TITLE_MAX),
      description,
      classId,
      subjectId,
      // The signed-in teacher when their staff record is found; otherwise they choose.
      staffId: teachers.find((t) => email && t.email.toLowerCase() === email.toLowerCase())?.id ?? "",
    });
    setOpen(true);
  };

  const create = useMutation({
    mutationFn: createHomework,
    onSuccess: (hw) => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast.success(hw.status === "published" ? "Homework published to the class" : "Saved as a homework draft. Publish it from Homework when ready.");
      setAssigned(true);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" onClick={openForm} disabled={disabled || assigned}>
        <ClipboardList className="h-4 w-4" />
        {assigned ? "Assigned as homework" : "Assign as homework"}
      </Button>
      <HomeworkFormDialog
        open={open}
        onOpenChange={setOpen}
        initialValues={initialValues}
        classes={classes}
        subjects={subjects}
        sections={sections}
        teachers={teachers}
        submitting={create.isPending}
        onSubmit={async (values) => {
          await create.mutateAsync(values);
        }}
      />
    </>
  );
}
