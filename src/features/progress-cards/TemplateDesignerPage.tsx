import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, EyeOff, GripVertical, Plus, Printer, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { copySystemTemplate, createTemplate, getSystemTemplate, getTemplate, updateTemplate } from "./api";
import { CardRenderer, MARK_COLUMN_KEYS, STUDENT_FIELD_KEYS, SUMMARY_FIELD_KEYS, columnLabel, studentFieldLabel, summaryFieldLabel } from "./CardRenderer";
import { printCards } from "./printCards";
import { SAMPLE_CARD } from "./sample";
import type { CardData, LayoutSection, SectionType, TemplateConfig, TemplateDetail } from "./types";

const BLANK: TemplateConfig = {
  page: { size: "A4", orientation: "portrait", margin: 12 },
  style: { font: "Arial", fontSize: 11, primary: "#1e3a8a", border: "#94a3b8", headerBg: "#f1f5f9" },
  sections: [
    { id: "header", type: "header", title: "", visible: true, props: { schoolName: "", address: "", affiliation: "", contact: "", logoUrl: "", showLogo: true, title: "Progress Card" } },
    { id: "student", type: "student", title: "Student details", visible: true, props: { fields: ["name", "admissionNumber", "class", "rollNumber"] } },
    { id: "marks", type: "marks", title: "Scholastic areas", visible: true, props: { columns: ["subject", "max", "marks", "grade"], showTotal: true } },
    { id: "signatures", type: "signatures", title: "", visible: true, props: { labels: ["Class Teacher", "Principal", "Parent / Guardian"] } },
  ],
};

const SECTION_NAMES: Record<SectionType, string> = {
  header: "School header", student: "Student details", marks: "Marks table", summary: "Result summary", attendance: "Attendance", coscholastic: "Co-scholastic / activities",
  remarks: "Remarks", text: "Custom text or notes", signatures: "Signature areas", table: "Custom table",
};

const FONTS = ["Arial", "Georgia", "Times New Roman", "Verdana", "Tahoma", "Trebuchet MS", "Courier New"];

const DEFAULT_PROPS: Partial<Record<SectionType, Record<string, unknown>>> = {
  header: { schoolName: "", address: "", affiliation: "", contact: "", logoUrl: "", showLogo: true, title: "Progress Card" },
  student: { fields: ["name", "admissionNumber", "class"] },
  marks: { columns: ["subject", "max", "marks", "grade"], showTotal: true },
  summary: { fields: ["total", "percentage", "grade", "result"] },
  coscholastic: { items: ["Art education", "Discipline"] },
  text: { text: "" },
  table: { headers: ["Column 1", "Column 2"], rows: [["", ""]] },
  signatures: { labels: ["Class Teacher", "Principal", "Parent / Guardian"] },
};

const lines = (v: unknown): string => (Array.isArray(v) ? v.join("\n") : "");
const fromLines = (s: string): string[] => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Toggle({ keys, labelOf, value, onChange }: { keys: string[]; labelOf: (k: string) => string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map((k) => {
        const on = value.includes(k);
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== k) : keys.filter((x) => x === k || value.includes(x)))}
            className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary-text" : "border-border text-muted-foreground"}`}
          >
            {labelOf(k)}
          </button>
        );
      })}
    </div>
  );
}

export default function TemplateDesignerPage() {
  const { t } = useTranslation("progress-cards");
  const { id, key } = useParams<{ id?: string; key?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const readOnly = Boolean(key);
  const isNew = !id && !key;

  const detail = useQuery<TemplateDetail | null>({
    queryKey: ["progress-cards", "template", id ?? key ?? "new"],
    queryFn: async () => (key ? getSystemTemplate(key) : id ? getTemplate(id) : null),
  });

  const [config, setConfig] = useState<TemplateConfig>(BLANK);
  const [meta, setMeta] = useState({ name: "", board: "Custom", category: "", classFrom: "", classTo: "", description: "", note: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (!detail.data) return;
    setConfig(detail.data.config);
    const s = detail.data.summary;
    setMeta({ name: s.name, board: s.board, category: s.category ?? "", classFrom: s.classFrom?.toString() ?? "", classTo: s.classTo?.toString() ?? "", description: s.description ?? "", note: "" });
  }, [detail.data]);

  const sample: CardData = useMemo(() => SAMPLE_CARD, []);
  const fieldLabel = (k: string) => (current?.type === "summary" ? summaryFieldLabel(k) : studentFieldLabel(k));
  const current = config.sections.find((s) => s.id === selected) ?? null;

  const patchSection = (sid: string, patch: Partial<LayoutSection>) => setConfig((c) => ({ ...c, sections: c.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }));
  const patchProps = (sid: string, props: Record<string, unknown>) =>
    setConfig((c) => ({ ...c, sections: c.sections.map((s) => (s.id === sid ? { ...s, props: { ...s.props, ...props } } : s)) }));
  const move = (from: number, to: number) =>
    setConfig((c) => {
      if (to < 0 || to >= c.sections.length) return c;
      const next = [...c.sections];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return { ...c, sections: next };
    });
  const addSection = (type: SectionType) => {
    const sid = `${type}-${Math.random().toString(36).slice(2, 7)}`;
    setConfig((c) => ({ ...c, sections: [...c.sections, { id: sid, type, title: type === "header" || type === "signatures" ? "" : SECTION_NAMES[type], visible: true, props: { ...(DEFAULT_PROPS[type] ?? {}) } }] }));
    setSelected(sid);
  };

  const input = () => ({
    name: meta.name.trim(), board: meta.board.trim() || "Custom", category: meta.category.trim() || null, description: meta.description.trim() || null,
    classFrom: meta.classFrom ? Number(meta.classFrom) : null, classTo: meta.classTo ? Number(meta.classTo) : null, note: meta.note.trim() || null, config,
  });

  const save = useMutation({
    mutationFn: () => (id ? updateTemplate(id, input()) : createTemplate(input())),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["progress-cards"] });
      toast.success(id ? t("Saved as version {{v}}", { v: saved.summary.version }) : t("Template created"));
      if (!id && saved.summary.id) navigate(`/progress-cards/templates/${saved.summary.id}`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const copy = useMutation({
    mutationFn: () => copySystemTemplate(key as string),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["progress-cards"] });
      toast.success(t("Copied to your school. You can now edit it."));
      navigate(`/progress-cards/templates/${saved.summary.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading) return <PageContainer><LoadingState /></PageContainer>;
  if (detail.error) return <PageContainer><ErrorState /></PageContainer>;

  const updateStyle = (patch: Partial<TemplateConfig["style"]>) => setConfig((c) => ({ ...c, style: { ...c.style, ...patch } }));
  const updatePage = (patch: Partial<TemplateConfig["page"]>) => setConfig((c) => ({ ...c, page: { ...c.page, ...patch } }));
  const p = current?.props ?? {};

  return (
    <PageContainer width="full">
      <PageHeader
        eyebrow={<Link to="/progress-cards?tab=templates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Template library</Link>}
        title={isNew ? t("New progress card template") : meta.name || t("Template")}
        description={readOnly ? t("Built-in template. It cannot be edited; copy it to your school to customise it.") : t("Arrange sections, choose fields and style the card. The preview updates as you edit.")}
        actions={
          <>
            <Button variant="outline" onClick={() => printCards(config, [sample], t("Sample progress card"))}><Printer className="h-4 w-4" /> {t("Print sample")}</Button>
            {readOnly
              ? <Button onClick={() => copy.mutate()} loading={copy.isPending}><Copy className="h-4 w-4" /> {t("Copy to my school")}</Button>
              : <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!meta.name.trim()}><Save className="h-4 w-4" /> {id ? t("Save new version") : t("Create template")}</Button>}
          </>
        }
      />
      {detail.data && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={readOnly ? "neutral" : "brand"}>{detail.data.summary.type === "System" ? t("Built-in") : t("School template")}</Badge>
          <span className="text-muted-foreground">{t("Version")} {detail.data.summary.version}</span>
          {detail.data.summary.guidelineYear && <span className="text-muted-foreground">{t("Pattern year")} {detail.data.summary.guidelineYear}</span>}
          {readOnly && <span className="text-warning-text">{t("Layout only. Grade boundaries come from your confirmed grading scheme, not from this template.")}</span>}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("Template")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="pc-name">{t("Name")}</Label><Input id="pc-name" value={meta.name} disabled={readOnly} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="pc-board">{t("Board")}</Label><Input id="pc-board" value={meta.board} disabled={readOnly} onChange={(e) => setMeta({ ...meta, board: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="pc-cat">{t("Category")}</Label><Input id="pc-cat" value={meta.category} disabled={readOnly} onChange={(e) => setMeta({ ...meta, category: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="pc-from">{t("Class from")}</Label><Input id="pc-from" type="number" min={1} max={12} value={meta.classFrom} disabled={readOnly} onChange={(e) => setMeta({ ...meta, classFrom: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="pc-to">{t("Class to")}</Label><Input id="pc-to" type="number" min={1} max={12} value={meta.classTo} disabled={readOnly} onChange={(e) => setMeta({ ...meta, classTo: e.target.value })} /></div>
              </div>
              {!readOnly && id && <div className="space-y-1.5"><Label htmlFor="pc-note">{t("What changed (version note)")}</Label><Input id="pc-note" value={meta.note} onChange={(e) => setMeta({ ...meta, note: e.target.value })} /></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("Page and style")}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t("Page size")}</Label>
                <NativeSelect className="w-full" value={config.page.size} disabled={readOnly} onChange={(e) => updatePage({ size: e.target.value as "A4" | "A5" })}><option value="A4">{t("A4")}</option><option value="A5">{t("A5")}</option></NativeSelect></div>
              <div className="space-y-1.5"><Label>{t("Orientation")}</Label>
                <NativeSelect className="w-full" value={config.page.orientation} disabled={readOnly} onChange={(e) => updatePage({ orientation: e.target.value as "portrait" | "landscape" })}><option value="portrait">{t("Portrait")}</option><option value="landscape">{t("Landscape")}</option></NativeSelect></div>
              <div className="space-y-1.5"><Label>{t("Font")}</Label>
                <NativeSelect className="w-full" value={config.style.font} disabled={readOnly} onChange={(e) => updateStyle({ font: e.target.value })}>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</NativeSelect></div>
              <div className="space-y-1.5"><Label htmlFor="pc-fs">{t("Font size (px)")}</Label><Input id="pc-fs" type="number" min={8} max={16} value={config.style.fontSize} disabled={readOnly} onChange={(e) => updateStyle({ fontSize: Math.min(16, Math.max(8, Number(e.target.value) || 11)) })} /></div>
              <div className="space-y-1.5"><Label htmlFor="pc-margin">{t("Margin (mm)")}</Label><Input id="pc-margin" type="number" min={4} max={30} value={config.page.margin} disabled={readOnly} onChange={(e) => updatePage({ margin: Math.min(30, Math.max(4, Number(e.target.value) || 12)) })} /></div>
              <div className="space-y-1.5"><Label htmlFor="pc-primary">{t("Accent colour")}</Label><Input id="pc-primary" type="color" value={config.style.primary} disabled={readOnly} onChange={(e) => updateStyle({ primary: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="pc-border">{t("Border colour")}</Label><Input id="pc-border" type="color" value={config.style.border} disabled={readOnly} onChange={(e) => updateStyle({ border: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="pc-hbg">{t("Table header background")}</Label><Input id="pc-hbg" type="color" value={config.style.headerBg} disabled={readOnly} onChange={(e) => updateStyle({ headerBg: e.target.value })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("Sections")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("Drag to reorder, or use the arrows. Click a section to edit it.")}</p>
              <ul className="space-y-1.5">
                {config.sections.map((s, i) => (
                  <li
                    key={s.id}
                    draggable={!readOnly}
                    onDragStart={() => setDragId(s.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragId) move(config.sections.findIndex((x) => x.id === dragId), i); setDragId(null); }}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm ${selected === s.id ? "border-primary bg-primary/5" : "border-border"} ${s.visible ? "" : "opacity-50"}`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <button type="button" className="min-w-0 flex-1 truncate text-start" onClick={() => setSelected(s.id)}>{s.title || t(SECTION_NAMES[s.type])}</button>
                    {!readOnly && (
                      <>
                        <Button variant="ghost" size="icon-sm" aria-label={t("Move up")} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label={t("Move down")} disabled={i === config.sections.length - 1} onClick={() => move(i, i + 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label={s.visible ? t("Hide section") : t("Show section")} onClick={() => patchSection(s.id, { visible: !s.visible })}>{s.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</Button>
                        <Button variant="ghost" size="icon-sm" aria-label={t("Remove section")} onClick={() => { setConfig((c) => ({ ...c, sections: c.sections.filter((x) => x.id !== s.id) })); if (selected === s.id) setSelected(null); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {!readOnly && (
                <div className="flex items-center gap-2 pt-1">
                  <NativeSelect className="w-full" value="" onChange={(e) => e.target.value && addSection(e.target.value as SectionType)} aria-label={t("Add section")}>
                    <option value="">{t("Add a section…")}</option>
                    {(Object.keys(SECTION_NAMES) as SectionType[]).map((k) => <option key={k} value={k}>{t(SECTION_NAMES[k])}</option>)}
                  </NativeSelect>
                  <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
              )}
            </CardContent>
          </Card>

          {current && (
            <Card>
              <CardHeader><CardTitle>{t(SECTION_NAMES[current.type])}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {current.type !== "header" && current.type !== "signatures" && (
                  <div className="space-y-1.5"><Label htmlFor="sec-title">{t("Heading")}</Label><Input id="sec-title" value={current.title} disabled={readOnly} onChange={(e) => patchSection(current.id, { title: e.target.value })} /></div>
                )}
                {current.type === "header" && (
                  <>
                    {([["schoolName", t("School name")], ["address", t("Address")], ["affiliation", t("Affiliation / recognition")], ["contact", t("Contact details")], ["logoUrl", t("Logo image address")], ["title", t("Card title")]] as const).map(([k, label]) => (
                      <div key={k} className="space-y-1.5"><Label htmlFor={`h-${k}`}>{label}</Label><Input id={`h-${k}`} value={typeof p[k] === "string" ? (p[k] as string) : ""} disabled={readOnly} onChange={(e) => patchProps(current.id, { [k]: e.target.value })} /></div>
                    ))}
                  </>
                )}
                {current.type === "student" && (
                  <>
                    <Label>{t("Fields")}</Label>
                    <Toggle keys={STUDENT_FIELD_KEYS} labelOf={(k) => fieldLabel(k)} value={(p.fields as string[]) ?? []} onChange={(v) => !readOnly && patchProps(current.id, { fields: v })} />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.showPhoto === true} disabled={readOnly} onChange={(e) => patchProps(current.id, { showPhoto: e.target.checked })} /> {t("Show student photo")}</label>
                  </>
                )}
                {current.type === "marks" && (
                  <>
                    <Label>{t("Columns")}</Label>
                    <Toggle keys={MARK_COLUMN_KEYS} labelOf={columnLabel} value={(p.columns as string[]) ?? []} onChange={(v) => !readOnly && patchProps(current.id, { columns: v })} />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.showTotal !== false} disabled={readOnly} onChange={(e) => patchProps(current.id, { showTotal: e.target.checked })} /> {t("Show total row")}</label>
                    <div className="space-y-1.5">
                      <Label>{t("Column widths (% of table; leave empty for automatic)")}</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {((p.columns as string[]) ?? []).map((c) => (
                          <div key={c} className="space-y-1"><span className="text-xs text-muted-foreground">{columnLabel(c)}</span>
                            <Input type="number" min={5} max={80} disabled={readOnly} value={((p.widths as Record<string, number>) ?? {})[c] ?? ""}
                              onChange={(e) => {
                                const w = { ...((p.widths as Record<string, number>) ?? {}) };
                                if (e.target.value) w[c] = Math.min(80, Math.max(5, Number(e.target.value))); else delete w[c];
                                patchProps(current.id, { widths: w });
                              }} /></div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {current.type === "summary" && (
                  <>
                    <Label>{t("Items")}</Label>
                    <Toggle keys={SUMMARY_FIELD_KEYS} labelOf={(k) => fieldLabel(k)} value={(p.fields as string[]) ?? []} onChange={(v) => !readOnly && patchProps(current.id, { fields: v })} />
                  </>
                )}
                {current.type === "coscholastic" && (
                  <div className="space-y-1.5"><Label htmlFor="co-items">{t("Areas (one per line)")}</Label><Textarea id="co-items" rows={6} disabled={readOnly} value={lines(p.items)} onChange={(e) => patchProps(current.id, { items: fromLines(e.target.value) })} /></div>
                )}
                {current.type === "text" && (
                  <div className="space-y-1.5"><Label htmlFor="tx">{t("Text")}</Label><Textarea id="tx" rows={5} disabled={readOnly} value={typeof p.text === "string" ? p.text : ""} onChange={(e) => patchProps(current.id, { text: e.target.value })} /></div>
                )}
                {current.type === "signatures" && (
                  <div className="space-y-1.5"><Label htmlFor="sg">{t("Signature labels (one per line)")}</Label><Textarea id="sg" rows={4} disabled={readOnly} value={lines(p.labels)} onChange={(e) => patchProps(current.id, { labels: fromLines(e.target.value) })} /></div>
                )}
                {current.type === "table" && (
                  <>
                    <div className="space-y-1.5"><Label htmlFor="tb-h">{t("Column headings (one per line)")}</Label><Textarea id="tb-h" rows={3} disabled={readOnly} value={lines(p.headers)} onChange={(e) => patchProps(current.id, { headers: fromLines(e.target.value) })} /></div>
                    <div className="space-y-1.5"><Label htmlFor="tb-r">{t("Rows (one per line, cells separated by |)")}</Label>
                      <Textarea id="tb-r" rows={4} disabled={readOnly} value={Array.isArray(p.rows) ? (p.rows as string[][]).map((r) => r.join(" | ")).join("\n") : ""}
                        onChange={(e) => patchProps(current.id, { rows: e.target.value.split("\n").filter((l) => l.trim()).map((l) => l.split("|").map((c) => c.trim())) })} /></div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {detail.data && detail.data.versions.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t("Version history")}</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {detail.data.versions.map((v) => (
                    <li key={v.version} className="flex justify-between gap-2">
                      <span>v{v.version}{v.note ? ` · ${v.note}` : ""}</span>
                      <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">{t("Cards already generated keep the version they were made with.")}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="min-w-0">
          <div className="sticky top-4 overflow-auto rounded-xl border border-border bg-muted/40 p-4" style={{ maxHeight: "calc(100vh - 6rem)" }}>
            <p className="mb-2 text-xs text-muted-foreground">{t("Live preview with sample data. Real cards use your school's examination results.")}</p>
            <div style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "fit-content" }}>
              <CardRenderer config={config} data={sample} selectedId={selected} onSelect={setSelected} />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
