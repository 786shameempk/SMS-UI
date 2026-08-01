import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOOD_GROUPS } from "../../constants";
import { updateMedical } from "../../api";
import type { MedicalInfo, Student } from "../../types";

export default function MedicalTab({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    formState: { isDirty },
  } = useForm<MedicalInfo>({ defaultValues: student.medical });

  const mutation = useMutation({
    mutationFn: (values: MedicalInfo) => updateMedical(student.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students", student.id] });
      toast.success("Medical information saved");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical history</CardTitle>
        <CardDescription>Blood group, allergies, and ongoing conditions the school should know about.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bloodGroup">Blood group</Label>
              <Controller
                control={control}
                name="bloodGroup"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="bloodGroup">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg === "unknown" ? "Unknown" : bg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="allergies">Allergies</Label>
              <Input id="allergies" placeholder="e.g. Peanuts, Penicillin" {...register("allergies")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conditions">Ongoing conditions</Label>
            <Textarea id="conditions" rows={2} placeholder="e.g. Asthma" {...register("conditions")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medications">Current medications</Label>
            <Textarea id="medications" rows={2} {...register("medications")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doctorName">Doctor name</Label>
              <Input id="doctorName" {...register("doctorName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doctorPhone">Doctor phone</Label>
              <Input id="doctorPhone" {...register("doctorPhone")} />
            </div>
          </div>

          <Button type="submit" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save medical information
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
