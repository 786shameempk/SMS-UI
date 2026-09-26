import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Sparkles } from "lucide-react";
import { getSchoolShowcase } from "../api";
import { CATEGORY_CONFIG } from "../constants";
import { formatCount, useTalentRole } from "../hooks";
import { EmptyState, SectionHeader } from "../components/Bits";
import { BrushStroke, HeroDecor } from "../components/Decor";
import TalentCard, { TalentRail } from "../components/TalentCard";

/** A school's own talent community page. Visitors from other schools only ever see its Public work. */
export default function SchoolShowcasePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { canCreate } = useTalentRole();
  const { data, isLoading, isError } = useQuery({ queryKey: ["talents", "school", tenantId], queryFn: () => getSchoolShowcase(tenantId!), enabled: !!tenantId });

  if (isError) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-10">
        <EmptyState emoji="🏫" title="Nothing to see here yet" body="This school hasn't shared any public talents." />
      </div>
    );
  }

  const spotlight = data?.featured[0] ?? data?.trending[0];
  const sideCards = [...(data?.featured ?? []), ...(data?.trending ?? []), ...(data?.recent ?? [])]
    .filter((t, i, all) => t.id !== spotlight?.id && all.findIndex((x) => x.id === t.id) === i)
    .slice(0, 2);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-10">
      <section className="cc-hero rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12">
        <HeroDecor dense />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <span className="cc-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white/90">
              {data?.isMySchool ? "🏫 Your school community" : <><Globe2 className="w-3.5 h-3.5" /> Public talents only</>}
            </span>
            <h1 className="cc-display mt-4 text-3xl sm:text-5xl font-extrabold leading-tight">
              {isLoading ? <span className="inline-block h-12 w-80 max-w-full rounded-xl bg-white/10" /> : data?.schoolName}
            </h1>
            <p className="relative mt-3 text-lg text-white/80 max-w-2xl inline-block">
              {data?.tagline ?? "Celebrating the creativity of our students and teachers."}
              <BrushStroke className="absolute -bottom-2 left-0 w-2/3 h-2.5" color="#5eead4" />
            </p>
          </div>
          {data && (
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] lg:grid-cols-2 gap-3">
              {[
                { label: "Showcases", value: data.stats.showcases, emoji: "🎨" },
                { label: "Creators", value: data.stats.creators, emoji: "🧑‍🎨" },
                { label: "Views", value: data.stats.views, emoji: "👁" },
                { label: "Appreciations", value: data.stats.reactions, emoji: "💖" },
              ].map((s) => (
                <div key={s.label} className="cc-glass rounded-2xl px-4 py-3 min-w-0">
                  <dt className="text-xs text-white/60">
                    {s.emoji} {s.label}
                  </dt>
                  <dd className="cc-display text-2xl font-bold">{formatCount(s.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {data && data.stats.showcases === 0 && (
        <EmptyState
          emoji="🎭"
          title="Your school's stage is empty"
          body="Be the first to share a talent - once it's approved it will appear here for your whole school."
          action={
            data.isMySchool && canCreate ? (
              <Link to="/talents/new" className="inline-flex items-center gap-2 rounded-full cc-gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-md">
                <Sparkles className="w-4 h-4" /> Share your talent
              </Link>
            ) : undefined
          }
        />
      )}

      {spotlight && (
        <section>
          <SectionHeader emoji="🌟" title="Featured talents" subtitle="Chosen by the school" />
          <div className="grid lg:grid-cols-3 gap-4">
            <TalentCard talent={spotlight} variant="feature" className="lg:col-span-2 lg:aspect-[16/9]" />
            <div className="grid gap-4">
              {sideCards.map((t) => (
                <TalentCard key={t.id} talent={t} variant="feature" className="sm:aspect-[16/9] lg:aspect-auto lg:min-h-[180px]" />
              ))}
            </div>
          </div>
        </section>
      )}

      {data && data.categories.length > 0 && (
        <section>
          <SectionHeader emoji="🧭" title="Our talents by category" />
          <div className="flex flex-wrap gap-2">
            {data.categories.map(({ category, count }) => (
              <Link
                key={category}
                to={`/talents/explore?category=${category}${data.isMySchool ? "&scope=school" : ""}`}
                className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${CATEGORY_CONFIG[category].gradient} px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:-translate-y-0.5 transition-transform`}
              >
                {CATEGORY_CONFIG[category].emoji} {CATEGORY_CONFIG[category].label}
                <span className="rounded-full bg-white/25 px-1.5 text-xs">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TalentRail emoji="🎒" title="Student talents" talents={data?.studentTalents} loading={isLoading} />
      <TalentRail emoji="🍎" title="Teacher talents" talents={data?.teacherTalents} loading={isLoading} />
      <TalentRail emoji="🏆" title="Achievements" subtitle="Sports, academics, science and tech" talents={data?.achievements} loading={isLoading} />
      <TalentRail emoji="🔥" title="Trending at school" talents={data?.trending} loading={isLoading} />
      <TalentRail emoji="🆕" title="Recent showcases" talents={data?.recent} loading={isLoading} />
    </div>
  );
}
