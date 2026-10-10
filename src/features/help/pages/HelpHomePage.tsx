import { lazy, Suspense, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpenCheck, Clock, Compass, Users } from "lucide-react";
import { HELP_ROLES, ROLE_LABELS, type HelpRole } from "@/app/routeRegistry";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { useAuthStore } from "@/store/authStore";
import { visibleArticles } from "../access";
import { articlesForRole, getArticle, helpCatalog, modulesByGroup } from "../catalog";
import { AskAiButton, ArticleRow, ManualDownload, SearchResults } from "../components/HelpBits";
import { moduleHref, roleHref } from "../links";
import { searchArticles } from "../search";
import { getRecentIds } from "../storage";
import { useViewer } from "../useViewer";

// Only the platform administrator sees this, so it is not part of everyone's download.
const HelpAdminPanel = lazy(() => import("../components/HelpAdminPanel"));

const SCHOOL_ROLES = HELP_ROLES.filter((r) => r !== "superAdmin" && r !== "staff");

function Section({ icon: Icon, title, children }: { icon: typeof Compass; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary-text" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function HelpHomePage() {
  const viewer = useViewer();
  const userRole = useAuthStore((s) => s.user?.role);
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";

  const readable = useMemo(() => visibleArticles(helpCatalog.articles, viewer), [viewer]);
  const hits = useMemo(() => searchArticles(readable, q), [readable, q]);

  const startHere = useMemo(() => {
    const mine = userRole ? articlesForRole(readable, userRole as HelpRole).filter((a) => a.kind === "task") : [];
    return (mine.length >= 3 ? mine : readable.filter((a) => a.kind === "task")).slice(0, 6);
  }, [readable, userRole]);

  const groups = useMemo(
    () =>
      modulesByGroup()
        .map(({ group, modules }) => ({ group, modules: modules.map((m) => ({ m, count: readable.filter((a) => a.module === m.id).length })).filter((x) => x.count > 0) }))
        .filter((g) => g.modules.length > 0),
    [readable],
  );

  const recent = useMemo(
    () =>
      getRecentIds()
        .map(getArticle)
        .filter((a): a is NonNullable<typeof a> => !!a && readable.includes(a))
        .slice(0, 4),
    [readable],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Help Center"
        description="Step-by-step guides for every part of School Sphere. Search, browse by module or role, or ask School AI."
        actions={
          <>
            <ManualDownload />
            {viewer.role && <AskAiButton />}
          </>
        }
      />

      <div role="search" className="max-w-2xl">
        <SearchInput
          value={q}
          onValueChange={(v) => setParams(v ? { q: v } : {}, { replace: true })}
          placeholder="Search for a task, for example “add a student”"
          aria-label="Search the Help Center"
          containerClassName="sm:w-full"
          className="h-11"
          autoFocus={!q}
        />
      </div>

      {q.trim() ? (
        <section aria-live="polite" className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Search results</h2>
          <SearchResults hits={hits} query={q} />
        </section>
      ) : (
        <>
          {recent.length > 0 && (
            <Section icon={Clock} title="Recently viewed">
              <ul className="grid gap-2 md:grid-cols-2">
                {recent.map((a) => (
                  <li key={a.id}>
                    <ArticleRow article={a} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {startHere.length > 0 && (
            <Section icon={BookOpenCheck} title={userRole ? "Common tasks for you" : "Common tasks"}>
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {startHere.map((a) => (
                  <li key={a.id}>
                    <ArticleRow article={a} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section icon={Compass} title="Browse by module">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No articles are available to you yet.</p>
            ) : (
              <div className="space-y-5">
                {groups.map(({ group, modules }) => (
                  <div key={group} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
                    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {modules.map(({ m, count }) => (
                        <li key={m.id}>
                          <Link
                            to={moduleHref(m.id)}
                            className="flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="font-semibold text-foreground">{m.title}</span>
                            <span className="mt-0.5 line-clamp-3 flex-1 text-sm text-muted-foreground">{m.purpose}</span>
                            <span className="mt-2 text-xs text-muted-foreground">
                              {count} article{count === 1 ? "" : "s"}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={Users} title="Browse by role">
            <ul className="flex flex-wrap gap-2">
              {SCHOOL_ROLES.map((r) => (
                <li key={r}>
                  <Link to={roleHref(r)} className="inline-flex rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-primary/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {ROLE_LABELS[r]}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          {userRole === "superAdmin" && (
            <Suspense fallback={null}>
              <HelpAdminPanel />
            </Suspense>
          )}
        </>
      )}
    </PageContainer>
  );
}
