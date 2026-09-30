import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { submitLead } from "../api";
import { COUNTRY_CODES, PLAN_KEYS, QUOTE_MODULE_OPTIONS, STAFF_COUNT_OPTIONS, STUDENT_COUNT_OPTIONS } from "../data";

const NOT_SURE = "Not sure yet";

const quoteSchema = z.object({
  schoolName: z.string().trim().min(1, "School name is required").max(200),
  name: z.string().trim().min(1, "Contact person is required").max(150),
  email: z.string().trim().email("Enter a valid email"),
  dialCode: z.string(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9\s-]{6,15}$/, "Enter a valid phone number"),
  studentCount: z.string().min(1, "Select the number of students"),
  staffCount: z.string().optional(),
  requiredModules: z.array(z.string()),
  preferredPlan: z.string(),
  requirements: z.string().max(2000).optional(),
  message: z.string().max(2000).optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export interface QuoteDefaults {
  schoolName?: string;
  name?: string;
  email?: string;
  plan?: string;
  modules?: string[];
}

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: QuoteDefaults;
  /** Copy for a signed-in school asking about more features, instead of a first enquiry. */
  variant?: "public" | "upgrade";
}

const emptyValues = (d: QuoteDefaults = {}): QuoteFormValues => ({
  schoolName: d.schoolName ?? "",
  name: d.name ?? "",
  email: d.email ?? "",
  dialCode: "+91",
  phone: "",
  studentCount: "",
  staffCount: "",
  requiredModules: d.modules ?? [],
  preferredPlan: d.plan && PLAN_KEYS.includes(d.plan as (typeof PLAN_KEYS)[number]) ? d.plan : NOT_SURE,
  requirements: "",
  message: "",
});

/**
 * "Request a Quote": the only way to learn School Sphere's pricing. Sent to the team through the public
 * leads endpoint (email + WhatsApp); nothing is priced or estimated in the product.
 */
export default function QuoteRequestDialog({ open, onOpenChange, defaults, variant = "public" }: QuoteRequestDialogProps) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({ resolver: zodResolver(quoteSchema), defaultValues: emptyValues(defaults) });

  useEffect(() => {
    if (open) {
      reset(emptyValues(defaults));
      setSent(false);
      setError(null);
    }
    // Only when opening: the defaults object is rebuilt on every parent render.
  }, [open, reset]);

  const onSubmit = async (v: QuoteFormValues) => {
    setError(null);
    try {
      await submitLead({
        kind: "quote",
        schoolName: v.schoolName,
        name: v.name,
        email: v.email,
        phone: `${v.dialCode} ${v.phone}`,
        studentCount: v.studentCount,
        staffCount: v.staffCount || undefined,
        requiredModules: v.requiredModules.length ? v.requiredModules : undefined,
        preferredPlan: v.preferredPlan === NOT_SURE ? undefined : v.preferredPlan,
        requirements: v.requirements?.trim() || undefined,
        message: v.message?.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const fieldError = (msg?: string) => (msg ? <p className="text-xs text-destructive-strong">{msg}</p> : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success-strong">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="mt-5 text-xl">Request received</DialogTitle>
            <DialogDescription className="mt-2 max-w-md">
              Thank you for your interest. Our team will contact you to discuss the plan that best fits your school's requirements.
            </DialogDescription>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                <MessageSquareQuote className="h-3.5 w-3.5" />
                {variant === "upgrade" ? "Additional features" : "Tailored to your school"}
              </div>
              <DialogTitle className="text-xl">{variant === "upgrade" ? "Ask about more features" : "Request a quote"}</DialogTitle>
              <DialogDescription>
                {variant === "upgrade"
                  ? "Tell us what your school needs next. The School Sphere team will get in touch with the options for your plan."
                  : "Pricing depends on your school's size and the modules you need. Share a few details and we'll prepare a proposal for you."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quote-school">School name *</Label>
                  <Input id="quote-school" autoComplete="organization" aria-invalid={errors.schoolName ? true : undefined} {...register("schoolName")} />
                  {fieldError(errors.schoolName?.message)}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-name">Contact person *</Label>
                  <Input id="quote-name" autoComplete="name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
                  {fieldError(errors.name?.message)}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quote-email">Email *</Label>
                  <Input id="quote-email" type="email" autoComplete="email" aria-invalid={errors.email ? true : undefined} {...register("email")} />
                  {fieldError(errors.email?.message)}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-phone">Phone *</Label>
                  <div className="flex h-9 overflow-hidden rounded-md border border-input bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring">
                    <Controller
                      control={control}
                      name="dialCode"
                      render={({ field }) => (
                        <select {...field} aria-label="Country code" className="cursor-pointer border-r border-input bg-secondary/60 pl-2 pr-1 text-sm text-foreground outline-none">
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.dial}>
                              {c.flag} {c.dial}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    <input
                      id="quote-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      aria-invalid={errors.phone ? true : undefined}
                      className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none"
                      {...register("phone")}
                    />
                  </div>
                  {fieldError(errors.phone?.message)}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quote-students">Number of students *</Label>
                  <Controller
                    control={control}
                    name="studentCount"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="quote-students" aria-invalid={errors.studentCount ? true : undefined}>
                          <SelectValue placeholder="Select" />
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
                  {fieldError(errors.studentCount?.message)}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-staff">Number of staff</Label>
                  <Controller
                    control={control}
                    name="staffCount"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="quote-staff">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_COUNT_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-plan">Preferred plan</Label>
                  <Controller
                    control={control}
                    name="preferredPlan"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="quote-plan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_KEYS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                          <SelectItem value={NOT_SURE}>{NOT_SURE}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">Required modules</legend>
                <Controller
                  control={control}
                  name="requiredModules"
                  render={({ field }) => (
                    <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-border/80 p-2.5">
                      {QUOTE_MODULE_OPTIONS.map((m) => {
                        const on = field.value.includes(m);
                        return (
                          <label
                            key={m}
                            className={cn(
                              "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                              on ? "border-primary/50 bg-accent text-foreground" : "border-border text-secondary-foreground hover:border-primary/30",
                            )}
                          >
                            <Checkbox
                              checked={on}
                              onCheckedChange={(c) => field.onChange(c === true ? [...field.value, m] : field.value.filter((x) => x !== m))}
                              className="h-3.5 w-3.5"
                            />
                            {m}
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="quote-requirements">Additional requirements</Label>
                <Textarea
                  id="quote-requirements"
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. multiple branches, integrations with an existing system, data migration, hosting preferences…"
                  {...register("requirements")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quote-message">Message</Label>
                <Textarea id="quote-message" rows={3} maxLength={2000} placeholder="Anything else you'd like us to know" {...register("message")} />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive-strong">
                  {error}
                </p>
              )}

              <DialogFooter className="mt-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Request a Quote
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
