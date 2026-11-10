import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Eye, FileText, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { downloadIssuePdf, getIssue, listMine } from "./api";
import { CardRenderer } from "./CardRenderer";
import { printCards } from "./printCards";
import type { IssueDetail } from "./types";

/** Parent and student view: only published cards of their own children, newest first, with PDF download and print. */
export default function MyProgressCardsPage() {
  const { t } = useTranslation("progress-cards");
  const mine = useQuery({ queryKey: ["progress-cards", "mine"], queryFn: listMine });
  const [open, setOpen] = useState<IssueDetail | null>(null);
  const show = async (id: string) => setOpen(await getIssue(id).catch((e: Error) => { toast.error(e.message); return null; }));
  const pdf = useMutation({ mutationFn: (v: { id: string; name: string }) => downloadIssuePdf(v.id, v.name), onError: (e: Error) => toast.error(e.message) });

  const byYear = (mine.data ?? []).reduce<Record<string, typeof mine.data>>((acc, c) => {
    const key = c.publishedAt ? new Date(c.publishedAt).getFullYear().toString() : "";
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  return (
    <PageContainer>
      <PageHeader title={t("Progress cards")} description={t("Published progress cards, newest first. Download a card as a PDF or print it.")} />
      {mine.isLoading ? <LoadingState /> : mine.error ? <ErrorState /> : (mine.data ?? []).length === 0 ? (
        <EmptyState icon={FileText} title={t("No progress cards yet")} description={t("Cards appear here once the school publishes them.")} />
      ) : (
        Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0])).map(([year, cards]) => (
          <section key={year} className="space-y-2">
            {year && <h2 className="text-sm font-semibold text-muted-foreground">{year}</h2>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(cards ?? []).map((c) => (
                <Card key={c.id}>
                  <CardHeader><CardTitle>{c.examName}</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>{c.studentName} · {c.className}</div>
                    <div className="text-muted-foreground">{t("Published")} {c.publishedAt ? new Date(c.publishedAt).toLocaleDateString() : ""}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => show(c.id)}><Eye className="h-4 w-4" /> {t("View")}</Button>
                      <Button size="sm" onClick={() => pdf.mutate({ id: c.id, name: `${c.studentName}-${c.examName}`.replace(/[^\w-]+/g, "-") })} loading={pdf.isPending && pdf.variables?.id === c.id}><Download className="h-4 w-4" /> PDF</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
      {open && (
        <Card>
          <CardHeader><CardTitle>{open.data.studentName} · {open.data.examName}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => !printCards(open.config, [open.data], `${open.data.studentName} - ${open.data.examName}`) && toast.error(t("Allow pop-ups to print."))}><Printer className="h-4 w-4" /> {t("Print")}</Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(null)}>{t("Close")}</Button>
            </div>
            <div className="overflow-auto rounded-xl border border-border bg-muted/40 p-3" style={{ maxHeight: "75vh" }}>
              <CardRenderer config={open.config} data={open.data} />
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
