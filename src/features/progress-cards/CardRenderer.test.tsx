import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardRenderer } from "./CardRenderer";
import { SAMPLE_CARD } from "./sample";
import type { TemplateConfig } from "./types";

const config: TemplateConfig = {
  page: { size: "A4", orientation: "portrait", margin: 10 },
  style: { font: "Arial", fontSize: 11, primary: "#123456", border: "#999999", headerBg: "#eeeeee" },
  sections: [
    { id: "s", type: "student", title: "Student", visible: true, props: { fields: ["name", "admissionNumber"] } },
    { id: "m", type: "marks", title: "Marks", visible: true, props: { columns: ["subject", "marks", "grade"], showTotal: true } },
    { id: "h", type: "text", title: "Hidden", visible: false, props: { text: "secret note" } },
  ],
};

describe("CardRenderer", () => {
  it("renders configured fields, columns and the total from the card data", () => {
    const html = renderToStaticMarkup(<CardRenderer config={config} data={SAMPLE_CARD} />);
    expect(html).toContain("Sample Student");
    expect(html).toContain("ADM-0001");
    expect(html).toContain("Marks obtained");
    expect(html).toContain(">319<");
    expect(html).not.toContain("Max marks");
  });

  it("leaves hidden sections out and sizes the page from the layout", () => {
    const html = renderToStaticMarkup(<CardRenderer config={{ ...config, page: { ...config.page, size: "A5", orientation: "landscape" } }} data={SAMPLE_CARD} />);
    expect(html).not.toContain("secret note");
    expect(html).toContain("width:210mm");
  });
});
