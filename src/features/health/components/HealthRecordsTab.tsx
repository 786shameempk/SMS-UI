import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { formatRelativeDay } from "@/utils/format";
import { listHealthRecords } from "../api";
import type { HealthRecordRow } from "../types";

export default function HealthRecordsTab() {
  const { t } = useTranslation("health");
  const { data: records = [], isLoading, isError, refetch } = useQuery({ queryKey: ["health", "records"], queryFn: listHealthRecords });
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
      header: t("Student"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.original.student.firstName} {row.original.student.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.student.className} - {row.original.student.section} &middot; {row.original.student.admissionNumber}
          </p>
        </div>
      ),
    },
    {
      id: "bloodGroup",
      header: t("Blood group"),
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.student.medical.bloodGroup === "unknown" ? "—" : row.original.student.medical.bloodGroup}</span>,
    },
    {
      id: "allergies",
      header: t("Allergies"),
      cell: ({ row }) =>
        row.original.student.medical.allergies?.trim() ? (
          <Badge variant="warning">{row.original.student.medical.allergies}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">{t("None on file")}</span>
        ),
    },
    {
      id: "conditions",
      header: t("Ongoing conditions"),
      cell: ({ row }) =>
        row.original.student.medical.conditions?.trim() ? (
          <span className="text-sm text-foreground">{row.original.student.medical.conditions}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("None on file")}</span>
        ),
    },
    {
      id: "lastCheckup",
      header: t("Last checkup"),
      cell: ({ row }) =>
        row.original.lastCheckupDate ? (
          <span className="text-sm text-secondary-foreground">{formatRelativeDay(row.original.lastCheckupDate)}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("Never")}</span>
        ),
    },
    {
      id: "overdueVaccinations",
      header: t("Overdue vaccinations"),
      cell: ({ row }) =>
        row.original.overdueVaccinations > 0 ? (
          <Badge variant="danger">{row.original.overdueVaccinations}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">0</span>
        ),
    },
    {
      id: "visitsThisYear",
      header: t("Infirmary visits (this year)"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.visitCountThisYear}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search by name, class, or admission no.")} containerClassName="sm:w-72" />
        <p className="text-xs text-muted-foreground max-w-sm text-end">
          {t("Blood group, allergies, and conditions are edited from a student's own profile in Student Management.")}
        </p>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No students match your search.")} pageSize={10} />
    </div>
  );
}
