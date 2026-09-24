import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarCheck, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitLead } from "../api";
import { COUNTRY_CODES, DEMO_HIGHLIGHTS, STUDENT_COUNT_OPTIONS } from "../data";

const demoSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().email("Enter a valid work email"),
  dialCode: z.string(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9\s-]{6,15}$/, "Enter a valid phone number"),
  schoolName: z.string().trim().min(1, "School name is required"),
  studentCount: z.string().min(1, "Select your school size"),
  preferredDate: z.string().optional(),
  message: z.string().optional(),
});

type DemoFormValues = z.infer<typeof demoSchema>;

const DEFAULT_VALUES: DemoFormValues = {
  name: "",
  email: "",
  dialCode: "+91",
  phone: "",
  schoolName: "",
  studentCount: "",
  preferredDate: "",
  message: "",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function RequestDemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DemoFormValues>({ resolver: zodResolver(demoSchema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (open) {
      reset(DEFAULT_VALUES);
      setSent(false);
      setError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: DemoFormValues) => {
    setError(null);
    try {
      await submitLead({
        kind: "demo",
        name: values.name,
        email: values.email,
        phone: `${values.dialCode} ${values.phone}`,
        schoolName: values.schoolName,
        studentCount: values.studentCount,
        preferredDate: values.preferredDate || undefined,
        message: values.message?.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="mt-5 text-xl">Your demo request is in!</DialogTitle>
            <DialogDescription className="mt-2 max-w-sm">
              Our team will reach out within one business day to confirm a time that works for you.
            </DialogDescription>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                <Sparkles className="h-3.5 w-3.5" />
                Free personalised demo
              </div>
              <DialogTitle className="text-xl">Request a demo</DialogTitle>
              <DialogDescription>See how EduCore fits your school — we'll tailor the walkthrough to what you share.</DialogDescription>
            </DialogHeader>

            <ul className="space-y-2 rounded-xl border border-brand-100 bg-brand-50/60 p-4 dark:border-border dark:bg-secondary">
              {DEMO_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-name">Full name *</Label>
                  <Input id="demo-name" autoComplete="name" {...register("name")} />
                  {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-email">Work email *</Label>
                  <Input id="demo-email" type="email" autoComplete="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-phone">Phone *</Label>
                <div className="flex h-9 overflow-hidden rounded-md border border-input bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring">
                  <Controller
                    control={control}
                    name="dialCode"
                    render={({ field }) => (
                      <select
                        {...field}
                        aria-label="Country code"
                        className="cursor-pointer border-r border-input bg-secondary/60 pl-2 pr-1 text-sm text-foreground outline-none"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.dial}>
                            {c.flag} {c.dial}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <input
                    id="demo-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-school">School name *</Label>
                  <Input id="demo-school" autoComplete="organization" {...register("schoolName")} />
                  {errors.schoolName && <p className="text-xs text-red-600">{errors.schoolName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-size">Number of students *</Label>
                  <Controller
                    control={control}
                    name="studentCount"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="demo-size">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {STUDENT_COUNT_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.studentCount && <p className="text-xs text-red-600">{errors.studentCount.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-date">Preferred date (optional)</Label>
                <Input id="demo-date" type="date" min={todayIso()} {...register("preferredDate")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-message">What would you like to see? (optional)</Label>
                <Textarea
                  id="demo-message"
                  rows={3}
                  placeholder="e.g. fee collection across two branches, parent app, exam report cards…"
                  {...register("message")}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <DialogFooter className="mt-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Request demo
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
