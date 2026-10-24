import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { getUserLinkedStudents } from "../api";

/** The students this login is mapped to: a parent's children (one row per guardian link), or a student's own record. */
export default function UserStudentsTab({ userId, isParent }: { userId: string; isParent: boolean }) {
  const { t } = useTranslation("administration");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "users", userId, "students"],
    queryFn: () => getUserLinkedStudents(userId),
  });

  if (isLoading) return <LoadingState label={t("Loading students…")} />;
  if (isError) return <ErrorState bare title={t("Could not load students")} description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        bare
        icon={GraduationCap}
        title={t("No students mapped")}
        description={
          isParent
            ? t("Link this login on a student's profile (Login accounts, on the guardian row) and the child will appear here.")
            : t("No student record is linked to this login.")
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.length === 1 ? t("{{count}} student mapped to this login. Change a link from the student's profile.", { count: data.length }) : t("{{count}} students mapped to this login. Change a link from the student's profile.", { count: data.length })}
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {data.map((s) => (
          <li key={`${s.studentId}-${s.guardianId ?? "self"}`} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <Link to={`/students/${s.studentId}`} className="block truncate text-sm font-medium text-foreground underline-offset-2 hover:underline">
                {s.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{s.classLabel || t("No class")}</p>
            </div>
            <Badge variant="neutral">{s.relation}</Badge>
            <StatusBadge status={s.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
