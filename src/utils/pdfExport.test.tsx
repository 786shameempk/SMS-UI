import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportMenu } from "@/components/ui/export-menu";
import { buildPdfHtml, exportPdf } from "./pdfExport";

const table = { title: "Overdue fees", headers: ["Student", "Amount", "Note"], rows: [["Asha <b>Nair</b>", 1500, "late"], ["മീര", "2,000.50", ""]] as unknown[][] };

describe("PDF export", () => {
  it("builds a print-ready document: title, header row that repeats, every row, escaped text, and the print call", () => {
    const html = buildPdfHtml(table);

    expect(html).toContain("<title>Overdue fees</title>");
    expect(html).toContain("thead{display:table-header-group}");
    expect(html).toContain("counter(page)");
    expect(html).toContain("Asha &lt;b&gt;Nair&lt;/b&gt;");           // never HTML-injected
    expect(html).not.toContain("<b>Nair</b>");
    expect(html).toContain("മീര");                                    // other scripts are kept for the browser to shape
    expect(html).toContain("2 records");
    expect(html).toContain("window.print()");
  });

  it("right-aligns number columns only, and goes landscape for wide tables", () => {
    const html = buildPdfHtml({ ...table, headers: ["a", "b", "c", "d", "e", "f", "g", "h"], rows: [[1, 2, 3, 4, 5, 6, 7, "x"]] });

    expect(html).toContain("size:A4 landscape");
    expect(html.match(/<td class="num">/g)).toHaveLength(7);
    expect(buildPdfHtml(table)).toContain("size:A4 portrait");
    expect(buildPdfHtml(table)).toMatch(/<th class="">Student<\/th><th class="num">Amount<\/th>/);
  });

  it("says so when there is nothing to show", () => {
    expect(buildPdfHtml({ ...table, rows: [] })).toContain("No records to show.");
  });

  it("opens its own window, and reports a blocked pop-up", () => {
    const write = vi.fn();
    const close = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValueOnce({ document: { write, close } } as unknown as Window);

    expect(exportPdf(table)).toBe(true);
    expect(write).toHaveBeenCalledWith(expect.stringContaining("Overdue fees"));
    expect(close).toHaveBeenCalled();

    open.mockReturnValueOnce(null);
    expect(exportPdf(table)).toBe(false);
    open.mockRestore();
  });
});

describe("the export menu", () => {
  it("offers CSV and PDF as named menu items and runs the one chosen", async () => {
    const onCsv = vi.fn();
    const onPdf = vi.fn(() => true);
    render(<ExportMenu onCsv={onCsv} onPdf={onPdf} />);

    await userEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("menuitem", { name: /CSV/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: /PDF/ }));

    expect(onPdf).toHaveBeenCalledTimes(1);
    expect(onCsv).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /CSV/ }));
    expect(onCsv).toHaveBeenCalledTimes(1);
  });

  it("is disabled when there is nothing to export", () => {
    render(<ExportMenu onCsv={vi.fn()} onPdf={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });
});
