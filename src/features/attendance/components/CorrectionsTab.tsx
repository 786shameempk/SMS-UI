import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { cancelCorrection, decideCorrection, listCorrections, requestCorrection } from "../methods/api";
import PersonPicker from "../methods/PersonPicker";
import { formatDateTime, useIsAttendanceAdmin } from "../methods/shared";
import type { CorrectionStatus, PersonType } from "../methods/types";
import { todayDateKey } from "../constants";

import { useTranslation } from "react-i18next";
const STUDENT_STATUSES = ["Present", "Absent", "Late", "HalfDay", "Leave"];
const STAFF_STATUSES = ["Present", "Absent", "Late"];

/** Requests to change a recorded day, decided by an administrator. Teachers see their own requests. */
export default function CorrectionsTab() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();
  const isAdmin = useIsAttendanceAdmin();
  const [status, setStatus] = useState<CorrectionStatus | "all">("pending");
  const [creating, setCreating] = useState(false);
  const corrections = useQuery({
    queryKey: ["attendance-methods", "corrections", status],
    queryFn: () => listCorrections(status === "all" ? undefined : status),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["attendance-methods", "corrections"] });
  const decide = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => decideCorrection(id, approve, note),
    onSuccess: (c) => {
      toast.success(c.status === "approved" ? t("Correction applied") : t("Correction rejected"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({ mutationFn: cancelCorrection, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{t("Attendance corrections")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? t("Approve or reject requested changes. Approving updates the record and the audit trail.") : t("Ask for a recorded day to be changed. An administrator decides.")}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t("Request a correction")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <SegmentedControl
          value={status}
          onValueChange={(v) => setStatus(v as CorrectionStatus | "all")}
          aria-label={t("Correction status")}
          options={[
            { value: "pending", label: t("Pending") },
            { value: "approved", label: t("Approved") },
            { value: "rejected", label: t("Rejected") },
            { value: "all", label: t("All") },
          ]}
        />
        {corrections.isError ? (
          <ErrorState bare onRetry={() => corrections.refetch()} />
        ) : !corrections.data?.length ? (
          <EmptyState bare title={t("No corrections here")} />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {corrections.data.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {c.personName} · {c.date}: {c.currentStatus ?? t("no record")} → {c.requestedStatus}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    “{c.reason}” · {c.requestedByName ?? t("Unknown")} · {formatDateTime(c.requestedAt)}
                    {c.decidedByName ? t(" · decided by {{decidedByName}}{{v1}}", { decidedByName: c.decidedByName, v1: c.decisionNote ? `: ${c.decisionNote}` : "" }) : ""}
                  </p>
                </div>
                <StatusBadge status={c.status} />
                {c.status === "pending" && isAdmin && (
                  <>
                    <Button size="sm" onClick={() => decide.mutate({ id: c.id, approve: true })} disabled={decide.isPending}>
                      <Check className="h-4 w-4" /> {t("Approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive-outline"
                      disabled={decide.isPending}
                      onClick={() => {
                        const note = window.prompt("Why is this rejected?");
                        if (note !== null) decide.mutate({ id: c.id, approve: false, note });
                      }}
                    >
                      <X className="h-4 w-4" /> {t("Reject")}
                    </Button>
                  </>
                )}
                {c.status === "pending" && !isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => cancel.mutate(c.id)}>
                    {t("Cancel")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <RequestDialog open={creating} onOpenChange={setCreating} canStaff={isAdmin} onDone={refresh} />
    </Card>
  );
}

function RequestDialog({ open, onOpenChange, canStaff, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; canStaff: boolean; onDone: () => void }) {
  const { t } = useTranslation("attendance");
  const [personType, setPersonType] = useState<PersonType>("student");
  const [personId, setPersonId] = useState<string | null>(null);
  const [date, setDate] = useState(todayDateKey());
  const [requested, setRequested] = useState("Present");
  const [reason, setReason] = useState("");
  const create = useMutation({
    mutationFn: requestCorrection,
    onSuccess: () => {
      toast.success(t("Correction requested"));
      onOpenChange(false);
      setReason("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const statuses = personType === "student" ? STUDENT_STATUSES : STAFF_STATUSES;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Request an attendance correction")}</DialogTitle>
          <DialogDescription>{t("Say what should change and why. The current record stays until an administrator approves.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {canStaff && (
            <Select
              value={personType}
              onValueChange={(v) => {
                setPersonType(v as PersonType);
                setPersonId(null);
                setRequested("Present");
              }}
            >
              <SelectTrigger aria-label={t("Person type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">{t("Student")}</SelectItem>
                <SelectItem value="staff">{t("Staff member")}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <PersonPicker personType={personType} value={personId} onChange={setPersonId} ariaLabel="Person" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="corr-date">{t("Day")}</Label>
              <Input id="corr-date" type="date" value={date} max={todayDateKey()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Should be")}</Label>
              <Select value={requested} onValueChange={setRequested}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "HalfDay" ? t("Half day") : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="corr-reason">{t("Reason")}</Label>
            <Textarea id="corr-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button
            disabled={!personId || !reason.trim() || create.isPending}
            onClick={() => personId && create.mutate({ personType, personId, date, requestedStatus: requested, reason })}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Send request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
