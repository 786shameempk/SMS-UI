// A deliberately small Markdown dialect for help articles, parsed into structured blocks. The Help Center renders the
// blocks as React elements (no raw HTML is ever injected), the PDF renders them as HTML, and the AI index flattens them to
// text, all from this one parse.
//
// Supported: front matter, ## / ### headings, paragraphs, numbered lists (steps), bullet lists, tables, > callouts
// (> **Note:** / **Tip:** / **Warning:**), images ![alt](shot:id "caption"), horizontal rules, and the inline forms
// **bold**, *italic*, `code`, [text](https://url), [text](help:article-id) and [text](route:route.id).

// ── Front matter ────────────────────────────────────────────────────────────

function scalar(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    return inner ? splitTop(inner).map(scalar) : [];
  }
  const q = v.match(/^(["'])([\s\S]*)\1$/);
  return q ? q[2] : v;
}

function splitTop(s) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  for (const c of s) {
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      cur += c;
    } else if (c === "[") {
      depth++;
      cur += c;
    } else if (c === "]") {
      depth--;
      cur += c;
    } else if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}

/** `key: value`, `key: [a, b]`, `key:` + indented `- item` lists, and lists of `- key: value` maps. */
export function parseFrontMatter(lines) {
  const out = {};
  let i = 0;
  const indentOf = (l) => l.match(/^ */)[0].length;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) throw new Error(`front matter: cannot read "${line}"`);
    const [, key, rest] = m;
    if (rest !== "") {
      out[key] = scalar(rest);
      i++;
      continue;
    }
    // A block: following lines indented more than the key.
    const items = [];
    i++;
    while (i < lines.length && (lines[i].trim() === "" || indentOf(lines[i]) > 0)) {
      const l = lines[i];
      if (!l.trim()) {
        i++;
        continue;
      }
      const dash = l.match(/^(\s+)-\s+(.*)$/);
      if (!dash) throw new Error(`front matter: unexpected "${l}" under ${key}`);
      const base = dash[1].length;
      const first = dash[2];
      const kv = first.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      if (kv && !/^["'[]/.test(first)) {
        const map = { [kv[1]]: scalar(kv[2]) };
        i++;
        while (i < lines.length && lines[i].trim() !== "" && indentOf(lines[i]) > base) {
          const sub = lines[i].trim().match(/^([A-Za-z][\w-]*):\s*(.*)$/);
          if (!sub) throw new Error(`front matter: unexpected "${lines[i]}" under ${key}`);
          map[sub[1]] = scalar(sub[2]);
          i++;
        }
        items.push(map);
      } else {
        items.push(scalar(first));
        i++;
      }
    }
    out[key] = items;
  }
  return out;
}

export function splitFrontMatter(text) {
  const src = text.replace(/\r\n/g, "\n");
  if (!src.startsWith("---\n")) return { data: {}, body: src };
  const end = src.indexOf("\n---", 4);
  if (end < 0) throw new Error("front matter is not closed with ---");
  return { data: parseFrontMatter(src.slice(4, end).split("\n")), body: src.slice(end + 4).replace(/^\n/, "") };
}

// ── Inline ──────────────────────────────────────────────────────────────────

/** Nodes: {t:"text",v} {t:"bold",c} {t:"italic",c} {t:"code",v} {t:"link",href,c} {t:"help",id,c} {t:"route",id,c} */
export function parseInline(src) {
  const nodes = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) nodes.push({ t: "text", v: buf });
    buf = "";
  };
  while (i < src.length) {
    const rest = src.slice(i);
    let m;
    if ((m = rest.match(/^`([^`]+)`/))) {
      flush();
      nodes.push({ t: "code", v: m[1] });
      i += m[0].length;
    } else if ((m = rest.match(/^\*\*([\s\S]+?)\*\*/))) {
      flush();
      nodes.push({ t: "bold", c: parseInline(m[1]) });
      i += m[0].length;
    } else if ((m = rest.match(/^\*([^*\s][^*]*?)\*/))) {
      flush();
      nodes.push({ t: "italic", c: parseInline(m[1]) });
      i += m[0].length;
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) {
      flush();
      const [, text, target] = m;
      if (target.startsWith("help:")) nodes.push({ t: "help", id: target.slice(5), c: parseInline(text) });
      else if (target.startsWith("route:")) nodes.push({ t: "route", id: target.slice(6), c: parseInline(text) });
      else nodes.push({ t: "link", href: target, c: parseInline(text) });
      i += m[0].length;
    } else {
      buf += src[i];
      i++;
    }
  }
  flush();
  return nodes;
}

export function inlineText(nodes) {
  return nodes.map((n) => (n.t === "text" || n.t === "code" ? n.v : inlineText(n.c ?? []))).join("");
}

// ── Blocks ──────────────────────────────────────────────────────────────────

export const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Blocks: {type:"heading",level,id,text} {type:"p",inline} {type:"steps",items:[{inline,notes:[inline]}]}
 * {type:"list",items:[inline]} {type:"table",head:[inline],rows:[[inline]]} {type:"callout",kind,inline}
 * {type:"image",alt,shot,caption} {type:"hr"}
 */
export function parseBlocks(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  const seenIds = new Map();
  let i = 0;
  const isBlank = (l) => l.trim() === "";
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.+?)\s*$/))) {
      const level = m[1].length;
      const text = m[2];
      let id = slugify(text);
      const n = seenIds.get(id) ?? 0;
      seenIds.set(id, n + 1);
      if (n) id = `${id}-${n + 1}`;
      blocks.push({ type: "heading", level, id, text });
      i++;
    } else if (/^---+\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
    } else if ((m = line.match(/^!\[([^\]]*)\]\(shot:([\w-]+)(?:\s+"([^"]*)")?\)\s*$/))) {
      blocks.push({ type: "image", alt: m[1], shot: m[2], caption: m[3] ?? "" });
      i++;
    } else if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line).map(parseInline);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(cells(lines[i++]).map(parseInline));
      blocks.push({ type: "table", head, rows });
    } else if (line.startsWith(">")) {
      const parts = [];
      while (i < lines.length && lines[i].startsWith(">")) parts.push(lines[i++].replace(/^>\s?/, ""));
      const text = parts.join(" ").trim();
      const k = text.match(/^\*\*(Note|Tip|Warning|Important):\*\*\s*/i);
      blocks.push({ type: "callout", kind: (k?.[1] ?? "Note").toLowerCase(), inline: parseInline(k ? text.slice(k[0].length) : text) });
    } else if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const item = { inline: parseInline(lines[i].replace(/^\d+\.\s+/, "")), notes: [] };
        i++;
        // Continuation lines (indented) belong to the step; indented bullets are notes under it.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
          const t = lines[i].trim();
          if (t.startsWith("- ")) item.notes.push(parseInline(t.slice(2)));
          else item.inline = [...item.inline, { t: "text", v: " " }, ...parseInline(t)];
          i++;
        }
        items.push(item);
      }
      blocks.push({ type: "steps", items });
    } else if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) items.push(parseInline(lines[i++].replace(/^[-*]\s+/, "")));
      blocks.push({ type: "list", items });
    } else {
      const parts = [];
      while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,4}\s|>|\d+\.\s|[-*]\s|\||!\[)/.test(lines[i])) parts.push(lines[i++].trim());
      if (parts.length === 0) {
        parts.push(lines[i++].trim());
      }
      blocks.push({ type: "p", inline: parseInline(parts.join(" ")) });
    }
  }
  return blocks;
}

/** Flattens blocks to plain text (search, AI indexing). */
export function blocksText(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === "heading") out.push(b.text);
    else if (b.type === "p" || b.type === "callout") out.push(inlineText(b.inline));
    else if (b.type === "steps") b.items.forEach((s, n) => out.push(`${n + 1}. ${inlineText(s.inline)}${s.notes.length ? " " + s.notes.map(inlineText).join(" ") : ""}`));
    else if (b.type === "list") b.items.forEach((s) => out.push(`- ${inlineText(s)}`));
    else if (b.type === "table") {
      out.push(b.head.map(inlineText).join(" | "));
      b.rows.forEach((r) => out.push(r.map(inlineText).join(" | ")));
    } else if (b.type === "image" && b.caption) out.push(b.caption);
  }
  return out.join("\n");
}
