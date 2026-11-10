import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Copy, FilePlus2, MoreHorizontal, Pencil, Play, Share2, Star, StarOff, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteCustomReport, duplicateCustomReport, getCustomReport, getDatasets, listCustomReports, renameCustomReport, setCustomDefault, setCustomFavourite,
} from "./api";
import ShareDialog from "./ShareDialog";
import SourceStep from "./steps/SourceStep";
import type { CustomReportSummary, ListScope, ReportShare } from "./types";

const fmt = (iso?: string | null) => (iso ? new Date(iso.endsWith("Z") ? iso : `${iso}Z`).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null);

/** Insights > Custom Report Generator: your reports, reports shared with you, favourites, and the way to start a new one. */
export default function CustomReportsHomePage() {
  const { t } = useTranslation("reports");
  const navigate = useNavigate();
  const [tab, setTab] = useState<"mine" | "new" | "shared" | "favourites">("mine");
  const datasets = useQuery({ queryKey: ["custom-datasets"], queryFn: getDatasets, staleTime: 60_000 });
  const all = useQuery({ queryKey: ["custom-reports", "all"], queryFn: () => listCustomReports("all") });
  const defaultReport = all.data?.find((r) => r.isDefault);

  return (
    <PageContainer>
      <PageHeader
        title={t("Custom Report Generator")}
        description={t("Build your own reports from your school's data: choose columns, filters, grouping and layout, then save, share and export them.")}
        actions={
          <div className="flex flex-wrap gap-2">
            {defaultReport && <Button type="button" variant="outline" onClick={() => navigate(`/custom-reports/${defaultReport.id}`)}><Play className="h-4 w-4" />{t("Run my default")}</Button>}
            <Button type="button" onClick={() => setTab("new")}><FilePlus2 className="h-4 w-4" />{t("Create new report")}</Button>
          </div>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList variant="line">
          <TabsTrigger value="mine">{t("My Custom Reports")}</TabsTrigger>
          <TabsTrigger value="new">{t("Create New Report")}</TabsTrigger>
          <TabsTrigger value="shared"><Users className="h-3.5 w-3.5" aria-hidden="true" />{t("Shared Reports")}</TabsTrigger>
          <TabsTrigger value="favourites"><Star className="h-3.5 w-3.5" aria-hidden="true" />{t("Favourite Reports")}</TabsTrigger>
        </TabsList>
        <TabsContent value="mine"><ReportList scope="mine" onCreate={() => setTab("new")} /></TabsContent>
        <TabsContent value="new">
          {datasets.isError ? (
            <ErrorState title={t("The data sources could not be loaded")} onRetry={() => void datasets.refetch()} />
          ) : datasets.isLoading ? (
            <PageSkeleton />
          ) : (
            <>
              {(datasets.data?.unavailable.length ?? 0) > 0 && (
                <p role="status" className="mb-3 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">{t("Some data sources could not be loaded just now ({{services}}). Try again in a moment.", { services: datasets.data!.unavailable.join(", ") })}</p>
              )}
              <SourceStep datasets={datasets.data?.datasets ?? []} selected={null} onSelect={(key) => navigate(`/custom-reports/new?source=${encodeURIComponent(key)}`)} />
            </>
          )}
        </TabsContent>
        <TabsContent value="shared"><ReportList scope="shared" onCreate={() => setTab("new")} /></TabsContent>
        <TabsContent value="favourites"><ReportList scope="favourites" onCreate={() => setTab("new")} /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function ReportList({ scope, onCreate }: { scope: ListScope; onCreate: () => void }) {
  const { t } = useTranslation("reports");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["custom-reports", scope], queryFn: () => listCustomReports(scope) });
  const [renaming, setRenaming] = useState<CustomReportSummary | null>(null);
  const [deleting, setDeleting] = useState<CustomReportSummary | null>(null);
  const [sharing, setSharing] = useState<{ report: CustomReportSummary; shares: ReportShare[] } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["custom-reports"] });
  const fail = (err: unknown) => toast.error(err instanceof Error ? err.message : t("That did not work."));
  const favourite = useMutation({ mutationFn: (r: CustomReportSummary) => setCustomFavourite(r.id, !r.isFavourite), onSuccess: refresh, onError: fail });
  const makeDefault = useMutation({ mutationFn: (r: CustomReportSummary) => setCustomDefault(r.id, !r.isDefault), onSuccess: refresh, onError: fail });
  const duplicate = useMutation({
    mutationFn: (r: CustomReportSummary) => duplicateCustomReport(r.id),
    onSuccess: (copy) => { toast.success(t("Copied as “{{name}}”", { name: copy.summary.name })); void refresh(); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (r: CustomReportSummary) => deleteCustomReport(r.id),
    onSuccess: () => { toast.success(t("Report deleted")); setDeleting(null); void refresh(); },
    onError: fail,
  });

  async function openShare(report: CustomReportSummary) {
    try {
      const detail = await getCustomReport(report.id);
      setSharing({ report, shares: detail.shares });
    } catch (err) {
      fail(err);
    }
  }

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState title={t("Your reports could not be loaded")} description={(query.error as Error).message} onRetry={() => void query.refetch()} />;
  const reports = query.data ?? [];

  if (reports.length === 0) {
    const copy: Record<ListScope, { title: string; description: string }> = {
      mine: { title: t("You haven't saved a report yet"), description: t("Create one in a few steps. Choose a data source, pick the columns, add filters, then save it to run again any time.") },
      shared: { title: t("Nothing has been shared with you"), description: t("Reports other people share with you, directly or through your role, appear here.") },
      favourites: { title: t("No favourites yet"), description: t("Star a report to find it quickly here.") },
      all: { title: "", description: "" },
    };
    return <EmptyState title={copy[scope].title} description={copy[scope].description} action={scope === "mine" ? <Button type="button" onClick={onCreate}><FilePlus2 className="h-4 w-4" />{t("Create new report")}</Button> : undefined} />;
  }

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={t("Reports")}>
        {reports.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/custom-reports/${r.id}`} className="block truncate font-medium hover:underline">{r.name}</Link>
                <p className="truncate text-xs text-muted-foreground">{r.datasetTitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => favourite.mutate(r)} aria-pressed={r.isFavourite} aria-label={r.isFavourite ? t("Remove {{name}} from favourites", { name: r.name }) : t("Add {{name}} to favourites", { name: r.name })}>
                  <Star className={r.isFavourite ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4"} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label={t("More actions for {{name}}", { name: r.name })}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => navigate(`/custom-reports/${r.id}`)}><Play className="h-4 w-4" />{t("Run")}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`/custom-reports/${r.id}/edit`)}><Pencil className="h-4 w-4" />{r.canEdit ? t("Edit") : t("Open in builder")}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => duplicate.mutate(r)}><Copy className="h-4 w-4" />{t("Duplicate")}</DropdownMenuItem>
                    {r.canEdit && <DropdownMenuItem onSelect={() => setRenaming(r)}><Pencil className="h-4 w-4" />{t("Rename")}</DropdownMenuItem>}
                    <DropdownMenuItem onSelect={() => makeDefault.mutate(r)}>{r.isDefault ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}{r.isDefault ? t("Remove as my default") : t("Set as my default")}</DropdownMenuItem>
                    {r.isOwner && <DropdownMenuItem onSelect={() => void openShare(r)}><Share2 className="h-4 w-4" />{t("Share…")}</DropdownMenuItem>}
                    {r.isOwner && <DropdownMenuSeparator />}
                    {r.isOwner && <DropdownMenuItem onSelect={() => setDeleting(r)} className="text-destructive-strong"><Trash2 className="h-4 w-4" />{t("Delete")}</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {r.description && <p className="line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
            <div className="flex flex-wrap items-center gap-1.5">
              {r.isDefault && <Badge variant="brand">{t("Default")}</Badge>}
              {r.visibility === "Shared" && <Badge variant="info">{r.isOwner ? t("Shared with {{n}}", { n: r.shareCount }) : t("Shared with you")}</Badge>}
              {!r.isOwner && <Badge variant="neutral">{r.canEdit ? t("Can edit") : t("Run only")}</Badge>}
            </div>
            <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <dt>{t("Owner")}</dt><dd className="truncate text-foreground">{r.isOwner ? t("You") : (r.ownerName ?? "–")}</dd>
              <dt>{t("Last generated")}</dt><dd className="text-foreground">{fmt(r.lastRunAt) ?? t("Never")}</dd>
              <dt>{t("Runs")}</dt><dd className="text-foreground tabular-nums">{r.runCount}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <RenameDialog report={renaming} onClose={() => setRenaming(null)} onDone={() => { setRenaming(null); void refresh(); }} />
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Delete this report?")}</DialogTitle>
            <DialogDescription>{t("“{{name}}” will be deleted for you and for everyone it is shared with. This cannot be undone.", { name: deleting?.name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>{t("Cancel")}</Button>
            <Button type="button" variant="destructive" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>{t("Delete report")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ShareDialog report={sharing?.report ?? null} initialShares={sharing?.shares ?? []} onClose={() => setSharing(null)} />
    </>
  );
}

function RenameDialog({ report, onClose, onDone }: { report: CustomReportSummary | null; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation("reports");
  const [name, setName] = useState("");
  const [seen, setSeen] = useState<string | null>(null);
  if (report && seen !== report.id) { setSeen(report.id); setName(report.name); }
  const rename = useMutation({
    mutationFn: () => renameCustomReport(report!.id, name.trim()),
    onSuccess: () => { toast.success(t("Renamed")); onDone(); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t("It could not be renamed.")),
  });
  return (
    <Dialog open={report !== null} onOpenChange={(o) => { if (!o) { setSeen(null); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) rename.mutate(); }} className="space-y-4">
          <DialogHeader><DialogTitle>{t("Rename report")}</DialogTitle></DialogHeader>
          <FormField label={t("Report name")} htmlFor="cr-rename" required>
            <Input id="cr-rename" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} autoFocus />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("Cancel")}</Button>
            <Button type="submit" disabled={!name.trim()} loading={rename.isPending}>{t("Rename")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
