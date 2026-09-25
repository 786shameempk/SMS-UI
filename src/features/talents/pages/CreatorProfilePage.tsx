import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { getCreatorProfile } from "../api";
import { formatCount } from "../hooks";
import { CategoryChip, CreatorAvatar, CreatorTypePill, EmptyState, SectionHeader } from "../components/Bits";
import { HeroDecor } from "../components/Decor";
import TalentCard, { TalentGrid } from "../components/TalentCard";

/** A creator's public talent profile - only ever built from content the viewer is allowed to see. */
export default function CreatorProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading, isError } = useQuery({ queryKey: ["talents", "creator", userId], queryFn: () => getCreatorProfile(userId!), enabled: !!userId });

  if (isError) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-10">
        <EmptyState emoji="🙈" title="No talents to show" body="This creator hasn't published anything you can see yet." />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5 space-y-8">
      <section className="cc-hero rounded-[2rem] px-6 pt-10 pb-8 sm:px-10">
        <HeroDecor dense />
        {isLoading || !data ? (
          <div className="relative h-40" />
        ) : (
          <div className="relative flex flex-wrap items-end gap-6">
            <CreatorAvatar creator={data.creator} size={112} ring className="shadow-2xl shadow-violet-950/50" />
            <div className="flex-1 min-w-[15rem]">
              <CreatorTypePill type={data.creator.type} onDark />
              <h1 className="cc-display text-3xl sm:text-4xl font-extrabold mt-2">{data.creator.name}</h1>
              <p className="text-white/70 mt-1">
                {data.creator.subtitle && <span>{data.creator.subtitle} · </span>}
                <Link to={`/talents/schools/${encodeURIComponent(data.tenantId)}`} className="hover:underline">
                  🏫 {data.schoolName}
                </Link>
              </p>
              {data.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.categories.map((c) => (
                    <span key={c} className="[&>span]:bg-white/15 [&>span]:text-white">
                      <CategoryChip category={c} size="sm" />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <dl className="flex gap-6 md:gap-8">
              {[
                { label: "Showcases", value: data.stats.showcases },
                { label: "Views", value: data.stats.views },
                { label: "Appreciations", value: data.stats.reactions },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <dd className="cc-display text-2xl sm:text-3xl font-bold">{formatCount(s.value)}</dd>
                  <dt className="text-xs uppercase tracking-wider text-white/55">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        )}
        {data?.isMe && (
          <Link to="/talents/mine" className="cc-glass absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
            <Pencil className="w-3.5 h-3.5" /> Manage my talents
          </Link>
        )}
      </section>

      {data && data.highlights.length > 0 && (
        <section>
          <SectionHeader emoji="🌟" title="Talent highlights" subtitle="Their most celebrated work" />
          <div className="grid md:grid-cols-3 gap-4">
            {data.highlights.map((t) => (
              <TalentCard key={t.id} talent={t} variant="feature" className="md:aspect-[4/5]" />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader emoji="🎨" title="All published showcases" />
        {data && data.showcases.length === 0 ? (
          <EmptyState emoji="🌱" title={data.isMe ? "Nothing published yet" : "Nothing to show yet"} body={data.isMe ? "Once a reviewer approves your work, it appears here." : undefined} />
        ) : (
          <TalentGrid talents={data?.showcases} loading={isLoading} />
        )}
      </section>
    </div>
  );
}
