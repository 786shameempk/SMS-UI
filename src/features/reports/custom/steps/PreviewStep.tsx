import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Columns3, Filter, ListOrdered, Play, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { accessFor, previewReport } from "../api";
import { sendableDefinition, stepProblem, type WizardStep } from "../definition";
import OutputActions from "../OutputActions";
import ResultTable from "../ResultTable";
import type { CustomReportDefinition, DatasetCatalog, DatasetDescriptor } from "../types";

interface Props {
  dataset: DatasetDescriptor;
  catalog: DatasetCatalog;
  definition: CustomReportDefinition;
  title: string;
  yearName?: string | null;
  onEdit: (step: WizardStep) => void;
}

/**
 * Step 6: the interactive preview (server-paged, with totals over every matching record), then Generate, which shows
 * the finished report with its header and unlocks Export, PDF and Print.
 */
export default function PreviewStep({ dataset, catalog, definition, title, yearName, onEdit }: Props) {
  const { t } = useTranslation("reports");
  const branding = useTenantBranding();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [generated, setGenerated] = useState<Date | null>(null);

  const access = accessFor(catalog, dataset);
  const send = sendableDefinition(definition, dataset.fields);
  const problem = stepProblem("columns", { datasetKey: dataset.key, definition: send, fields: dataset.fields });
  const key = JSON.stringify(send);
  const query = useQuery({
    queryKey: ["custom-report-preview", dataset.service, dataset.key, key, page, pageSize],
    queryFn: ({ signal }) => previewReport(dataset.key, JSON.parse(key) as CustomReportDefinition, page, pageSize, signal, undefined, dataset.service),
    enabled: problem === null,
    placeholderData: (previous) => previous,
    retry: false,
  });
  const s = definition.settings;
  const reportTitle = s.title?.trim() || title || dataset.title;

  const counts = [
    { step: "columns" as const, icon: Columns3, text: t("Columns: {{n}}", { n: send.columns.filter((c) => c.visible).length }) },
    { step: "filters" as const, icon: Filter, text: t("Filters: {{n}}", { n: send.filters.length }) },
    { step: "group" as const, icon: ListOrdered, text: send.groupBy.length ? t("Grouped by: {{n}}", { n: send.groupBy.length }) : t("Sort levels: {{n}}", { n: send.sort.length }) },
    { step: "settings" as const, icon: Settings2, text: `${s.pageSize} ${s.orientation === "landscape" ? t("landscape") : t("portrait")}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t("Preview and generate")}</h2>
          <p className="text-sm text-muted-foreground">{t("Check the records, change anything that is not right, then generate the report.")}</p>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label={t("Report summary")}>
          {counts.map(({ step, icon: Icon, text }) => (
            <li key={step}>
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(step)}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{text}</Button>
            </li>
          ))}
        </ul>
      </div>

      {problem ? (
        <p role="alert" className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">{t(problem)}</p>
      ) : (
        <>
          {generated && (
            <header className="space-y-1 rounded-xl border bg-card p-5 text-center">
              {s.logoUrl === "school" && branding?.logoUrl && <img src={branding.logoUrl} alt="" className="mx-auto mb-1 max-h-14 max-w-40 object-contain" />}
              {branding?.name && <p className="text-sm font-semibold">{branding.name}</p>}
              {s.header && <p className="text-sm font-medium">{s.header}</p>}
              <h3 className="text-lg font-bold uppercase tracking-wide">{reportTitle}</h3>
              {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
              <p className="text-xs text-muted-foreground">
                {[
                  s.showTotalCount && query.data ? t("{{n}} records", { n: query.data.total.toLocaleString() }) : null,
                  yearName ? t("Academic year {{name}}", { name: yearName }) : null,
                  s.dateFrom || s.dateTo ? `${s.dateFrom ?? "…"} – ${s.dateTo ?? "…"}` : null,
                  s.showGeneratedAt ? t("Generated {{when}}", { when: generated.toLocaleString() }) : null,
                ].filter(Boolean).join("  ·  ")}
              </p>
            </header>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {generated ? (
              <p className="flex items-center gap-1.5 text-sm text-success-strong"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{t("Report generated. Export or print it below.")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("This is a preview. Generate the report to export or print it.")}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => { setGenerated(new Date()); void query.refetch(); }} disabled={query.isFetching && !query.data}>
                <Play className="h-4 w-4" aria-hidden="true" />{generated ? t("Generate again") : t("Generate report")}
              </Button>
              {generated && (
                <OutputActions
                  source={{ kind: "draft", datasetKey: dataset.key, definition: send, service: dataset.service }}
                  title={reportTitle}
                  definition={send}
                  fields={dataset.fields}
                  yearName={yearName}
                  canExport={access.canExport}
                  canPrint={access.canPrint}
                  fetchPage={(p, size) => previewReport(dataset.key, send, p, size, undefined, "print", dataset.service)}
                />
              )}
            </div>
          </div>

          <ResultTable
            data={query.data}
            loading={query.isFetching}
            error={query.isError ? (query.error instanceof Error ? query.error.message : t("The report could not be run.")) : null}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(n) => { setPageSize(n); setPage(1); }}
            onRetry={() => void query.refetch()}
            showTotalCount={s.showTotalCount}
          />
        </>
      )}
    </div>
  );
}
