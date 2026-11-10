import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ArrowLeft, Copy, Pencil, RefreshCw, Share2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { listAcademicYears } from "@/features/academics/api";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { accessFor, duplicateCustomReport, getCustomReport, getDatasets, previewReport, recordCustomRun, runSavedReport, setCustomFavourite } from "./api";
import { normaliseDefinition } from "./definition";
import OutputActions from "./OutputActions";
import ResultTable from "./ResultTable";
import ShareDialog from "./ShareDialog";

/** Runs a saved report for the signed-in person (server-paged), with export, print, favourite, share and edit. */
export default function CustomReportRunPage() {
  const { t } = useTranslation("reports");
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const branding = useTenantBranding();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sharing, setSharing] = useState(false);

  const detail = useQuery({ queryKey: ["custom-report", id], queryFn: () => getCustomReport(id) });
  const catalog = useQuery({ queryKey: ["custom-datasets"], queryFn: getDatasets, staleTime: 60_000 });
  const years = useQuery({ queryKey: ["academic-years"], queryFn: listAcademicYears, staleTime: 5 * 60_000 });
  const dataset = catalog.data?.datasets.find((d) => d.key === detail.data?.summary.datasetKey);
  // A report on another service's data is stored here but run there; the run is then recorded with the service that keeps the report.
  const remote = Boolean(dataset?.service && dataset.service !== "academic");
  const result = useQuery({
    queryKey: ["custom-report-run", id, page, pageSize, dataset?.service],
    queryFn: ({ signal }) => (remote
      ? previewReport(dataset!.key, normaliseDefinition(detail.data!.definition), page, pageSize, signal, undefined, dataset!.service)
      : runSavedReport(id, page, pageSize, signal)),
    enabled: detail.isSuccess && catalog.isSuccess && Boolean(dataset),
    placeholderData: (previous) => previous,
    retry: false,
    staleTime: 0,
  });

  const recorded = useRef(false);
  useEffect(() => {
    if (!remote || !result.isSuccess || recorded.current) return;
    recorded.current = true;
    void recordCustomRun(id, "run").then(() => queryClient.invalidateQueries({ queryKey: ["custom-report", id] })).catch(() => undefined);
  }, [remote, result.isSuccess, id, queryClient]);

  const favourite = useMutation({
    mutationFn: () => setCustomFavourite(id, !detail.data!.summary.isFavourite),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["custom-report", id] }); void queryClient.invalidateQueries({ queryKey: ["custom-reports"] }); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t("That did not work.")),
  });
  const copy = useMutation({
    mutationFn: () => duplicateCustomReport(id),
    onSuccess: (c) => { toast.success(t("Copied as “{{name}}”", { name: c.summary.name })); void queryClient.invalidateQueries({ queryKey: ["custom-reports"] }); navigate(`/custom-reports/${c.summary.id}/edit`); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t("That did not work.")),
  });

  if (detail.isLoading) return <PageContainer><PageSkeleton /></PageContainer>;
  if (detail.isError || !detail.data) {
    return (
      <PageContainer>
        <ErrorState title={t("This report could not be opened")} description={detail.error instanceof Error ? detail.error.message : t("It may have been deleted, or it is not shared with you.")} onRetry={() => void detail.refetch()} />
        <Button type="button" variant="outline" onClick={() => navigate("/custom-reports")}><ArrowLeft className="h-4 w-4" />{t("All reports")}</Button>
      </PageContainer>
    );
  }

  const { summary } = detail.data;
  const definition = normaliseDefinition(detail.data.definition);
  const fields = dataset?.fields ?? [];
  const access = catalog.data ? accessFor(catalog.data, dataset) : { canExport: false, canPrint: false, canSeeSensitive: false };
  const settings = definition.settings;
  const title = settings.title?.trim() || summary.name;
  const yearName = years.data?.find((y) => y.id === settings.academicYearId)?.name ?? null;
  const data = result.data;
  const sourceMissing = catalog.isSuccess && !dataset;

  return (
    <PageContainer>
      <Link to="/custom-reports" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("All reports")}</Link>
      <PageHeader
        title={summary.name}
        description={summary.description || summary.datasetTitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => favourite.mutate()} aria-pressed={summary.isFavourite}>
              <Star className={summary.isFavourite ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4"} />{summary.isFavourite ? t("Favourite") : t("Add to favourites")}
            </Button>
            {summary.isOwner && <Button type="button" variant="outline" size="sm" onClick={() => setSharing(true)}><Share2 className="h-4 w-4" />{t("Share")}</Button>}
            <Button type="button" variant="outline" size="sm" onClick={() => copy.mutate()} loading={copy.isPending}><Copy className="h-4 w-4" />{t("Duplicate")}</Button>
            <Button type="button" size="sm" onClick={() => navigate(`/custom-reports/${id}/edit`)}><Pencil className="h-4 w-4" />{summary.canEdit ? t("Edit") : t("Open in builder")}</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="neutral">{summary.datasetTitle}</Badge>
        {summary.isDefault && <Badge variant="brand">{t("Default")}</Badge>}
        {summary.visibility === "Shared" && <Badge variant="info">{t("Shared")}</Badge>}
        <span>{t("Owner")}: {summary.isOwner ? t("You") : (summary.ownerName ?? "–")}</span>
        {data && <span>{t("Generated {{when}}", { when: new Date(data.generatedAtUtc.endsWith("Z") ? data.generatedAtUtc : `${data.generatedAtUtc}Z`).toLocaleString() })}</span>}
      </div>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6" aria-label={title}>
        <header className="space-y-0.5 text-center">
          {settings.logoUrl === "school" && branding?.logoUrl && <img src={branding.logoUrl} alt="" className="mx-auto mb-1 max-h-14 max-w-40 object-contain" />}
          {branding?.name && <p className="text-sm font-semibold">{branding.name}</p>}
          {settings.header && <p className="text-sm font-medium">{settings.header}</p>}
          <h2 className="text-lg font-bold uppercase tracking-wide">{title}</h2>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <OutputActions
            source={remote ? { kind: "draft", datasetKey: summary.datasetKey, definition, service: dataset!.service, recordId: id } : { kind: "saved", id }}
            title={title}
            definition={definition}
            fields={fields}
            yearName={yearName}
            canExport={access.canExport}
            canPrint={access.canPrint}
            fetchPage={(p, size) => (remote ? previewReport(summary.datasetKey, definition, p, size, undefined, "print", dataset!.service) : runSavedReport(id, p, size, undefined, "print"))}
            disabled={!data}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void result.refetch()} loading={result.isFetching}>{!result.isFetching && <RefreshCw className="h-3.5 w-3.5" />}{t("Refresh")}</Button>
        </div>
        {sourceMissing ? (
          <ErrorState title={t("This report's data source is not available")} description={t("Your school's plan or your role does not include the module this report reads, or its service could not be reached just now.")} onRetry={() => void catalog.refetch()} />
        ) : (
        <ResultTable
          data={data}
          loading={result.isFetching}
          error={result.isError ? (result.error instanceof Error ? result.error.message : t("The report could not be run.")) : null}
          page={page}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(n) => { setPageSize(n); setPage(1); }}
          onRetry={() => void result.refetch()}
          showTotalCount={settings.showTotalCount}
        />
        )}
        {settings.footer && <p className="text-center text-xs text-muted-foreground">{settings.footer}</p>}
      </section>

      <ShareDialog report={sharing ? summary : null} initialShares={detail.data.shares} onClose={() => setSharing(false)} />
    </PageContainer>
  );
}
