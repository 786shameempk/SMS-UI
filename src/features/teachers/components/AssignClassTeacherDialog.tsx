import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listClasses, listSections } from "@/features/academics/api";
import type { StaffMember } from "@/features/staff/types";
import { assignClassTeacher, unassignClassTeacher } from "../api";

const UNASSIGNED = "unassigned";

export default function AssignClassTeacherDialog({
  open,
  onOpenChange,
  teachers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: StaffMember[];
}) {
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["academics", "sections"],
    queryFn: listSections,
    enabled: open,
  });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses, enabled: open });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["academics", "sections"] });
  };

  const assignMutation = useMutation({
    mutationFn: ({ sectionId, staffId }: { sectionId: string; staffId: string }) => assignClassTeacher(sectionId, staffId),
    onSuccess: () => {
      invalidate();
      toast.success("Class teacher assigned");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not assign class teacher"),
  });

  const unassignMutation = useMutation({
    mutationFn: (sectionId: string) => unassignClassTeacher(sectionId),
    onSuccess: () => {
      invalidate();
      toast.success("Class teacher removed");
    },
  });

  const classNameOf = (classId: string) => classes.find((c) => c.id === classId)?.name ?? "Unknown class";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign class teachers</DialogTitle>
          <DialogDescription>Pick a teacher to be the class teacher for each section.</DialogDescription>
        </DialogHeader>

        {sectionsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading sections…
          </div>
        )}

        {!sectionsLoading && (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {classNameOf(section.classId)} &middot; {section.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {section.classTeacherName ? `Class teacher: ${section.classTeacherName}` : "No class teacher assigned"}
                  </p>
                </div>
                <Select
                  value={section.classTeacherStaffId ?? UNASSIGNED}
                  onValueChange={(value) => {
                    if (value === UNASSIGNED) unassignMutation.mutate(section.id);
                    else assignMutation.mutate({ sectionId: section.id, staffId: value });
                  }}
                >
                  <SelectTrigger className="w-44 shrink-0">
                    <SelectValue placeholder="Assign teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
