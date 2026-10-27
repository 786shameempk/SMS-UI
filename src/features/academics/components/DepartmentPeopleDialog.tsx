import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { listStaff } from "@/features/staff/api";
import { assignDepartmentHead, assignDepartmentMember, listDepartmentMembers, listReportingOptions, setReportingPerson } from "../api";
import type { Department } from "../types";

const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

/**
 * Who heads a department and who works in it. Choosing a head or a reporting person is checked by the server (same school, still employed, able to sign in,
 * no loops), and its message is shown as it is. A new member's reporting person defaults to the department head.
 */
export default function DepartmentPeopleDialog({ department, onClose }: { department: Department; onClose: () => void }) {
  const { t } = useTranslation("academics");
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [newMember, setNewMember] = useState("");
  const members = useQuery({ queryKey: ["academics", "department-members", department.id], queryFn: () => listDepartmentMembers(department.id) });
  const options = useQuery({ queryKey: ["academics", "reporting-options", department.id], queryFn: () => listReportingOptions({ departmentId: department.id }) });
  const staff = useQuery({ queryKey: ["staff", "all"], queryFn: listStaff });
  const [headId, setHeadId] = useState(department.headStaffId ?? "");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["academics", "departments"] });
    void qc.invalidateQueries({ queryKey: ["academics", "department-members", department.id] });
    void qc.invalidateQueries({ queryKey: ["academics", "reporting-options", department.id] });
  };
  const fail = (e: unknown) => setError((e as Error).message);
  const head = useMutation({ mutationFn: () => assignDepartmentHead(department.id, headId || null), onSuccess: () => { setError(null); toast.success(t("Department head saved")); refresh(); }, onError: fail });
  const add = useMutation({ mutationFn: () => assignDepartmentMember(department.id, newMember), onSuccess: () => { setError(null); setNewMember(""); toast.success(t("Added to the department")); refresh(); }, onError: fail });
  const report = useMutation({
    mutationFn: ({ staffId, to }: { staffId: string; to: string }) => setReportingPerson(staffId, to || null),
    onSuccess: () => { setError(null); toast.success(t("Reporting person saved")); refresh(); },
    onError: fail,
  });

  const inDepartment = new Set((members.data ?? []).map((m) => m.staffId));
  const candidates = (staff.data ?? []).filter((s) => !inDepartment.has(s.id) && s.status !== "resigned" && s.status !== "terminated");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{department.name}</DialogTitle>
          <DialogDescription>{t("Choose the department head and manage who works here and who each person reports to. Profile changes go to a person's reporting person, or to the department head.")}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive-strong">{error}</p>}

        <section className="space-y-2">
          <label htmlFor="dept-head" className="text-sm font-medium">{t("Department head")}</label>
          <div className="flex gap-2">
            <select id="dept-head" className={selectClass} value={headId} onChange={(e) => setHeadId(e.target.value)} disabled={!department.isActive}>
              <option value="">{t("No head")}</option>
              {(options.data ?? []).map((o) => (
                <option key={o.staffId} value={o.staffId}>{o.name} · {o.designation} · {o.employeeId}</option>
              ))}
            </select>
            <Button onClick={() => head.mutate()} loading={head.isPending} disabled={headId === (department.headStaffId ?? "")}>{t("Save head")}</Button>
          </div>
          {!department.isActive && <p className="text-xs text-muted-foreground">{t("Activate the department to change its head.")}</p>}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("Employees")} ({members.data?.length ?? 0})</h3>
          {members.isLoading && <Skeleton className="h-24 w-full" />}
          {members.isError && <ErrorState description={(members.error as Error).message} onRetry={() => void members.refetch()} />}
          <ul className="divide-y rounded-md border">
            {(members.data ?? []).map((m) => (
              <li key={m.staffId} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{m.name}</span> <span className="text-muted-foreground">{m.designation} · {m.employeeId}</span>
                  {m.isHead && <Badge variant="brand" className="ml-2">{t("Head")}</Badge>}
                  {!m.hasLogin && <Badge variant="warning" className="ml-2">{t("No sign-in")}</Badge>}
                </span>
                <select
                  aria-label={`${t("Reporting person")} - ${m.name}`}
                  className="h-8 w-56 rounded-md border bg-background px-2 text-sm"
                  value={m.reportingToStaffId ?? ""}
                  onChange={(e) => report.mutate({ staffId: m.staffId, to: e.target.value })}
                >
                  <option value="">{t("Administrators (no reporting person)")}</option>
                  {m.reportingToStaffId && !(options.data ?? []).some((o) => o.staffId === m.reportingToStaffId) && <option value={m.reportingToStaffId}>{m.reportingToName}</option>}
                  {(options.data ?? []).filter((o) => o.staffId !== m.staffId).map((o) => (
                    <option key={o.staffId} value={o.staffId}>{o.name}{o.isDepartmentHead ? ` (${t("Head")})` : ""}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          {department.isActive && (
            <div className="flex gap-2">
              <select aria-label={t("Add an employee")} className={selectClass} value={newMember} onChange={(e) => setNewMember(e.target.value)}>
                <option value="">{t("Add an employee…")}</option>
                {candidates.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} · {s.employeeId}</option>
                ))}
              </select>
              <Button variant="outline" onClick={() => add.mutate()} loading={add.isPending} disabled={!newMember}>{t("Add")}</Button>
            </div>
          )}
        </section>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
