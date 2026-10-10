import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Footprints, Info, Printer, SearchX, Video } from "lucide-react";
import { ROLE_LABELS, getModule, getRoute, menuPathOf } from "@/app/routeRegistry";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { canOpenRoute, canRead, explainNoAccess } from "../access";
import { KIND_LABEL, articlesOfModule, getArticle, helpCatalog } from "../catalog";
import { AskAiButton, Feedback, Pill, ReviewBadge } from "../components/HelpBits";
import { ArticleBlocks } from "../components/RichText";
import { articleHref, helpHome, moduleHref } from "../links";
import { rememberArticle } from "../storage";
import { useTour } from "../tourStore";
import { canStartTour, toursForArticle } from "../walkthroughs";
import { useViewer } from "../useViewer";

export default function HelpArticlePage() {
  const { articleId = "" } = useParams();
  const viewer = useViewer();
  const navigate = useNavigate();
  const startTour = useTour((s) => s.start);
  const article = getArticle(articleId);
  const allowed = article ? canRead(article.access, viewer) : false;

  useEffect(() => {
    if (article && allowed) rememberArticle(article.id);
  }, [article, allowed]);

  const siblings = useMemo(() => (article ? articlesOfModule(helpCatalog.articles, article.module).filter((a) => canRead(a.access, viewer)) : []), [article, viewer]);
  const index = article ? siblings.findIndex((a) => a.id === article.id) : -1;
  const previous = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  if (!article || !allowed) {
    return (
      <PageContainer>
        <EmptyState
          icon={SearchX}
          title="This article is not available"
          description={article ? "It is written for a different role than yours." : "It may have been renamed or removed."}
          action={
            <Button asChild variant="outline">
              <Link to={helpHome}>Back to the Help Center</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const module = getModule(article.module);
  const route = article.route ? getRoute(article.route) : undefined;
  const openable = route && route.deepLink ? canOpenRoute(route, viewer) : false;
  const tours = viewer.role ? toursForArticle(article.id).filter((t) => { const r = getRoute(t.routeId); return canStartTour(r) && r && canOpenRoute(r, viewer); }) : [];
  const related = article.related.map(getArticle).filter((a): a is NonNullable<typeof a> => !!a && canRead(a.access, viewer));
  const video = article.video ? helpCatalog.videos.find((v) => v.id === article.video) : undefined;
  const toc = article.headings.filter((h) => h.level === 2);

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground print:hidden">
        <Link to={helpHome} className="hover:text-foreground">
          Help Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link to={moduleHref(article.module)} className="hover:text-foreground">
          {module?.title ?? article.module}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-current="page" className="font-medium text-foreground">
          {article.title}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="min-w-0 space-y-5">
          <header className="space-y-3">
            <h1 className="text-page-title">{article.title}</h1>
            <p className="max-w-3xl text-base text-muted-foreground">{article.summary}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Pill>{KIND_LABEL[article.kind]}</Pill>
              {route?.menuItem && <Pill>Menu: {menuPathOf(route).join(" → ")}</Pill>}
              <ReviewBadge article={article} />
            </div>
            {route && route.deepLink && (
              <div className="flex flex-wrap items-center gap-3 print:hidden">
                {openable ? (
                  <Button asChild>
                    <Link to={route.path}>
                      Open this screen
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {explainNoAccess(route, viewer)}
                  </p>
                )}
                {tours.map((t) => (
                  <Button key={t.id} type="button" variant="outline" onClick={() => { startTour(t.id); navigate(getRoute(t.routeId)!.path); }}>
                    <Footprints className="h-4 w-4" aria-hidden="true" />
                    Walk me through it
                  </Button>
                ))}
                {viewer.role && <AskAiButton />}
              </div>
            )}
          </header>

          {video && (
            <section aria-label="Video tutorial" className="space-y-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Video className="h-4 w-4 text-primary-text" aria-hidden="true" />
                Watch: {video.title}
              </h2>
              <video controls preload="none" poster={video.poster} className="aspect-video w-full rounded-xl border border-border bg-black" playsInline>
                <source src={video.url} type="video/mp4" />
                {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}
                Your browser cannot play this video.
              </video>
            </section>
          )}

          <ArticleBlocks blocks={article.blocks} />

          {related.length > 0 && (
            <section className="space-y-2 pt-2 print:hidden">
              <h2 className="text-base font-semibold text-foreground">Related articles</h2>
              <ul className="grid gap-2 md:grid-cols-2">
                {related.map((a) => (
                  <li key={a.id}>
                    <Link to={articleHref(a.id)} className="block rounded-xl border border-border/80 bg-card p-3 text-sm shadow-xs hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="font-medium text-foreground">{a.title}</span>
                      <span className="mt-0.5 block line-clamp-2 text-muted-foreground">{a.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="print:hidden">
            <Feedback articleId={article.id} />
          </div>

          {(previous || next) && (
            <nav aria-label="Other articles in this module" className="grid gap-3 sm:grid-cols-2 print:hidden">
              {previous ? (
                <Link to={articleHref(previous.id)} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">Previous</span>
                    <span className="block truncate font-medium text-foreground">{previous.title}</span>
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link to={articleHref(next.id)} className="flex items-center justify-end gap-2 rounded-xl border border-border bg-card p-3 text-right text-sm hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">Next</span>
                    <span className="block truncate font-medium text-foreground">{next.title}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </article>

        <aside className="hidden space-y-4 lg:block print:hidden">
          <div className="sticky top-4 space-y-4">
            {toc.length > 1 && (
              <nav aria-label="On this page" className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
                <ul className="space-y-1.5 border-l border-border pl-3 text-sm">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print this article
            </Button>
          </div>
        </aside>
      </div>
      {module && article.roles.length > 0 && article.roles.length < 9 && (
        <p className="text-xs text-muted-foreground print:hidden">Written for: {article.roles.map((r) => ROLE_LABELS[r]).join(", ")}.</p>
      )}
    </PageContainer>
  );
}
