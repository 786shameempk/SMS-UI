import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, Check, CircleUserRound, HardDrive, Lock, MessageSquareQuote, Sparkles, UserRoundCog, Users, type LucideIcon } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import QuoteRequestDialog from "@/features/marketing/components/QuoteRequestDialog";
import { PLAN_SOLUTIONS } from "@/features/marketing/data";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";
import { getPlanUsage, getSubscription } from "../api";
import type { Subscription, SubscriptionStatus } from "../types";

const STATUS: Record<SubscriptionStatus, { label: string; tone: BadgeVariant; note: string }> = {
  Active: { label: "Active", tone: "success", note: "Your subscription is active and every included module is available." },
  Trial: { label: "Trial", tone: "info", note: "You're on a trial. Contact us before it ends to continue without interruption." },
  Suspended: { label: "Suspended", tone: "warning", note: "Your subscription is suspended. Contact us to restore full access." },
  Cancelled: { label: "Cancelled", tone: "neutral", note: "This subscription has been cancelled. Contact us to reactivate it." },
};

/** Catalog tier → the plan name used on the website (the "Growth" tier is marketed as Professional). */
const TIER_PLAN: Record<NonNullable<Subscription["tier"]>, string> = { Starter: "Starter", Growth: "Professional", Enterprise: "Enterprise" };

function UsageMeter({ icon: Icon, label, used, max, unit }: { icon: LucideIcon; label: string; used: number | null; max: number | null; unit: string }) {
  const pct = used != null && max ? Math.min(100, Math.round((used / max) * 100)) : null;
  const tone = pct == null ? "bg-primary" : pct >= 95 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div className="rounded-xl border border-border/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </span>
        {pct != null && <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {used == null ? "—" : used.toLocaleString("en-IN")}
        <span className="text-sm font-normal text-muted-foreground"> {max ? `of ${max.toLocaleString("en-IN")} ${unit}` : unit}</span>
      </p>
      {pct != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={`${label} used`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
        </div>
      )}
      {pct != null && pct >= 80 && <p className="mt-2 text-xs text-warning-strong">Nearing your plan's limit.</p>}
      {max == null && <p className="mt-2 text-xs text-muted-foreground">No limit on your plan.</p>}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Settings → Subscription: what the school's plan includes and how much of it is in use. Commercial pricing
 * is private by design - no amounts appear here; more features are requested through the School Sphere team.
 */
export default function SubscriptionTab() {
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const [contactOpen, setContactOpen] = useState(false);
  const subscription = useQuery({ queryKey: ["settings", "subscription", tenantId], queryFn: getSubscription });
  const usage = useQuery({ queryKey: ["settings", "plan-usage", tenantId], queryFn: getPlanUsage });

  if (subscription.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (subscription.isError || !subscription.data) {
    return (
      <ErrorState
        title="Couldn't load your subscription"
        description={subscription.error instanceof Error ? subscription.error.message : undefined}
        onRetry={() => subscription.refetch()}
        retrying={subscription.isRefetching}
      />
    );
  }

  const s = subscription.data;
  const status = STATUS[s.status];
  const planName = s.tier ? TIER_PLAN[s.tier] : (s.planName ?? "Full access");
  const highlights = PLAN_SOLUTIONS.find((p) => p.key === planName);

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-accent via-card to-card p-[var(--space-card-padding)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="bg-brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-md shadow-brand-600/25">
                {highlights ? <highlights.icon className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Plan</p>
                <h2 className="mt-0.5 text-2xl font-bold text-foreground">{planName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{highlights?.subtitle ?? "Every module is enabled for your school."}</p>
              </div>
            </div>
            <Badge variant={status.tone} dot className="w-fit">
              {status.label}
            </Badge>
          </div>
          <p className="mt-4 text-sm text-secondary-foreground">{status.note}</p>
          <dl className="mt-5 grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-3">
            <Detail label="Subscribed since">
              <span className="flex items-center gap-1.5">
                <CalendarCheck2 className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(s.subscribedSince)}
              </span>
            </Detail>
            <Detail label="Renewal">Arranged with your School Sphere account team</Detail>
            <Detail label="Billing contact">
              <span className="flex items-center gap-1.5">
                <CircleUserRound className="h-3.5 w-3.5 text-muted-foreground" />
                {s.billingContactName}
              </span>
              <span className="block text-xs font-normal text-muted-foreground">{s.billingContactEmail}</span>
            </Detail>
          </dl>
        </div>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Students and staff counted against your plan, across every branch.</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.isError ? (
            <ErrorState title="Couldn't load usage" onRetry={() => usage.refetch()} retrying={usage.isRefetching} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <UsageMeter icon={Users} label="Students" used={usage.data?.studentCount ?? null} max={s.maxStudents} unit="students" />
              <UsageMeter icon={UserRoundCog} label="Staff" used={usage.data?.staffCount ?? null} max={s.maxStaff} unit="staff" />
              <div className="rounded-xl border border-border/80 p-4">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  Document storage
                </span>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                  {s.storageGb ? `${s.storageGb} GB` : "—"}
                  <span className="text-sm font-normal text-muted-foreground"> included</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">For documents, study materials and uploads.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Included modules */}
        <Card>
          <CardHeader>
            <CardTitle>Included modules</CardTitle>
            <CardDescription>
              {s.includedModules.length} module{s.includedModules.length === 1 ? "" : "s"} enabled for your school. Roles & Permissions decides who can use each one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {s.includedModules.map((m) => (
                <li key={m} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-soft">
                    <Check className="h-2.5 w-2.5 text-success-strong" strokeWidth={3} />
                  </span>
                  {m}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {/* Enabled features */}
          {highlights && (
            <Card>
              <CardHeader>
                <CardTitle>Enabled features</CardTitle>
                <CardDescription>What your {planName} plan includes.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {highlights.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-secondary-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Available additional modules */}
          <Card>
            <CardHeader>
              <CardTitle>Available additional modules</CardTitle>
              <CardDescription>Modules offered on other plans that your school doesn't have yet.</CardDescription>
            </CardHeader>
            <CardContent>
              {s.availableModules.length === 0 ? (
                <EmptyState bare size="sm" icon={Sparkles} title="You have every module" description="Your plan already includes the full School Sphere suite." />
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {s.availableModules.map((m) => (
                    <li key={m} className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upgrades: never priced in the product */}
      <Card className="border-primary/30 bg-accent/40">
        <CardContent className="flex flex-col gap-4 pt-[var(--space-card-padding)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary ring-1 ring-primary/20">
              <MessageSquareQuote className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Looking for additional features?</p>
              <p className="text-sm text-muted-foreground">Plans are tailored to your requirements. Reach out and our team will walk you through the options.</p>
            </div>
          </div>
          <Button onClick={() => setContactOpen(true)} className="shrink-0">
            Contact Administrator
          </Button>
        </CardContent>
      </Card>

      <QuoteRequestDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        variant="upgrade"
        defaults={{ schoolName: s.schoolName, name: user?.name, email: user?.email, plan: planName }}
      />
    </div>
  );
}
