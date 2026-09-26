import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { getDiscover } from "../api";
import { CATEGORY_CONFIG, MODULE_MOTTO, MODULE_TAGLINE } from "../constants";
import { formatCount, useTalentRole } from "../hooks";
import { CardSkeleton, EmptyState, SectionHeader } from "../components/Bits";
import { BrushStroke, HeroDecor } from "../components/Decor";
import TalentCard, { TalentRail } from "../components/TalentCard";

const JOURNEY = [
  { emoji: "✨", title: "Create", text: "Share your talent" },
  { emoji: "👀", title: "Review", text: "A teacher takes a look" },
  { emoji: "✅", title: "Approve", text: "It goes live" },
  { emoji: "❤️", title: "Celebrate", text: "Friends cheer you on" },
  { emoji: "🌟", title: "Inspire", text: "Your talent sparks others" },
];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { canCreate } = useTalentRole();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["talents", "discover"], queryFn: getDiscover });

  const spotlight = data?.featured[0] ?? data?.trending[0];
  // Top up the two side slots from trending when fewer than three talents are featured.
  const sideFeatured = [...(data?.featured ?? []), ...(data?.trending ?? []), ...(data?.recent ?? [])]
    .filter((t, i, all) => t.id !== spotlight?.id && all.findIndex((x) => x.id === t.id) === i)
    .slice(0, 2);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-10">
      {/* Hero */}
      <section className="cc-hero rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <HeroDecor dense />
        <div className="relative max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="cc-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white/90"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {MODULE_MOTTO}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="cc-display mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.02]"
          >
            Every talent
            <br />
            deserves to be <span className="relative inline-block cc-gradient-text">seen.<BrushStroke className="absolute -bottom-2 left-0 w-full h-3" color="#a78bfa" /></span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mt-4 text-white/75 text-base sm:text-lg max-w-xl">
            Art, music, dance, science, sport and everything in between - discover what your campus creates, and share your own.
          </motion.p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/talents/explore${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
            }}
            className="mt-6 flex flex-col sm:flex-row gap-2.5"
          >
            <label className="cc-glass flex flex-1 items-center gap-2 rounded-full pl-4 pr-2 h-12">
              <Search className="w-4 h-4 text-white/60 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search talents, creators, schools…"
                className="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
                aria-label="Search talents"
              />
            </label>
            {canCreate && (
              <Link
                to="/talents/new"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#1e1b4b] px-6 h-12 text-sm font-bold shadow-xl shadow-black/20 hover:-translate-y-0.5 transition-transform"
              >
                <Sparkles className="w-4 h-4 text-violet-600" />
                Share your talent
              </Link>
            )}
          </form>

          {data && (
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: "Showcases", value: data.totalShowcases },
                { label: "Creators", value: data.totalCreators },
                { label: "Schools", value: data.totalSchools },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-xs uppercase tracking-wider text-white/55">{s.label}</dt>
                  <dd className="cc-display text-2xl font-bold">{formatCount(s.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {isError && <EmptyState emoji="🛰️" title="We couldn't load the showcase" body={(error as Error).message} />}

      {/* Spotlight */}
      {(isLoading || spotlight) && (
        <section>
          <SectionHeader emoji="🌟" title="Featured talents" subtitle="Hand-picked by schools across Creative Campus" />
          <div className="grid lg:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                <CardSkeleton className="lg:col-span-2 lg:row-span-2" />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : (
              <>
                <TalentCard talent={spotlight!} variant="feature" className="lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:min-h-[420px]" />
                {sideFeatured.map((t) => (
                  <TalentCard key={t.id} talent={t} variant="feature" className="sm:aspect-[16/10] lg:aspect-auto lg:min-h-[200px]" />
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {/* Categories */}
      {data && data.categories.length > 0 && (
        <section>
          <SectionHeader emoji="🧭" title="Browse by talent" action={<Link to="/talents/explore" className="text-sm font-medium text-violet-600 dark:text-violet-300 inline-flex items-center gap-1 hover:gap-2 transition-all">All categories <ArrowRight className="w-4 h-4" /></Link>} />
          <div className="cc-rail -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2">
            {data.categories.map(({ category, count }) => {
              const config = CATEGORY_CONFIG[category];
              return (
                <Link
                  key={category}
                  to={`/talents/explore?category=${category}`}
                  className={`group relative shrink-0 w-36 sm:w-40 h-28 overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-3.5 text-white shadow-md hover:-translate-y-1 hover:shadow-xl transition-all`}
                >
                  <span className="absolute -right-3 -bottom-4 text-6xl opacity-30 group-hover:scale-110 group-hover:rotate-6 transition-transform" aria-hidden="true">
                    {config.emoji}
                  </span>
                  <span className="relative block text-sm font-semibold leading-tight">{config.label}</span>
                  <span className="relative block text-xs text-white/80 mt-1">{count} showcase{count === 1 ? "" : "s"}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <TalentRail emoji="🔥" title="Trending now" subtitle="The most appreciated work this month" talents={data?.trending} loading={isLoading} />
      <TalentRail emoji="🏫" title="From your school" subtitle="Celebrate the people you see every day" talents={data?.mySchool} loading={isLoading} />
      <TalentRail emoji="🆕" title="Recently added" talents={data?.recent} loading={isLoading} action={<Link to="/talents/explore?sort=recent" className="text-sm font-medium text-violet-600 dark:text-violet-300 mr-1">See all</Link>} />
      <TalentRail emoji="💖" title="Most appreciated" talents={data?.mostAppreciated} loading={isLoading} />
      <TalentRail emoji="👁" title="Most viewed" talents={data?.mostViewed} loading={isLoading} />
      <TalentRail emoji="🍎" title="Teacher talents" subtitle="Our teachers have talents too" talents={data?.teacherTalents} loading={isLoading} />

      {data && data.totalShowcases === 0 && (
        <EmptyState
          emoji="🎨"
          title="The stage is set - be the first!"
          body="No talents have been published yet. Share something you're proud of and inspire your campus."
          action={
            canCreate ? (
              <Link to="/talents/new" className="inline-flex items-center gap-2 rounded-full cc-gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-md">
                <Sparkles className="w-4 h-4" /> Share your talent
              </Link>
            ) : undefined
          }
        />
      )}

      {/* Journey */}
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <h2 className="cc-display text-xl font-bold text-foreground text-center">How Creative Campus works</h2>
        <ol className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {JOURNEY.map((step, i) => (
            <li key={step.title} className="relative text-center">
              <span className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-sky-500/15 flex items-center justify-center text-2xl">{step.emoji}</span>
              <p className="mt-2 text-sm font-semibold text-foreground">
                <span className="text-muted-foreground mr-1">{i + 1}.</span>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center cc-display text-lg font-semibold cc-gradient-text-strong">{MODULE_TAGLINE}</p>
      </section>
    </div>
  );
}
