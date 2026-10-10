// Turns the help catalogue into the HTML of the printed manual. The same structured articles the Help Center renders are
// rendered here, so there is one source and no hand-maintained copy for the PDF.
import { createHash } from "node:crypto";
import QRCode from "qrcode";

export const GROUP_ORDER = ["Everyday", "Academics", "Online Exams", "Human Resources", "Finance", "Campus Operations", "Engagement", "Insights", "Administration", "Platform", "Infrastructure"];

export const EDITIONS = {
  // Anyone may read this one: it is published on the Help Center without signing in.
  public: { label: "User Manual", access: ["public"], file: "school-sphere-user-manual.pdf" },
  // Security-sensitive administration (users, roles, settings). Distributed to school administrators, never published openly.
  admin: { label: "Administrator Guide", access: ["admin"], file: "school-sphere-administrator-guide.pdf" },
  // Platform operations. For the platform team only.
  platform: { label: "Platform Operations Guide", access: ["platform"], file: "school-sphere-platform-guide.pdf" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A short hash of exactly what this edition prints, so the shipped PDF can be matched to the content that produced it. */
export function editionRevision(articles, manual, assetsRevision = "") {
  const h = createHash("sha256");
  h.update(JSON.stringify(manual)).update(assetsRevision);
  for (const a of articles) h.update(JSON.stringify([a.id, a.title, a.summary, a.text, a.status, a.verifiedOn, a.module, a.access, a.roles, a.route, a.video]));
  return h.digest("hex").slice(0, 10);
}

export function selectEdition(catalog, edition) {
  const wanted = EDITIONS[edition].access;
  return catalog.articles.filter((a) => wanted.includes(a.access));
}

function inline(nodes, ctx) {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return esc(n.v);
        case "code":
          return `<code>${esc(n.v)}</code>`;
        case "bold":
          return `<strong>${inline(n.c, ctx)}</strong>`;
        case "italic":
          return `<em>${inline(n.c, ctx)}</em>`;
        case "link":
          return `<a class="ext" href="${esc(n.href)}">${inline(n.c, ctx)}</a>`;
        case "help":
          return ctx.included.has(n.id) ? `<a class="xref" href="#art-${esc(n.id)}">${inline(n.c, ctx)}</a>` : `<span>${inline(n.c, ctx)}</span>`;
        case "route": {
          const r = ctx.routes.get(n.id);
          return `<span class="screen">${inline(n.c, ctx)}${r?.deepLink ? ` <span class="path">(${esc(r.path)})</span>` : ""}</span>`;
        }
        default:
          return "";
      }
    })
    .join("");
}

const CALLOUT_LABEL = { note: "Note", tip: "Tip", warning: "Warning", important: "Important" };

function blocks(list, ctx) {
  return list
    .map((b) => {
      switch (b.type) {
        case "heading": {
          const level = Math.min(b.level + 1, 5); // an article's ## is the manual's h3 under the article title (h2)
          return `<h${level} id="${esc(ctx.articleId)}-${esc(b.id)}">${esc(b.text)}</h${level}>`;
        }
        case "p":
          return `<p>${inline(b.inline, ctx)}</p>`;
        case "steps":
          return `<ol class="steps">${b.items.map((s) => `<li><div>${inline(s.inline, ctx)}${s.notes.length ? `<ul class="step-notes">${s.notes.map((n) => `<li>${inline(n, ctx)}</li>`).join("")}</ul>` : ""}</div></li>`).join("")}</ol>`;
        case "list":
          return `<ul>${b.items.map((i) => `<li>${inline(i, ctx)}</li>`).join("")}</ul>`;
        case "table":
          return `<table><thead><tr>${b.head.map((h) => `<th>${inline(h, ctx)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        case "callout":
          return `<div class="callout ${esc(b.kind)}"><strong>${CALLOUT_LABEL[b.kind] ?? "Note"}:</strong> ${inline(b.inline, ctx)}</div>`;
        case "image":
          return b.file ? `<figure><img src="${esc(ctx.shotUrl(b.file))}" alt="${esc(b.alt)}"/>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>` : "";
        case "hr":
          return "<hr/>";
        default:
          return "";
      }
    })
    .join("\n");
}

async function qr(url) {
  return QRCode.toDataURL(url, { margin: 0, width: 160, color: { dark: "#1D2028", light: "#FFFFFF" } });
}

const LOGO_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`;

const CSS = `
@page { size: A4; margin: 22mm 18mm 24mm 18mm;
  @bottom-left { content: "__DOCTITLE__"; font: 8pt Inter, 'Segoe UI', sans-serif; color: #6b7080; }
  @bottom-right { content: counter(page); font: 9pt Inter, 'Segoe UI', sans-serif; color: #1d2028; }
  @top-left { content: string(chapter); font: 8pt Inter, 'Segoe UI', sans-serif; color: #A06212; }
}
@page cover { margin: 0; @bottom-left { content: none } @bottom-right { content: none } @top-left { content: none } }
@page :first { @top-left { content: none } }
:root { --brand: #ECA427; --brand-deep: #A06212; --ink: #1d2028; --muted: #5d6170; --line: #e4e1d8; --soft: #fbefd7; }
* { box-sizing: border-box; }
html { font: 10pt/1.55 Inter, 'Segoe UI', system-ui, sans-serif; color: var(--ink); }
body { margin: 0; }
h1, h2, h3, h4 { font-weight: 700; line-height: 1.25; color: var(--ink); }
a { color: var(--brand-deep); text-decoration: none; }
code { font: 0.9em 'Cascadia Mono', Consolas, monospace; background: #f3f1ea; padding: 0 3px; border-radius: 3px; }
.screen { font-weight: 600; } .screen .path { font-weight: 400; color: var(--muted); font-size: 0.85em; }

.cover { page: cover; height: 297mm; width: 210mm; background: linear-gradient(135deg, #EDB445, #D18818 55%, #A06212); color: #fff; padding: 28mm 22mm; display: flex; flex-direction: column; break-after: page; position: relative; overflow: hidden; }
.cover::before { content: ''; position: absolute; right: -40mm; top: -40mm; width: 130mm; height: 130mm; border-radius: 50%; background: rgba(255,255,255,.12); }
.cover::after { content: ''; position: absolute; left: -30mm; bottom: 30mm; width: 90mm; height: 90mm; border-radius: 50%; background: rgba(255,255,255,.08); }
.cover .mark { width: 22mm; height: 22mm; border-radius: 6mm; background: rgba(255,255,255,.22); display: grid; place-items: center; position: relative; z-index: 1; }
.cover .mark svg { width: 13mm; height: 13mm; }
.cover h1 { color: #fff; font-size: 34pt; margin: 24mm 0 4mm; position: relative; z-index: 1; }
.cover .brand { font-size: 13pt; font-weight: 700; letter-spacing: .02em; margin-top: 6mm; position: relative; z-index: 1; }
.cover p { font-size: 13pt; max-width: 130mm; position: relative; z-index: 1; margin: 0 0 4mm; color: #fff; }
.cover .meta { margin-top: auto; font-size: 10pt; position: relative; z-index: 1; border-top: .3mm solid rgba(255,255,255,.55); padding-top: 5mm; }
.cover .meta div { margin-bottom: 1mm; }

section.front { break-before: page; }
h1.chapter { string-set: chapter content(); font-size: 22pt; margin: 0 0 6mm; padding-bottom: 3mm; border-bottom: .8mm solid var(--brand); }
h1.part { string-set: chapter content(); font-size: 26pt; color: var(--brand-deep); break-before: page; margin: 40mm 0 4mm; }
.part-intro { color: var(--muted); font-size: 11pt; margin: 0 0 6mm; }
article.help { break-before: page; }
article.help.first { break-before: auto; }
article.help > header { display: flex; gap: 6mm; align-items: flex-start; justify-content: space-between; margin-bottom: 4mm; padding-bottom: 3mm; border-bottom: .3mm solid var(--line); }
article.help h2 { font-size: 17pt; margin: 0 0 2mm; }
article.help .summary { color: var(--muted); font-size: 10.5pt; margin: 0 0 2mm; }
article.help .meta { font-size: 8.5pt; color: var(--muted); }
article.help .meta span { display: inline-block; border: .2mm solid var(--line); border-radius: 10px; padding: 0 6px; margin: 0 3px 3px 0; background: #fff; }
article.help .qr { text-align: center; font-size: 7pt; color: var(--muted); flex: none; width: 22mm; }
article.help .qr img { width: 20mm; height: 20mm; display: block; margin: 0 auto 1mm; }
h3 { font-size: 12.5pt; margin: 6mm 0 2mm; break-after: avoid; } h4 { font-size: 11pt; margin: 4mm 0 1.5mm; break-after: avoid; }
p { margin: 0 0 2.5mm; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
ol.steps { list-style: none; padding: 0; counter-reset: step; }
ol.steps > li { counter-increment: step; display: flex; gap: 3mm; margin-bottom: 2.2mm; break-inside: avoid; }
ol.steps > li::before { content: counter(step); flex: none; width: 6mm; height: 6mm; border-radius: 50%; background: var(--soft); color: var(--brand-deep); font-weight: 700; font-size: 8.5pt; display: grid; place-items: center; margin-top: .4mm; border: .2mm solid #f0cf8f; }
.step-notes { font-size: 9pt; color: var(--muted); margin: 1mm 0 0; }
table { border-collapse: collapse; width: 100%; margin: 0 0 4mm; font-size: 9pt; break-inside: avoid; }
th, td { border: .2mm solid var(--line); padding: 1.5mm 2.2mm; text-align: left; vertical-align: top; }
thead th { background: #f6f4ee; }
.callout { border: .25mm solid var(--line); border-left-width: 1.2mm; border-radius: 1.5mm; padding: 2.4mm 3.2mm; margin: 0 0 3.5mm; font-size: 9.5pt; break-inside: avoid; background: #fafaf7; }
.callout.tip { border-left-color: #2f9e6b; } .callout.note { border-left-color: #3b82c4; } .callout.warning { border-left-color: #d89614; } .callout.important { border-left-color: #c0392b; }
figure { margin: 3mm 0 4mm; break-inside: avoid; text-align: center; }
figure img { max-width: 100%; max-height: 120mm; border: .2mm solid var(--line); border-radius: 2mm; }
figcaption { font-size: 8.5pt; color: var(--muted); margin-top: 1mm; }
.video-note { font-size: 9pt; border: .25mm dashed var(--line); border-radius: 2mm; padding: 2mm 3mm; margin: 0 0 3mm; color: var(--muted); }

/* contents and index */
ol.toc { list-style: none; padding: 0; margin: 0; } ol.toc ol { list-style: none; padding-left: 6mm; margin: 0 0 1.5mm; }
.toc li { margin: 0; } .toc a { display: flex; gap: 2mm; color: var(--ink); padding: .7mm 0; }
.toc a .t { flex: none; } .toc a .dots { flex: 1; border-bottom: .2mm dotted #b9b6aa; margin-bottom: 1.2mm; min-width: 6mm; }
.toc a::after { content: target-counter(attr(href), page); flex: none; font-variant-numeric: tabular-nums; }
.toc > li > a { font-weight: 700; margin-top: 2mm; } .toc .module > a { font-weight: 600; }
.toc .group-title { font-weight: 700; color: var(--brand-deep); margin-top: 3mm; font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; }
.index-list { columns: 2; column-gap: 8mm; font-size: 9pt; } .index-list div { break-inside: avoid; margin-bottom: 1mm; }
.index-list a::after { content: ', ' target-counter(attr(href), page); color: var(--muted); }
.role-list a::after { content: ' · p. ' target-counter(attr(href), page); color: var(--muted); }
.docinfo td:first-child { width: 38mm; font-weight: 600; }
`;

export async function buildManualHtml({ catalog, registry, edition, manual, baseUrl, revision, generatedOn, shotUrl }) {
  const meta = EDITIONS[edition];
  const articles = selectEdition(catalog, edition);
  const included = new Set(articles.map((a) => a.id));
  const routes = new Map(registry.ROUTES.map((r) => [r.id, r]));
  const modules = new Map(registry.MODULES.map((m) => [m.id, m]));
  const ctx = { included, routes, shotUrl, articleId: "" };

  const bundle = (list) => list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const byModule = new Map();
  for (const a of articles) byModule.set(a.module, [...(byModule.get(a.module) ?? []), a]);

  const groupOf = (m) => m.menu[0] ?? "Everyday";
  const intro = bundle(byModule.get("help-center") ?? []);
  const started = bundle(byModule.get("account") ?? []);
  const moduleGroups = new Map();
  for (const [id, list] of byModule) {
    if (id === "help-center" || id === "account") continue;
    const m = modules.get(id);
    if (!m) continue;
    moduleGroups.set(groupOf(m), [...(moduleGroups.get(groupOf(m)) ?? []), { m, list: bundle(list) }]);
  }
  const orderedGroups = [...moduleGroups.entries()].sort(([a], [b]) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99));

  const renderArticle = async (a, first = false) => {
    const url = `${baseUrl}/help/a/${a.id}`;
    const route = a.route ? routes.get(a.route) : null;
    const menu = route?.menuItem ? registry.menuPathOf(route).join(" → ") : null;
    ctx.articleId = a.id;
    const video = a.video ? catalog.videos.find((v) => v.id === a.video) : null;
    return `<article class="help${first ? " first" : ""}" id="art-${esc(a.id)}">
  <header>
    <div>
      <h2>${esc(a.title)}</h2>
      <p class="summary">${esc(a.summary)}</p>
      <div class="meta">${menu ? `<span>Menu: ${esc(menu)}</span>` : ""}${route?.deepLink ? `<span>Address: ${esc(route.path)}</span>` : ""}<span>${a.status === "verified" ? `Verified ${esc(a.verifiedOn ?? "")}` : a.status === "reviewed" ? "Checked against the application" : "Draft"}</span></div>
    </div>
    <div class="qr"><img src="${await qr(url)}" alt=""/>Online version</div>
  </header>
  ${video ? `<div class="video-note"><strong>Video tutorial:</strong> ${esc(video.title)}. Watch it online at <a class="ext" href="${esc(url)}">${esc(url)}</a>.</div>` : ""}
  ${blocks(a.blocks, ctx)}
</article>`;
  };

  const tocItems = [];
  const body = [];

  if (intro.length) {
    tocItems.push(`<li><a href="#part-intro"><span class="t">Introduction</span><span class="dots"></span></a><ol>${intro.map((a) => `<li><a href="#art-${esc(a.id)}"><span class="t">${esc(a.title)}</span><span class="dots"></span></a></li>`).join("")}</ol></li>`);
    body.push(`<h1 class="part" id="part-intro">Introduction</h1>`);
    for (const [i, a] of intro.entries()) body.push(await renderArticle(a, i === 0));
  }
  if (started.length) {
    tocItems.push(`<li><a href="#part-started"><span class="t">Getting started</span><span class="dots"></span></a><ol>${started.map((a) => `<li><a href="#art-${esc(a.id)}"><span class="t">${esc(a.title)}</span><span class="dots"></span></a></li>`).join("")}</ol></li>`);
    body.push(`<h1 class="part" id="part-started">Getting started</h1><p class="part-intro">Signing in, recovering a password and looking after your account.</p>`);
    for (const [i, a] of started.entries()) body.push(await renderArticle(a, i === 0));
  }

  // Guides by role: generated, so it can never disagree with the articles.
  const roleArticles = articles.filter((a) => a.module !== "help-center");
  const roleSection = registry.HELP_ROLES.filter((r) => r !== "staff" && roleArticles.some((a) => a.roles.includes(r)));
  if (roleSection.length) {
    tocItems.push(`<li><a href="#part-roles"><span class="t">Guides by role</span><span class="dots"></span></a></li>`);
    body.push(`<h1 class="part" id="part-roles">Guides by role</h1><p class="part-intro">Find the articles written for your role. Schools can change what each role can open, so a screen described here may not be switched on for you.</p>`);
    for (const r of roleSection) {
      const list = roleArticles.filter((a) => a.roles.includes(r)).sort((a, b) => a.module.localeCompare(b.module) || a.order - b.order);
      body.push(`<h3>${esc(registry.ROLE_LABELS[r])}</h3><div class="role-list"><ul>${list.map((a) => `<li><a href="#art-${esc(a.id)}">${esc(a.title)}</a> <span class="path">${esc(modules.get(a.module)?.title ?? "")}</span></li>`).join("")}</ul></div>`);
    }
  }

  let partNo = 0;
  for (const [group, mods] of orderedGroups) {
    partNo++;
    const partId = `part-${slug(group)}`;
    tocItems.push(`<li><a href="#${partId}"><span class="t">${esc(group === "Everyday" ? "Everyday modules" : group)}</span><span class="dots"></span></a><ol>${mods.map(({ m }) => `<li class="module"><a href="#mod-${esc(m.id)}"><span class="t">${esc(m.title)}</span><span class="dots"></span></a></li>`).join("")}</ol></li>`);
    body.push(`<h1 class="part" id="${partId}">${esc(group === "Everyday" ? "Everyday modules" : group)}</h1>`);
    for (const { m, list } of mods) {
      const url = `${baseUrl}/help/m/${m.id}`;
      body.push(`<section id="mod-${esc(m.id)}" class="module-head" style="break-before: page"><h1 class="chapter">${esc(m.title)}</h1><div style="display:flex;gap:6mm;justify-content:space-between"><div><p>${esc(m.purpose)}</p><p class="path" style="font-size:9pt;color:#5d6170">Available by default to: ${esc(m.defaultRoles.map((r) => registry.ROLE_LABELS[r]).join(", "))}. Schools can change this under Roles &amp; Permissions.</p></div><div class="qr" style="text-align:center;font-size:7pt;color:#5d6170;flex:none;width:22mm"><img src="${await qr(url)}" style="width:20mm;height:20mm" alt=""/>All articles online</div></div></section>`);
      for (const [i, a] of list.entries()) body.push(await renderArticle(a, i === 0));
    }
  }

  // Troubleshooting directory.
  const trouble = articles.filter((a) => a.kind === "troubleshooting" || a.kind === "faq");
  if (trouble.length) {
    tocItems.push(`<li><a href="#part-trouble"><span class="t">Troubleshooting and questions</span><span class="dots"></span></a></li>`);
    body.push(`<h1 class="part" id="part-trouble">Troubleshooting and questions</h1><p class="part-intro">Every troubleshooting and frequently-asked-questions article, in one list.</p><div class="role-list"><ul>${trouble.map((a) => `<li><a href="#art-${esc(a.id)}">${esc(a.title)}</a> <span class="path">${esc(modules.get(a.module)?.title ?? "")}</span></li>`).join("")}</ul></div>`);
  }

  // Index of keywords.
  const terms = new Map();
  for (const a of articles) for (const k of new Set([...a.keywords, ...a.tasks.flatMap((t) => [t.label])])) terms.set(k, [...(terms.get(k) ?? []), a]);
  if (terms.size) {
    tocItems.push(`<li><a href="#part-index"><span class="t">Index</span><span class="dots"></span></a></li>`);
    const sorted = [...terms.entries()].sort(([a], [b]) => a.localeCompare(b));
    body.push(`<h1 class="part" id="part-index">Index</h1><div class="index-list">${sorted.map(([k, list]) => `<div><strong>${esc(k)}</strong> ${list.map((a) => `<a href="#art-${esc(a.id)}"></a>`).join("")}</div>`).join("")}</div>`);
  }

  const docInfo = `<section class="front"><h1 class="chapter">Document information</h1><table class="docinfo"><tbody>
<tr><td>Title</td><td>School Sphere ${esc(meta.label)}</td></tr>
<tr><td>Manual version</td><td>${esc(manual.manualVersion)}</td></tr>
<tr><td>Application version</td><td>${esc(catalog.appVersion)}</td></tr>
<tr><td>Content revision</td><td>${esc(revision)}</td></tr>
<tr><td>Generated on</td><td>${esc(generatedOn)}</td></tr>
<tr><td>Articles</td><td>${articles.length} (${articles.filter((a) => a.status === "verified").length} verified in the application, ${articles.filter((a) => a.status === "reviewed").length} checked against the application code, ${articles.filter((a) => a.status === "draft").length} draft)</td></tr>
<tr><td>Online help</td><td><a class="ext" href="${esc(baseUrl)}/help">${esc(baseUrl)}/help</a></td></tr>
</tbody></table>
<h3>Revision history</h3>
<table><thead><tr><th>Version</th><th>Date</th><th>Changes</th></tr></thead><tbody>${(manual.revisions ?? []).map((r) => `<tr><td>${esc(r.version)}</td><td>${esc(r.date)}</td><td>${esc(r.notes)}</td></tr>`).join("")}</tbody></table>
<p class="path" style="font-size:8.5pt;color:#5d6170">This manual is generated from the same source files as the online Help Center. A screen or step may have changed since the content revision above; the online version is always the latest.</p></section>`;

  const cover = `<section class="cover"><div class="mark">${LOGO_SVG}</div><div class="brand">School Sphere</div><h1>${esc(meta.label)}</h1><p>${esc(manual.subtitle)}</p><div class="meta"><div>Manual version ${esc(manual.manualVersion)} · content revision ${esc(revision)}</div><div>${esc(generatedOn)}</div><div>${esc(baseUrl)}/help</div></div></section>`;
  const toc = `<section class="front"><h1 class="chapter">Contents</h1><ol class="toc">${tocItems.join("")}</ol></section>`;

  const title = `School Sphere ${meta.label}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${esc(title)}</title><meta name="description" content="${esc(manual.subtitle)}"/><style>${CSS.replace("__DOCTITLE__", `${title} · v${manual.manualVersion} · revision ${revision}`.replace(/"/g, ""))}</style></head><body>${cover}${toc}${body.join("\n")}${docInfo}</body></html>`;
  return { html, articles };
}
