import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { AUDIENCE_CONFIG, SURVEY_STATUS_CONFIG } from "../constants";
import { closeSurvey, createSurvey, deleteSurvey, listSurveys, publishSurvey } from "../api";
import type { SurveyRow } from "../types";
import SurveyFormDialog from "./SurveyFormDialog";
import SurveyResultsDialog from "./SurveyResultsDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function SurveysTab() {
  const queryClient = useQueryClient();
  const { data: surveys = [], isLoading, isError, refetch } = useQuery({ queryKey: ["surveys", "list"], queryFn: () => listSurveys() });
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurveyRow | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["surveys"] });

  const createMutation = useMutation({
    mutationFn: createSurvey,
    onSuccess: (survey) => {
      invalidate();
      toast.success(`"${survey.title}" saved as draft`);
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create survey"),
  });

  const publishMutation = useMutation({
    mutationFn: publishSurvey,
    onSuccess: () => {
      invalidate();
      toast.success("Survey published");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not publish survey"),
  });

  const closeMutation = useMutation({
    mutationFn: closeSurvey,
    onSuccess: () => {
      invalidate();
      toast.success("Survey closed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not close survey"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      invalidate();
      toast.success("Survey deleted");
      setDeleteTarget(null);
    },
  });

  const filtered = statusFilter === "all" ? surveys : surveys.filter((s) => s.status === statusFilter);

  const columns: ColumnDef<SurveyRow, unknown>[] = [
    {
      id: "title",
      header: "Survey",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.questions.length} question{row.original.questions.length === 1 ? "" : "s"}</p>
        </div>
      ),
    },
    {
      id: "audience",
      header: "Audience",
      cell: ({ row }) => <span className="text-sm text-foreground">{AUDIENCE_CONFIG[row.original.audience].label}</span>,
    },
    {
      id: "responseCount",
      header: "Responses",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{row.original.responseCount}</span>,
    },
    {
      accessorKey: "opensAt",
      header: "Opens",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatRelativeDay(row.original.opensAt)}</span>,
    },
    {
      id: "closesAt",
      header: "Closes",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.closesAt ? formatRelativeDay(row.original.closesAt) : "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={SURVEY_STATUS_CONFIG[row.original.status].variant}>{SURVEY_STATUS_CONFIG[row.original.status].label}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => setResultsId(s.id)}>
              <BarChart3 className="w-3.5 h-3.5" />
              View results
            </DropdownMenuItem>
            {s.status === "draft" && (
              <DropdownMenuItem onClick={() => publishMutation.mutate(s.id)}>Publish</DropdownMenuItem>
            )}
            {s.status === "published" && <DropdownMenuItem onClick={() => closeMutation.mutate(s.id)}>Close</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => setDeleteTarget(s)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(SURVEY_STATUS_CONFIG) as Array<keyof typeof SURVEY_STATUS_CONFIG>).map((s) => (
              <SelectItem key={s} value={s}>
                {SURVEY_STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New survey
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No surveys match your filter." pageSize={10} />

      <SurveyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <SurveyResultsDialog surveyId={resultsId} open={Boolean(resultsId)} onOpenChange={(v) => !v && setResultsId(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete survey"
        description={`Delete "${deleteTarget?.title}" and all of its responses? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
