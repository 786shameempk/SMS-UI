import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatRelativeDay } from "@/utils/format";
import { getGstSummary } from "../api";

export default function GstTab() {
  const { data, isLoading } = useQuery({ queryKey: ["accounting", "gst"], queryFn: getGstSummary });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  const netLabel = data.netPayable >= 0 ? "Net payable" : "Net refundable";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Output tax collected</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{formatCurrency(data.outputTax)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <ArrowUpCircle className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Input tax credit</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{formatCurrency(data.inputTax)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ArrowDownCircle className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{netLabel}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{formatCurrency(Math.abs(data.netPayable))}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Receipt className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taxable entries</CardTitle>
          <CardDescription>Journal entries tagged as GST-applicable, posted to the ledger.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.entries.length === 0 && <p className="text-sm text-muted-foreground">No GST-applicable entries yet.</p>}
          {data.entries.map((e) => (
            <div key={e.entryId} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{e.narration}</p>
                <p className="text-xs text-slate-500 truncate">
                  {e.entryNumber} &middot; {formatRelativeDay(e.date)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={e.direction === "output" ? "success" : "info"}>{e.direction === "output" ? "Output" : "Input"}</Badge>
                <span className="text-sm font-medium text-slate-800 tabular-nums">{formatCurrency(e.taxAmount)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
