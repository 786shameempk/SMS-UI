import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, GraduationCap, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { submitLead } from "../api";
import { COUNTRY_CODES } from "../data";

const BRAND_GRADIENT = "linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)";

const REACH_ME_MESSAGE = "Enter a phone number or an email";

/** Phone and email are each optional, but at least one is needed so the team can reply. */
const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Please enter your name"),
    dialCode: z.string(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9\s-]{6,15}$/, "Enter a valid phone number")
      .or(z.literal("")),
    email: z.string().trim().email("Enter a valid email").or(z.literal("")),
    message: z.string().trim().min(1, "Let us know how we can help"),
    consent: z.literal(true, { errorMap: () => ({ message: "Please accept to continue" }) }),
  })
  .superRefine((values, ctx) => {
    if (!values.phone && !values.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: REACH_ME_MESSAGE });
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: REACH_ME_MESSAGE });
    }
  });

type ContactFormValues = z.infer<typeof contactSchema>;

const DEFAULT_VALUES = {
  name: "",
  dialCode: "+91",
  phone: "",
  email: "",
  message: "I want to know more",
  consent: true,
} as ContactFormValues;

function BrandAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full ring-2 ring-white/70", className)}
      style={{ background: BRAND_GRADIENT }}
    >
      <GraduationCap className="h-1/2 w-1/2 text-white" />
    </div>
  );
}

export default function ContactWidget({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema), defaultValues: DEFAULT_VALUES });

  // Close on Escape, like the rest of the app's overlays.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const onSubmit = async (values: ContactFormValues) => {
    setError(null);
    try {
      await submitLead({
        kind: "contact",
        name: values.name,
        phone: values.phone ? `${values.dialCode} ${values.phone}` : undefined,
        email: values.email || undefined,
        message: values.message,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const startOver = () => {
    reset(DEFAULT_VALUES);
    setSent(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Contact us"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ transformOrigin: "bottom right" }}
            className="flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-slate-900/20"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 text-white" style={{ background: BRAND_GRADIENT }}>
              <div
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }}
              />
              <BrandAvatar className="relative h-10 w-10" />
              <div className="relative min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-tight">Have a question?</p>
                <p className="flex items-center gap-1.5 text-xs text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
                  EduCore team &middot; usually replies within a day
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/15"
                aria-label="Minimise"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              {sent ? (
                <div className="flex flex-col items-center px-2 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-base font-bold text-foreground">Thanks — message received!</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    A member of our team will get back to you shortly using the details you shared.
                  </p>
                  <Button variant="outline" size="sm" className="mt-5" onClick={startOver}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <>
                  {/* Greeting bubble */}
                  <div className="flex items-start gap-2.5">
                    <BrandAvatar className="h-8 w-8 ring-0" />
                    <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                      Enter your question below and a representative will get right back to you.
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
                    <div className="space-y-3 rounded-xl border border-border p-3">
                      <div>
                        <Input placeholder="Name *" autoComplete="name" aria-label="Name" {...register("name")} />
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                      </div>

                      <div>
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
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel-national"
                            placeholder="Phone"
                            aria-label="Phone"
                            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                            {...register("phone")}
                          />
                        </div>
                        {/* The "phone or email" error is shown once, under email, rather than on both fields. */}
                        {errors.phone && errors.phone.message !== REACH_ME_MESSAGE && (
                          <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                        )}
                      </div>

                      <div>
                        <Input
                          type="email"
                          inputMode="email"
                          placeholder="Email"
                          autoComplete="email"
                          aria-label="Email"
                          aria-invalid={Boolean(errors.email)}
                          {...register("email")}
                        />
                        {errors.email ? (
                          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">Phone or email — at least one is required.</p>
                        )}
                      </div>

                      <div>
                        <Textarea rows={3} aria-label="Message" className="resize-none" {...register("message")} />
                        {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
                      </div>
                    </div>

                    <Controller
                      control={control}
                      name="consent"
                      render={({ field }) => (
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-secondary px-3 py-2.5">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(v) => field.onChange(v === true)}
                            className="mt-0.5"
                          />
                          <span className="text-xs leading-relaxed text-muted-foreground">
                            By submitting you agree to receive SMS or e-mails for the provided channel. Rates may be applied.
                          </span>
                        </label>
                      )}
                    />
                    {errors.consent && <p className="-mt-1 text-xs text-red-600">{errors.consent.message}</p>}
                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="flex justify-center pt-1">
                      <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-36">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Send
                        {!isSubmitting && <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>

            <div className="border-t border-border py-2 text-center text-[11px] text-muted-foreground">
              Powered by <span className="font-semibold text-brand-600">EduCore</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => onOpenChange(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-brand-700/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        style={{ background: BRAND_GRADIENT }}
        aria-label={open ? "Close chat" : "Contact us"}
        aria-expanded={open}
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-20" />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
