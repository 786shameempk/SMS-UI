import { blocksText, inlineText, parseBlocks, parseInline, slugify, splitFrontMatter } from "../../../scripts/help/lib/markdown.mjs";

describe("front matter", () => {
  it("reads scalars, inline arrays, block lists and lists of maps", () => {
    const { data, body } = splitFrontMatter(`---
id: students-add
title: "Add a student"
order: 20
status: reviewed
roles: [admin, principal]
related:
  - a
  - b
tasks:
  - id: create-student
    label: Add a student
    phrases: [add a student, register a student]
  - id: second
    label: Another
---

Body text.`);
    expect(data).toEqual({
      id: "students-add",
      title: "Add a student",
      order: 20,
      status: "reviewed",
      roles: ["admin", "principal"],
      related: ["a", "b"],
      tasks: [
        { id: "create-student", label: "Add a student", phrases: ["add a student", "register a student"] },
        { id: "second", label: "Another" },
      ],
    });
    expect(body.trim()).toBe("Body text.");
  });

  it("treats a file without front matter as body only, and rejects an unclosed block", () => {
    expect(splitFrontMatter("Just text").data).toEqual({});
    expect(() => splitFrontMatter("---\nid: x\nno end")).toThrow(/not closed/);
  });
});

describe("inline formatting", () => {
  it("parses bold, italic, code, links to articles, screens and the web", () => {
    const nodes = parseInline("Select **Save**, see [the guide](help:students-add), [Open](route:students.list) or [site](https://example.com) and `code`.");
    expect(nodes.map((n) => n.t)).toEqual(["text", "bold", "text", "help", "text", "route", "text", "link", "text", "code", "text"]);
    expect(inlineText(nodes)).toBe("Select Save, see the guide, Open or site and code.");
  });

  it("leaves a lone asterisk or bracket as text", () => {
    expect(inlineText(parseInline("5 * 3 and [not a link"))).toBe("5 * 3 and [not a link");
  });
});

describe("blocks", () => {
  const blocks = parseBlocks(`## Steps

1. Open **Students**.
   - A note under the step.
2. Select *Add*,
   then continue on a second line.

- First
- Second

> **Warning:** Do not skip this.

| Field | Required |
|---|---|
| Name | Yes |

![The list](shot:students-list "The student list")

Plain paragraph
over two lines.`);

  it("builds headings with stable ids", () => {
    expect(blocks[0]).toMatchObject({ type: "heading", level: 2, id: "steps", text: "Steps" });
    expect(parseBlocks("## A\n\n## A").map((b) => b.id)).toEqual(["a", "a-2"]);
  });

  it("builds numbered steps with notes and continuation lines", () => {
    const steps = blocks[1] as unknown as { items: { inline: unknown[]; notes: unknown[][] }[] };
    expect(steps.items).toHaveLength(2);
    expect(steps.items[0].notes).toHaveLength(1);
    expect(inlineText(steps.items[1].inline as never)).toBe("Select Add, then continue on a second line.");
  });

  it("builds lists, callouts, tables, images and paragraphs", () => {
    expect(blocks.map((b) => b.type)).toEqual(["heading", "steps", "list", "callout", "table", "image", "p"]);
    expect(blocks[3]).toMatchObject({ kind: "warning" });
    expect(blocks[5]).toMatchObject({ shot: "students-list", caption: "The student list" });
    expect(inlineText((blocks[6] as unknown as { inline: never }).inline)).toBe("Plain paragraph over two lines.");
  });

  it("flattens to searchable text", () => {
    const text = blocksText(blocks);
    expect(text).toContain("1. Open Students.");
    expect(text).toContain("Field | Required");
    expect(text).toContain("The student list");
  });

  it("slugifies headings", () => {
    expect(slugify("Fields & checks (new)")).toBe("fields-and-checks-new");
  });
});
