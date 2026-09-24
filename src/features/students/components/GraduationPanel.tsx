import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { getCurrentBranchId } from "@/utils/tenant";
import { useClassSectionOptions } from "../hooks";
import { graduateStudents, listStudents } from "../api";

export default function GraduationPanel() {
  const queryClient = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { classNames, finalClassName } = useClassSectionOptions(getCurrentBranchId());
  const [className, setClassName] = useState("");

  // Default to the final class once the real class list has loaded.
  useEffect(() => {
    if (!className && finalClassName) setClassName(finalClassName);
  }, [className, finalClassName]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const eligible = useMemo(() => students.filter((s) => s.status === "active" && s.className === className), [students, className]);

  const graduateMutation = useMutation({
    mutationFn: () => graduateStudents(className),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success(`Graduated ${result.graduatedCount} student(s) from ${className}`);
      setConfirmOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not graduate students"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-slate-400" />
          Graduate students
        </CardTitle>
        <CardDescription>Move all active students in a class to alumni status at the end of their final year.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Select value={className} onValueChange={setClassName}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classNames.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {className && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold tabular-nums">{eligible.length}</span> active student(s) in {className} will graduate.
          </p>
        )}

        <Button disabled={eligible.length === 0} onClick={() => setConfirmOpen(true)}>
          Graduate class
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Graduate students"
        description={`This will mark ${eligible.length} student(s) in ${className} as graduated.`}
        confirmLabel="Graduate"
        submitting={graduateMutation.isPending}
        onConfirm={() => graduateMutation.mutate()}
      />
    </Card>
  );
}
