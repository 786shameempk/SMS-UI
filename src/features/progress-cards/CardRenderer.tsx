import type { CSSProperties, ReactNode } from "react";
import { t } from "./t";
import type { CardData, CardSubject, LayoutSection, TemplateConfig } from "./types";

/**
 * Renders one progress card from a template layout and a card's data. Pure and inline-styled only, so the same markup is the live
 * preview, the print/PDF page and the parent's view, and a card generated against template version N always looks the same.
 */

export const PAGE_MM: Record<string, { w: number; h: number }> = { A4: { w: 210, h: 297 }, A5: { w: 148, h: 210 } };

const COLUMN_LABELS: Record<string, string> = {
  subject: "Subject", max: "Max marks", pass: "Pass marks", marks: "Marks obtained", percentage: "%", grade: "Grade", gradePoint: "Grade point",
  remarks: "Remarks", internal: "Internal", external: "External",
};

const STUDENT_FIELDS: Record<string, { label: string; value: (d: CardData) => string }> = {
  name: { label: "Student name", value: (d) => d.studentName },
  admissionNumber: { label: "Admission no.", value: (d) => d.admissionNumber },
  class: { label: "Class", value: (d) => [d.className, d.section].filter(Boolean).join(" - ") },
  rollNumber: { label: "Roll no.", value: (d) => d.rollNumber ?? "-" },
  dateOfBirth: { label: "Date of birth", value: (d) => d.dateOfBirth ?? "-" },
  guardian: { label: "Parent / guardian", value: (d) => d.guardian ?? "-" },
  academicYear: { label: "Academic year", value: (d) => d.academicYear ?? "-" },
};

const SUMMARY_FIELDS: Record<string, { label: string; value: (d: CardData) => string }> = {
  total: { label: "Total", value: (d) => `${d.total} / ${d.totalMax}` },
  percentage: { label: "Percentage", value: (d) => `${d.percentage}%` },
  grade: { label: "Grade", value: (d) => d.grade ?? "-" },
  gpa: { label: "Grade point average", value: (d) => (d.gpa == null ? "-" : String(d.gpa)) },
  rank: { label: "Rank", value: (d) => (d.rank > 0 ? `#${d.rank}` : "-") },
  classAverage: { label: "Class average", value: (d) => `${d.classAverage}%` },
  result: { label: "Result", value: (d) => t(d.result) },
};

export const STUDENT_FIELD_KEYS = Object.keys(STUDENT_FIELDS);
export const SUMMARY_FIELD_KEYS = Object.keys(SUMMARY_FIELDS);
export const MARK_COLUMN_KEYS = Object.keys(COLUMN_LABELS);
export const columnLabel = (key: string) => (COLUMN_LABELS[key] ? t(COLUMN_LABELS[key]) : key);
export const studentFieldLabel = (key: string) => t(STUDENT_FIELDS[key]?.label ?? key);
export const summaryFieldLabel = (key: string) => t(SUMMARY_FIELDS[key]?.label ?? key);

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

function cell(subject: CardSubject, col: string): string {
  switch (col) {
    case "subject": return subject.name + (subject.additional ? ` (${t("additional")})` : subject.optional ? ` (${t("optional")})` : "");
    case "remarks": return subject.remark ?? "";
    case "max": return String(subject.max);
    case "pass": return String(subject.passMarks);
    case "marks": return subject.absent ? t("Absent") : String(subject.obtained);
    case "percentage": return subject.absent ? "-" : String(subject.percentage);
    case "grade": return subject.grade ?? "-";
    case "gradePoint": return subject.gradePoint == null ? "-" : String(subject.gradePoint);
    case "internal": return subject.internalMax == null ? "-" : `${subject.internal ?? 0} / ${subject.internalMax}`;
    case "external": return subject.externalMax == null ? "-" : `${subject.external ?? 0} / ${subject.externalMax}`;
    default: return "";
  }
}

interface Props {
  config: TemplateConfig;
  data: CardData;
  /** Designer: highlight the selected section. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function CardRenderer({ config, data, selectedId, onSelect }: Props) {
  const page = PAGE_MM[config.page.size] ?? PAGE_MM.A4;
  const landscape = config.page.orientation === "landscape";
  const { style } = config;
  const widthMm = landscape ? page.h : page.w;
  const minHeightMm = landscape ? page.w : page.h;

  const root: CSSProperties = {
    width: `${widthMm}mm`, minHeight: `${minHeightMm}mm`, padding: `${config.page.margin}mm`, boxSizing: "border-box", background: "#fff", color: "#111827",
    fontFamily: `${style.font}, Arial, sans-serif`, fontSize: `${style.fontSize}px`, lineHeight: 1.4,
  };
  const border = `1px solid ${style.border}`;
  const th: CSSProperties = { border, padding: "4px 6px", background: style.headerBg, textAlign: "left", fontSize: "0.9em" };
  const td: CSSProperties = { border, padding: "4px 6px", verticalAlign: "top" };
  const heading = (text: string): ReactNode => text ? <div style={{ fontWeight: 700, color: style.primary, margin: "10px 0 4px", textTransform: "uppercase", letterSpacing: ".04em", fontSize: "0.95em" }}>{text}</div> : null;

  const renderSection = (s: LayoutSection): ReactNode => {
    const p = s.props;
    switch (s.type) {
      case "header": {
        const logo = str(p.logoUrl);
        return (
          <div style={{ textAlign: "center", borderBottom: `2px solid ${style.primary}`, paddingBottom: 8 }}>
            {p.showLogo !== false && logo && <img src={logo} alt="" style={{ maxHeight: 56, maxWidth: 160, objectFit: "contain" }} />}
            <div style={{ fontSize: "1.5em", fontWeight: 700, color: style.primary }}>{str(p.schoolName, t("School name"))}</div>
            {str(p.address) && <div style={{ fontSize: "0.9em", color: "#475569" }}>{str(p.address)}</div>}
            {str(p.affiliation) && <div style={{ fontSize: "0.9em", color: "#475569" }}>{str(p.affiliation)}</div>}
            {str(p.contact) && <div style={{ fontSize: "0.9em", color: "#475569" }}>{str(p.contact)}</div>}
            <div style={{ marginTop: 6, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
              {str(p.title, t("Progress Card"))} - {data.examName}{data.academicYear ? ` (${data.academicYear})` : ""}
            </div>
          </div>
        );
      }
      case "student": {
        const keys = strings(p.fields).filter((k) => STUDENT_FIELDS[k]);
        return (
          <div>
            {heading(s.title)}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px" }}>
                {keys.map((k) => (
                  <div key={k}><span style={{ color: "#64748b" }}>{studentFieldLabel(k)}: </span><b>{STUDENT_FIELDS[k].value(data)}</b></div>
                ))}
              </div>
              {p.showPhoto === true && (data.photoUrl
                ? <img src={data.photoUrl} alt="" style={{ width: 72, height: 88, objectFit: "cover", border }} />
                : <div style={{ width: 72, height: 88, border, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.8em" }}>{t("Photo")}</div>)}
            </div>
          </div>
        );
      }
      case "marks": {
        const cols = strings(p.columns).filter((c) => COLUMN_LABELS[c]);
        const showRemarks = false;
        const widths = (p.widths ?? {}) as Record<string, number>;
        const numeric = new Set(["max", "pass", "marks", "percentage", "gradePoint", "internal", "external"]);
        const totalLabel = t("Total");
        return (
          <div>
            {heading(s.title)}
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: Object.keys(widths).length ? "fixed" : "auto" }}>
              <thead>
                <tr>
                  {cols.map((c) => <th key={c} style={{ ...th, textAlign: numeric.has(c) ? "right" : "left", width: widths[c] ? `${widths[c]}%` : undefined }}>{columnLabel(c)}</th>)}
                  {showRemarks && <th style={th}></th>}
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((sub) => (
                  <tr key={sub.name + sub.code} style={{ breakInside: "avoid" }}>
                    {cols.map((c) => <td key={c} style={{ ...td, textAlign: numeric.has(c) ? "right" : "left", color: c === "grade" && !sub.passed ? "#b91c1c" : undefined }}>{cell(sub, c)}</td>)}
                    {showRemarks && <td style={td}></td>}
                  </tr>
                ))}
              </tbody>
              {p.showTotal !== false && cols.includes("marks") && (
                <tfoot>
                  <tr>
                    {cols.map((c) => (
                      <td key={c} style={{ ...td, fontWeight: 700, textAlign: numeric.has(c) ? "right" : "left" }}>
                        {c === "subject" ? totalLabel : c === "max" ? data.totalMax : c === "marks" ? data.total : c === "percentage" ? data.percentage : ""}
                      </td>
                    ))}
                    {showRemarks && <td style={td}></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );
      }
      case "summary": {
        const keys = strings(p.fields).filter((k) => SUMMARY_FIELDS[k]);
        return (
          <div>
            {heading(s.title)}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {keys.map((k) => (
                <div key={k} style={{ border, padding: "4px 10px", minWidth: 90 }}>
                  <div style={{ fontSize: "0.8em", color: "#64748b" }}>{summaryFieldLabel(k)}</div>
                  <div style={{ fontWeight: 700, color: k === "result" && data.result === "Fail" ? "#b91c1c" : undefined }}>{SUMMARY_FIELDS[k].value(data)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case "attendance":
        return (
          <div>
            {heading(s.title)}
            <div>
              {data.daysTotal != null
                ? <>{t("Days present")}: <b>{data.daysPresent ?? 0}</b> {t("of")} <b>{data.daysTotal}</b> ({data.daysTotal > 0 ? Math.round(((data.daysPresent ?? 0) / data.daysTotal) * 100) : 0}%)</>
                : <span style={{ color: "#64748b" }}>{t("No attendance recorded for this term.")}</span>}
            </div>
          </div>
        );
      case "coscholastic": {
        const items = strings(p.items);
        return (
          <div>
            {heading(s.title)}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>{t("Area")}</th><th style={{ ...th, width: "25%" }}>{t("Grade / indicator")}</th></tr></thead>
              <tbody>{items.map((i) => <tr key={i}><td style={td}>{i}</td><td style={td}>{data.coScholastic?.find((c) => c.area.toLowerCase() === i.toLowerCase())?.grade ?? "\u00a0"}</td></tr>)}</tbody>
            </table>
          </div>
        );
      }
      case "remarks":
        return (
          <div>
            {heading(s.title)}
            <div style={{ border, minHeight: 44, padding: "4px 8px", whiteSpace: "pre-wrap" }}>{data.remarks ?? ""}</div>
          </div>
        );
      case "text":
        return (
          <div>
            {heading(s.title)}
            <div style={{ whiteSpace: "pre-wrap" }}>{str(p.text)}</div>
          </div>
        );
      case "table": {
        const rows = Array.isArray(p.rows) ? (p.rows as unknown[]).map((r) => strings(r)) : [];
        const head = strings(p.headers);
        return (
          <div>
            {heading(s.title)}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              {head.length > 0 && <thead><tr>{head.map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>}
              <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      }
      case "signatures": {
        const labels = strings(p.labels);
        return (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginTop: 28, breakInside: "avoid" }}>
            {labels.map((l) => <div key={l} style={{ flex: 1, textAlign: "center", borderTop: "1px solid #111827", paddingTop: 4, fontSize: "0.9em" }}>{l}</div>)}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const children = config.sections.filter((s) => s.visible).map((s) => (
    <div
      key={s.id}
      onClick={onSelect ? () => onSelect(s.id) : undefined}
      style={{ marginBottom: 8, cursor: onSelect ? "pointer" : undefined, outline: selectedId === s.id ? `2px dashed ${style.primary}` : undefined, outlineOffset: 2 }}
    >
      {renderSection(s)}
    </div>
  ));
  return <div style={root} data-progress-card>{children}</div>;
}
