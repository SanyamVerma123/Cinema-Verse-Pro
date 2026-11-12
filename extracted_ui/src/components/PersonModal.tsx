import { useEffect, useMemo, useState } from "react";
import { img, matchOf, titleOf, typeOf, useTmdb, yearOf, type Media } from "../lib/tmdb";
import { PosterCard, type Open } from "./Rows";
import { SlideTabs } from "./Select";
import { Chip, Icon, RoundBtn } from "./ui";

export function PersonModal({
  personId,
  onClose,
  onOpenMedia,
}: {
  personId: number;
  onClose: () => void;
  onOpenMedia: Open;
}) {
  const { data: p, loading } = useTmdb<any>(`/person/${personId}`, {
    append_to_response: "combined_credits,external_ids",
  });
  const [bioExpanded, setBioExpanded] = useState(false);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Extract and sort performed filmography
  const credits = useMemo(() => {
    const rawCast: any[] = p?.combined_credits?.cast ?? [];
    const seen = new Set<number>();
    const valid = rawCast
      .filter((c) => c && c.id && c.poster_path && !seen.has(c.id) && seen.add(c.id))
      .map((c) => ({
        ...c,
        media_type: c.media_type || (c.first_air_date ? "tv" : "movie"),
      })) as Media[];

    // Sort by popularity and vote count
    return valid.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }, [p]);

  const filteredCredits = useMemo(() => {
    if (filter === "all") return credits;
    return credits.filter((c) => typeOf(c) === filter);
  }, [credits, filter]);

  // Age calculation
  const age = useMemo(() => {
    if (!p?.birthday) return null;
    const b = new Date(p.birthday);
    const end = p.deathday ? new Date(p.deathday) : new Date();
    let diff = end.getFullYear() - b.getFullYear();
    const m = end.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < b.getDate())) diff--;
    return diff;
  }, [p]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center animate-[fade_.3s_both] bg-black/80 backdrop-blur-md sm:p-6 lg:p-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p?.name || "Actor Profile"}
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative size-full max-w-[1050px] animate-[modalIn_.55s_cubic-bezier(.16,1,.3,1)_both] overflow-y-auto rounded-none sm:rounded-2xl border border-white/10 bg-[#121319] sm:shadow-2xl sm:shadow-black"
      >
        {/* Close Button */}
        <div className="absolute right-3 top-3 z-30 sm:right-4 sm:top-4">
          <RoundBtn icon="close" label="Close" onClick={onClose} size={40} />
        </div>

        {/* Actor Spotlight Header & Biography */}
        <div className="relative border-b border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start lg:gap-8">
            {/* Actor Profile Image */}
            <div className="relative aspect-[3/4] w-36 shrink-0 overflow-hidden rounded-2xl border-2 border-white/15 bg-panel shadow-2xl sm:w-48 lg:w-56">
              {p?.profile_path ? (
                <img
                  src={img(p.profile_path, "w500")}
                  alt={p.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-panel text-white/40">
                  <Icon name="user" size={48} />
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-accent backdrop-blur-md border border-white/10">
                {p?.known_for_department || "Acting"}
              </span>
            </div>

            {/* Actor Bio & Details */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                Actor Profile &amp; Biography
              </span>
              <h1 className="mt-1 font-display text-2xl font-black text-white sm:text-4xl lg:text-5xl">
                {p?.name || (loading ? "Loading Artist..." : "Artist Profile")}
              </h1>

              {/* Badges / Key Metadata */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70 sm:justify-start">
                {age !== null && (
                  <Chip className="bg-white/5 border-white/15">
                    {p.deathday ? `Lived to ${age}` : `${age} years old`}
                  </Chip>
                )}
                {p?.birthday && (
                  <span className="text-white/60">
                    Born {p.birthday} {p.place_of_birth ? `in ${p.place_of_birth}` : ""}
                  </span>
                )}
                {credits.length > 0 && (
                  <Chip className="bg-accent/15 border-accent/30 text-accent font-bold">
                    {credits.length} Titles Performed
                  </Chip>
                )}
              </div>

              {/* Biography Prose */}
              <div className="mt-4">
                <p
                  className={`text-xs sm:text-sm leading-relaxed text-white/75 ${
                    bioExpanded ? "" : "line-clamp-4"
                  }`}
                >
                  {p?.biography ||
                    (loading
                      ? "Loading full biography from global archive..."
                      : `${p?.name || "This artist"} is an internationally celebrated performer with a prolific career across world-class cinema and television.`)}
                </p>
                {p?.biography && p.biography.length > 280 && (
                  <button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    className="mt-2 text-xs font-bold text-accent hover:underline"
                  >
                    {bioExpanded ? "Show less" : "Read full biography ›"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filmography Section */}
        <div className="p-5 sm:p-8 lg:p-10">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                Filmography &amp; Performances
              </h2>
              <p className="text-xs text-white/50">
                Explore movies and series featuring {p?.name || "this artist"}
              </p>
            </div>

            {/* Filter Tabs */}
            <SlideTabs
              variant="pill"
              label="Format"
              items={[
                { id: "all", label: `All (${credits.length})` },
                {
                  id: "movie",
                  label: `Movies (${credits.filter((c) => typeOf(c) === "movie").length})`,
                },
                {
                  id: "tv",
                  label: `Series (${credits.filter((c) => typeOf(c) === "tv").length})`,
                },
              ]}
              value={filter}
              onChange={(v) => setFilter(v as any)}
            />
          </div>

          {/* Filmography Grid */}
          {filteredCredits.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 md:grid-cols-5 lg:grid-cols-6">
              {filteredCredits.slice(0, 36).map((m, idx) => (
                <div
                  key={`${m.media_type}-${m.id}`}
                  className="relative aspect-2/3 [&>div]:!w-full"
                >
                  <PosterCard m={m} i={idx % 12} onOpen={onOpenMedia} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-white/40">
              No titles found in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
