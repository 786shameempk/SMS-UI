import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { formatRelativeDay } from "@/utils/format";
import { listHealthRecords } from "../api";
import type { HealthRecordRow } from "../types";

export default function HealthRecordsTab() {
  const { data: records = [], isLoading } = useQuery({ queryKey: ["health", "records"], queryFn: listHealthRecords });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const student = r.student;
      return (
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(q) ||
        student.admissionNumber.toLowerCase().includes(q) ||
        `${student.className} ${student.section}`.toLowerCase().includes(q)
      );
    });
  }, [records, search]);

  const columns: ColumnDef<HealthRecordRow, unknown>[] = [
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
            {row.original.student.firstName} {row.original.student.lastName}
          </p>
          <p className="text-xs text-slate-500">
            {row.original.student.className} - {row.original.student.section} &middot; {row.original.student.admissionNumber}
          </p>
        </div>
      ),
    },
    {
      id: "bloodGroup",
      header: "Blood group",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.student.medical.bloodGroup === "unknown" ? "—" : row.original.student.medical.bloodGroup}</span>,
    },
    {
      id: "allergies",
      header: "Allergies",
      cell: ({ row }) =>
        row.original.student.medical.allergies?.trim() ? (
          <Badge variant="warning">{row.original.student.medical.allergies}</Badge>
        ) : (
          <span className="text-sm text-slate-400">None on file</span>
        ),
    },
    {
      id: "conditions",
      header: "Ongoing conditions",
      cell: ({ row }) =>
        row.original.student.medical.conditions?.trim() ? (
          <span className="text-sm text-slate-700">{row.original.student.medical.conditions}</span>
        ) : (
          <span className="text-sm text-slate-400">None on file</span>
        ),
    },
    {
      id: "lastCheckup",
      header: "Last checkup",
      cell: ({ row }) =>
        row.original.lastCheckupDate ? (
          <span className="text-sm text-slate-600">{formatRelativeDay(row.original.lastCheckupDate)}</span>
        ) : (
          <span className="text-sm text-slate-400">Never</span>
        ),
    },
    {
      id: "overdueVaccinations",
      header: "Overdue vaccinations",
      cell: ({ row }) =>
        row.original.overdueVaccinations > 0 ? (
          <Badge variant="danger">{row.original.overdueVaccinations}</Badge>
        ) : (
          <span className="text-sm text-slate-400">0</span>
        ),
    },
    {
      id: "visitsThisYear",
      header: "Infirmary visits (this year)",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.visitCountThisYear}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input placeholder="Search by name, class, or admission no." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground max-w-sm text-right">
          Blood group, allergies, and conditions are edited from a student's own profile in Student Management.
        </p>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No students match your search." pageSize={10} />
    </div>
  );
}
