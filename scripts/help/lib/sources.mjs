// Readers for the application source: the router, the navigation and the labels each screen renders.
// Shared by the inventory, the coverage checks and the registry-parity tests.

// ── Routes (src/app/router.tsx) ─────────────────────────────────────────────

export function parseRoutes(text) {
  const routes = [];
  const seen = new Set();
  const lines = text.split("\n");
  const add = (path, element, line) => {
    const full = path.replace(/\/+/g, "/");
    if (seen.has(full)) return;
    seen.add(full);
    const wrapper = element.match(/<(RequireModule|RequireSuperAdmin|ProtectedRoute)(?:\s+module="([^"]+)")?/);
    const page = [...element.matchAll(/<([A-Z][A-Za-z0-9]+)/g)].map((m) => m[1]).find((n) => !["RequireModule", "RequireSuperAdmin", "ProtectedRoute", "Suspense"].includes(n));
    routes.push({
      path: full,
      page,
      requires: wrapper ? (wrapper[1] === "RequireSuperAdmin" ? "superAdmin" : wrapper[1] === "RequireModule" ? "module:" + wrapper[2] : "signedIn") : null,
      line,
    });
  };
  let parent = null; // { path, indent } while inside a `children: [` block
  for (const [i, line] of lines.entries()) {
    if (parent && new RegExp("^\\s{" + parent.indent + "}\\],?\\s*$").test(line)) {
      parent = null;
      continue;
    }
    const own = line.match(/^(\s*)path: "([^"]*)",\s*$/);
    if (own) {
      const ahead = lines.slice(i + 1, i + 12);
      const elementLine = ahead.find((l) => /element:/.test(l)) ?? "";
      const hasChildren = ahead.some((l) => /children:\s*\[\s*$/.test(l));
      const abs = "/" + (parent ? parent.path + "/" : "") + own[2];
      add(abs, elementLine, i + 1);
      if (hasChildren) parent = { path: (parent ? parent.path + "/" : "") + own[2], indent: own[1].length };
      continue;
    }
    const inline = line.match(/\{\s*(?:path: "([^"]*)"|index: true)[^}]*?element:\s*(.+?)\s*\},?\s*$/);
    if (inline) {
      const rel = inline[1] ?? "";
      const base = parent ? parent.path : "";
      add("/" + base + (base && rel ? "/" : "") + rel, inline[2], i + 1);
    }
  }
  return routes;
}

// ── Navigation (src/constants/nav.ts) ───────────────────────────────────────

export function parseNav(text) {
  const core = [];
  const sections = [];
  const item = (l) => {
    const m = l.match(/\{\s*label: "([^"]+)",\s*to: "([^"]+)"/);
    if (!m) return null;
    const get = (k) => l.match(new RegExp(`${k}: "([^"]+)"`))?.[1] ?? null;
    return { label: m[1], to: m[2], permissionKey: get("permissionKey"), audience: get("audience"), badge: get("badge"), superAdminOnly: /superAdminOnly: true/.test(l) };
  };
  const coreBlock = text.slice(text.indexOf("export const CORE_NAV_ITEMS"), text.indexOf("export const NAV_SECTIONS"));
  for (const l of coreBlock.split("\n")) {
    const it = item(l);
    if (it) core.push(it);
  }
  const sectionBlock = text.slice(text.indexOf("export const NAV_SECTIONS"), text.indexOf("export const ALL_NAV_ENTRIES"));
  let current = null;
  for (const l of sectionBlock.split("\n")) {
    const t = l.match(/^\s{4}title: "([^"]+)",/);
    if (t) {
      current = { title: t[1], permissionKey: null, items: [] };
      sections.push(current);
      continue;
    }
    const sp = l.match(/^\s{4}permissionKey: "([^"]+)",/);
    if (sp && current) current.permissionKey = sp[1];
    const it = item(l);
    if (it && current) current.items.push(it);
  }
  return { core, sections };
}

// ── Per-feature UI facts ────────────────────────────────────────────────────

export const uniq = (arr) => [...new Set(arr.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean))];
const literal = (s) => s.replace(/\{[^}]*\}/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Contents of every <Name ...>...</Name>, scanning the opening tag properly so "=>" inside attribute expressions is not mistaken for its end. */
export function jsxContents(text, name) {
  const out = [];
  const open = new RegExp("<" + name + "\\b", "g");
  let m;
  while ((m = open.exec(text))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = null;
    for (; i < text.length; i++) {
      const c = text[i];
      if (quote) {
        if (c === quote && text[i - 1] !== "\\") quote = null;
      } else if (c === "\"" || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    if (text[i - 1] === "/") continue; // self-closing: no text
    const end = text.indexOf("</" + name + ">", i);
    if (end > i) out.push(text.slice(i + 1, end));
  }
  return out;
}

export function extractFacts(text) {
  const f = {};
  f.pageTitles = uniq([...text.matchAll(/<PageHeader[^>]*?\btitle=(?:"([^"]+)"|\{`([^`]+)`\})/g)].map((m) => m[1] ?? m[2]));
  f.tabs = uniq(jsxContents(text, "TabsTrigger").map(literal));
  f.buttons = uniq(jsxContents(text, "Button").map(literal).filter((x) => x.length > 1 && x.length < 48));
  f.dialogs = uniq(jsxContents(text, "DialogTitle").map(literal));
  f.confirms = uniq([...text.matchAll(/<ConfirmDialog[\s\S]*?title=(?:"([^"]+)"|\{`([^`]+)`\})/g)].map((m) => m[1] ?? m[2]));
  f.labels = uniq([
    ...[...text.matchAll(/<Label[^>]*>([\s\S]*?)<\/Label>/g)].map((m) => literal(m[1])),
    ...[...text.matchAll(/<FormField[^>]*?\blabel="([^"]+)"/g)].map((m) => m[1]),
  ].filter((s) => s.length < 60));
  f.requiredLabels = uniq([...text.matchAll(/<FormField[^>]*?\blabel="([^"]+)"[^>]*?\brequired\b/g)].map((m) => m[1]));
  f.placeholders = uniq([...text.matchAll(/placeholder="([^"]+)"/g)].map((m) => m[1]));
  f.columns = uniq([...text.matchAll(/\bheader:\s*"([^"]+)"/g)].map((m) => m[1]));
  f.menuActions = uniq(jsxContents(text, "DropdownMenuItem").map(literal));
  f.toastsSuccess = uniq([...text.matchAll(/toast\.success\(\s*(?:"([^"]+)"|`([^`]+)`)/g)].map((m) => m[1] ?? m[2]));
  f.toastsError = uniq([...text.matchAll(/toast\.error\(\s*"([^"]+)"/g)].map((m) => m[1]));
  f.validation = uniq([...text.matchAll(/\.(?:min|max|email|regex|length|refine|nonempty)\([^"`]*?,?\s*(?:\{\s*message:\s*)?"([^"]+)"/g)].map((m) => m[1]));
  f.searchPlaceholders = uniq([...text.matchAll(/<SearchInput[^>]*?placeholder="([^"]+)"/g)].map((m) => m[1]));
  f.emptyStates = uniq([...text.matchAll(/<EmptyState[\s\S]*?title="([^"]+)"/g)].map((m) => m[1]));
  f.exports = /\b(exportCsv|downloadCsv|Download|Export|\.csv|print\()/i.test(text);
  f.imports = /\b(Import|upload|file input|type="file")/i.test(text);
  return f;
}

