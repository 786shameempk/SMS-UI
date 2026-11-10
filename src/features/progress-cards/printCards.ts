import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CardRenderer, PAGE_MM } from "./CardRenderer";
import type { CardData, TemplateConfig } from "./types";

/**
 * Opens the browser's print dialog with one card per page (Save as PDF there for a file). Server-side PDF and ZIP are not built;
 * this is the same approach the report library uses. Returns false when the pop-up was blocked.
 */
export function printCards(config: TemplateConfig, cards: CardData[], title = "Progress cards"): boolean {
  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) return false;
  const page = PAGE_MM[config.page.size] ?? PAGE_MM.A4;
  const landscape = config.page.orientation === "landscape";
  const body = cards
    .map((c) => `<div class="pc">${renderToStaticMarkup(createElement(CardRenderer, { config, data: c }))}</div>`)
    .join("");
  const esc = title.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc}</title><style>
@page{size:${config.page.size} ${landscape ? "landscape" : "portrait"};margin:0}
*{box-sizing:border-box}body{margin:0;background:#e5e7eb}
.pc{break-after:page;page-break-after:always;width:${landscape ? page.h : page.w}mm;margin:0 auto 8px;background:#fff}
.pc:last-child{break-after:auto;page-break-after:auto}
@media print{body{background:#fff}.pc{margin:0}}
</style></head><body>${body}<script>window.onload=function(){window.focus();window.print()}</script></body></html>`,
  );
  w.document.close();
  return true;
}
