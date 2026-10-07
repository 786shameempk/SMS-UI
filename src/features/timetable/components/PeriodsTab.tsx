import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { saveTimetableSetup } from "../api";
import { DAY_DEFINITIONS } from "../constants";
import { MAX_PERIODS, newPeriodRow, sortByTime, toFormValues, validateSetup } from "../setup";
import type { DayOfWeek, PeriodFormRow, TimetableSetupFormValues } from "../types";
import { TIMETABLE_SETUP_KEY, useTimetableSetup } from "../useTimetableSetup";

/**
 * Period setup: each branch defines its own bell schedule (names, start/end times, breaks) and school days.
 * Lessons refer to a period by its number, so renaming or re-timing never moves them; a period or day that still
 * has lessons can't be removed (the server refuses and says which).
 */
export default function PeriodsTab() {
  const queryClient = useQueryClient();
  const { setup, isLoading, isError, refetch, isFetching } = useTimetableSetup();
  // What the user has changed so far; until they change something the form shows what the branch has now.
  const [draft, setDraft] = useState<TimetableSetupFormValues | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  // The server's reason for refusing a save (e.g. a period that still has lessons), kept visible until the next edit.
  const [serverError, setServerError] = useState<string | null>(null);
  const values = draft ?? toFormValues(setup);

  const save = useMutation({
    mutationFn: saveTimetableSetup,
    onSuccess: (saved) => {
      queryClient.setQueryData(TIMETABLE_SETUP_KEY, saved);
      setDraft(null);
      setShowErrors(false);
      setServerError(null);
      toast.success("Periods saved");
    },
    onError: (err: Error) => {
      setServerError(err.message);
      toast.error(err.message);
    },
  });

  const errors = useMemo(() => validateSetup(values), [values]);
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(toFormValues(setup));

  if (isLoading) return <LoadingState label="Loading periods…" />;
  if (isError) return <ErrorState title="Couldn't load the periods" onRetry={() => void refetch()} retrying={isFetching} />;

  const update = (patch: Partial<TimetableSetupFormValues>) => {
    setShowErrors(false);
    setServerError(null);
    setDraft({ ...values, ...patch });
  };
  const updateRow = (periodNumber: number, patch: Partial<PeriodFormRow>) =>
    update({ periods: values.periods.map((p) => (p.periodNumber === periodNumber ? { ...p, ...patch } : p)) });
  const toggleDay = (day: DayOfWeek) =>
    update({ workingDays: values.workingDays.includes(day) ? values.workingDays.filter((d) => d !== day) : [...values.workingDays, day].sort() });

  const submit = () => {
    setServerError(null);
    if (errors.length > 0) return setShowErrors(true);
    save.mutate({ ...values, periods: sortByTime(values.periods) });
  };

  const ordered = sortByTime(values.periods);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>School days</CardTitle>
          <CardDescription>The days this branch holds classes. Only these days appear in timetables.</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="group" aria-label="School days" className="flex flex-wrap gap-1.5">
            {DAY_DEFINITIONS.map((day) => (
              <ToggleChip key={day.value} size="lg" pressed={values.workingDays.includes(day.value)} onClick={() => toggleDay(day.value)}>
                {day.label}
              </ToggleChip>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Periods and breaks</CardTitle>
          <CardDescription>
            {setup.isCustom
              ? "This branch's own schedule. Rename or re-time a period any time; lessons stay where they are."
              : "This branch is using the standard schedule. Change it below to make it your own."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden grid-cols-[minmax(0,2fr)_9rem_9rem_5rem_2.5rem] items-end gap-3 text-xs font-medium text-muted-foreground md:grid">
            <span>Name</span>
            <span>Starts</span>
            <span>Ends</span>
            <span>Break</span>
            <span />
          </div>

          <ul className="space-y-3">
            {ordered.map((row) => (
              <li
                key={row.periodNumber}
                className="grid grid-cols-2 items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,2fr)_9rem_9rem_5rem_2.5rem] md:border-0 md:p-0"
              >
                <div className="col-span-2 space-y-1.5 md:col-span-1">
                  <Label htmlFor={`label-${row.periodNumber}`} className="md:sr-only">
                    Name
                  </Label>
                  <Input id={`label-${row.periodNumber}`} value={row.label} maxLength={60} onChange={(e) => updateRow(row.periodNumber, { label: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`start-${row.periodNumber}`} className="md:sr-only">
                    Starts
                  </Label>
                  <Input id={`start-${row.periodNumber}`} type="time" value={row.startTime} onChange={(e) => updateRow(row.periodNumber, { startTime: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`end-${row.periodNumber}`} className="md:sr-only">
                    Ends
                  </Label>
                  <Input id={`end-${row.periodNumber}`} type="time" value={row.endTime} onChange={(e) => updateRow(row.periodNumber, { endTime: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 md:h-9">
                  <Switch
                    id={`break-${row.periodNumber}`}
                    checked={row.isBreak}
                    onCheckedChange={(checked) => updateRow(row.periodNumber, { isBreak: checked })}
                    aria-label={`${row.label || "Period"} is a break`}
                  />
                  <Label htmlFor={`break-${row.periodNumber}`} className="text-xs text-muted-foreground md:sr-only">
                    Break
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${row.label || "period"}`}
                  onClick={() => update({ periods: values.periods.filter((p) => p.periodNumber !== row.periodNumber) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            variant="outline"
            disabled={values.periods.length >= MAX_PERIODS}
            onClick={() => update({ periods: [...values.periods, newPeriodRow(values.periods)] })}
          >
            <Plus className="h-4 w-4" />
            Add period or break
          </Button>

          {showErrors && errors.length > 0 && (
            <ul role="alert" className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-strong">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          {serverError && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-strong">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" disabled={!dirty || save.isPending} onClick={() => {
                setDraft(null);
                setServerError(null);
                setShowErrors(false);
              }}>
              <RotateCcw className="h-4 w-4" />
              Discard changes
            </Button>
            <Button type="button" onClick={submit} loading={save.isPending} disabled={!dirty}>
              Save periods
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
