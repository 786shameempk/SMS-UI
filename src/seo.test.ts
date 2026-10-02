import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { router } from "@/app/router";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const SITE = "https://sms-schoolsphere.com";

/** First URL segment of every route in the signed-in app shell (the pathless layout route) and every other top-level route except "/". */
function privateRouteSegments() {
  const segments = router.routes.flatMap((route) =>
    route.path ? [route.path] : (route.children ?? []).map((child) => child.path ?? ""),
  );
  return [...new Set(segments.map((p) => p.replace(/^\//, "").split("/")[0]).filter((s) => s && s !== "login"))];
}

describe("SEO files", () => {
  const robots = read("public/robots.txt");
  const disallowed = [...robots.matchAll(/^Disallow: \/(\S+)$/gm)].map((m) => m[1]);

  it("keeps every signed-in area out of search results", () => {
    const missing = privateRouteSegments().filter((segment) => !disallowed.includes(segment));
    // A new module route needs a "Disallow: /<segment>" line in public/robots.txt.
    expect(missing).toEqual([]);
  });

  it("allows the landing page and points crawlers at the sitemap", () => {
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(disallowed).not.toContain("");
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it("has a valid sitemap of public pages on the canonical domain", () => {
    const doc = new DOMParser().parseFromString(read("public/sitemap.xml"), "application/xml");
    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    const locs = [...doc.getElementsByTagName("loc")].map((l) => l.textContent ?? "");
    expect(locs).toContain(`${SITE}/`);
    for (const loc of locs) {
      expect(loc.startsWith(`${SITE}/`)).toBe(true);
      expect(disallowed.some((d) => new URL(loc).pathname.startsWith(`/${d}`))).toBe(false);
    }
  });

  it("declares the same canonical URL in index.html", () => {
    const html = read("index.html");
    expect(html).toContain(`<link rel="canonical" href="${SITE}/" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE}/" />`);
  });
});
