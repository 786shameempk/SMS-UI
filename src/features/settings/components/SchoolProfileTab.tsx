import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAcademicYears, updateAcademicYear } from "@/features/academics/api";
import { getSchoolProfile, updateSchoolProfile } from "../api";
import type { SchoolProfileFormValues } from "../types";

const profileSchema = z.object({
  name: z.string().min(1, "School name is required"),
  tagline: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(6, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  principalName: z.string().optional(),
  establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
});

type FormValues = z.infer<typeof profileSchema>;

export default function SchoolProfileTab() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["settings", "profile"], queryFn: getSchoolProfile });
  const { data: academicYears = [] } = useQuery({ queryKey: ["academics", "academic-years"], queryFn: listAcademicYears });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (profile) reset(profile);
  }, [profile, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: SchoolProfileFormValues) => updateSchoolProfile(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });
      toast.success("School profile saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save profile"),
  });

  const currentYear = academicYears.find((y) => y.isCurrent);
  const yearMutation = useMutation({
    mutationFn: (id: string) => {
      const target = academicYears.find((y) => y.id === id)!;
      return updateAcademicYear(id, { name: target.name, startDate: target.startDate, endDate: target.endDate, status: target.status, isCurrent: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academics", "academic-years"] });
      toast.success("Current academic year updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not switch academic year"),
  });

  if (isLoading || !profile) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>School profile</CardTitle>
          <CardDescription>Shown across the portal — login screen, reports, and outgoing communications.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-name" required>School name</Label>
              <Input id="sp-name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
              {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-tagline" optional>Tagline</Label>
              <Input id="sp-tagline" {...register("tagline")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-address" required>Address</Label>
              <Input id="sp-address" aria-invalid={errors.address ? true : undefined} {...register("address")} />
              {errors.address && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sp-phone" required>Phone</Label>
                <Input id="sp-phone" aria-invalid={errors.phone ? true : undefined} {...register("phone")} />
                {errors.phone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-email" required>Email</Label>
                <Input id="sp-email" type="email" aria-invalid={errors.email ? true : undefined} {...register("email")} />
                {errors.email && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sp-principalName">Principal</Label>
                <Input id="sp-principalName" {...register("principalName")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-establishedYear">Established year</Label>
                <Input id="sp-establishedYear" type="number" aria-invalid={errors.establishedYear ? true : undefined} {...register("establishedYear")} />
                {errors.establishedYear && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.establishedYear.message}</p>}
              </div>
            </div>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic year</CardTitle>
          <CardDescription>Which academic year is treated as "current" across Academics, Attendance, Timetable, and Examinations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-w-xs">
            <Label>Current academic year</Label>
            <Select value={currentYear?.id ?? ""} onValueChange={(id) => yearMutation.mutate(id)}>
              <SelectTrigger>
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
