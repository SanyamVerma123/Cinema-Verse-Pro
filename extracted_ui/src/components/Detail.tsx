import { useEffect, useMemo, useRef, useState } from "react";
import { genreNames } from "../lib/genres";
import {
  daysUntilRelease,
  inList,
  isReminded,
  isUpcoming,
  listStore,
  releaseDateLabel,
  remindersStore,
  toggleList,
  toggleReminder,
  useStore,
} from "../lib/store";
import {
  certOf,
  img,
  matchOf,
  pickTrailer,
  runtimeLabel,
  titleOf,
  typeOf,
  useTmdb,
  yearOf,
  type Media,
} from "../lib/tmdb";
import { PosterCard, type Open } from "./Rows";
import { Select, SlideTabs } from "./Select";
import { Chip, Icon, RoundBtn } from "./ui";

const APPEND =
  "videos,credits,similar,recommendations,reviews,watch/providers,keywords,images,external_ids,content_ratings,release_dates";
const money = (n?: number) => (n ? `$${n.toLocaleString("en-US")}` : "");

function Fact({ k, v }: { k: string; v?: string | null }) {
  return v ? (
    <p className="text-[13px] leading-relaxed">
      <span className="text-white/45">{k}: </span>
      {v}
    </p>
  ) : null;
}

export function Detail({
  media,
  autoPlay,
  onClose,
  onOpen,
  onPlay,
  onCatalog,
  onOpenPerson,
}: {
  media: Media;
  autoPlay?: boolean;
  onClose: () => void;
  onOpen: Open;
  onPlay: (m: Media, o?: { season?: number; episode?: number; label?: string }) => void;
  onCatalog: (c: {
    title: string;
    path: string;
    params?: Record<string, string>;
    kind: "movie" | "tv";
  }) => void;
  onOpenPerson?: (personId: number) => void;
}) {
  const type = typeOf(media);
  const { data: d } = useTmdb<any>(`/${type}/${media.id}`, { append_to_response: APPEND });
  const [season, setSeason] = useState(1);
  const { data: sd } = useTmdb<any>(type === "tv" ? `/tv/${media.id}/season/${season}` : null);
  const [tab, setTab] = useState("");
  const [videoOn, setVideoOn] = useState(false);
  const [trailerMuted, setTrailerMuted] = useState(true);
  const trailerFrameRef = useRef<HTMLIFrameElement>(null);
  const list = useStore(listStore);
  const reminders = useStore(remindersStore);

  const m: Media = d ?? media;
  const upcoming = isUpcoming(m);
  const reminded = isReminded(reminders, m);
  const relDate = releaseDateLabel(m);
  const days = daysUntilRelease(m);
  const trailer = pickTrailer(d?.videos?.results);
  const logo = (d?.images?.logos ?? []).find(
    (l: any) => l.iso_639_1 === "en" || !l.iso_639_1,
  );
  const cast: any[] = d?.credits?.cast ?? [];
  const crew: any[] = d?.credits?.crew ?? [];
  const seasons: any[] = (d?.seasons ?? []).filter((s: any) => s.season_number > 0);
  const more = useMemo(() => {
    const seen = new Set<number>();
    return [...(d?.recommendations?.results ?? []), ...(d?.similar?.results ?? [])]
      .filter((x: Media) => x.poster_path && !seen.has(x.id) && seen.add(x.id))
      .map((x: Media) => ({ ...x, media_type: x.media_type ?? type }));
  }, [d, type]);
  const videos: any[] = (d?.videos?.results ?? []).filter((v: any) => v.site === "YouTube");
  const reviews: any[] = d?.reviews?.results ?? [];
  const tabs = [
    ...(type === "tv" && seasons.length ? ["Episodes"] : []),
    ...(more.length ? ["More like this"] : []),
    ...(videos.length ? ["Trailers & clips"] : []),
    ...(cast.length ? ["Cast & crew"] : []),
    ...(reviews.length ? ["Reviews"] : []),
  ];
  const active = tabs.includes(tab) ? tab : tabs[0];
  const regions = d?.["watch/providers"]?.results ?? {};
  const region = regions.US ?? regions[Object.keys(regions)[0]];
  const providers: any[] = [
    ...(region?.flatrate ?? []),
    ...(region?.rent ?? []),
    ...(region?.buy ?? []),
  ].filter((p, i, a) => a.findIndex((q) => q.provider_id === p.provider_id) === i);
  const directors = crew.filter((c) => c.job === "Director").map((c) => c.name);
  const writers = [
    ...new Set(crew.filter((c) => /Writer|Screenplay|Creator/.test(c.job)).map((c) => c.name)),
  ];
  const keywords: any[] = d?.keywords?.keywords ?? d?.keywords?.results ?? [];
  const cert = certOf(d);
  const meta = d?.runtime
    ? runtimeLabel(d.runtime)
    : d?.number_of_seasons
      ? `${d.number_of_seasons} season${d.number_of_seasons > 1 ? "s" : ""}`
      : "";

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

  useEffect(() => {
    if (autoPlay && d)
      onPlay(
        m,
        type === "tv" ? { season: 1, episode: 1, label: "S1 · E1" } : {},
      ); /* eslint-disable-next-line */
  }, [!!d]);

  useEffect(() => {
    const t = setTimeout(() => setVideoOn(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const scrollRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setTab("");
    setSeason(1);
    setTrailerMuted(true);
  }, [media.id, scrollRef]);

  const toggleTrailerSound = () => {
    const next = !trailerMuted;
    setTrailerMuted(next);
    trailerFrameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
      "*",
    );
  };

  const first = type === "tv" ? { season: 1, episode: 1, label: "S1 · E1" } : {};
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center animate-[fade_.3s_both] bg-black/75 backdrop-blur-sm sm:p-6 lg:p-10"
      onClick={onClose}
    >
      <div
        ref={(el) => {
          scrollRef.current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-label={titleOf(media)}
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative size-full max-w-[1100px] animate-[modalIn_.55s_cubic-bezier(.16,1,.3,1)_both] overflow-y-auto bg-[#141419] sm:rounded-2xl sm:shadow-2xl sm:shadow-black"
      >
        {/* Left Corner: Professional Speaker Toggle Icon */}
        <div className="absolute left-3 top-3 z-30 sm:left-4 sm:top-4">
          <button
            type="button"
            onClick={toggleTrailerSound}
            aria-label={trailerMuted ? "Unmute trailer audio" : "Mute trailer audio"}
            title={trailerMuted ? "Unmute trailer audio" : "Mute trailer audio"}
            className="group relative flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/85 hover:border-white/30 active:scale-95 shadow-lg shadow-black/50"
          >
            <Icon
              name={trailerMuted ? "mute" : "volume"}
              size={19}
              className={`transition-transform duration-200 ${trailerMuted ? "text-white/70" : "text-accent scale-105"}`}
            />
            <span className="sr-only">{trailerMuted ? "Unmute" : "Mute"}</span>
          </button>
        </div>

        {/* Right Corner: Close Button */}
        <div className="absolute right-3 top-3 z-30 sm:right-4 sm:top-4">
          <RoundBtn icon="close" label="Close" onClick={onClose} size={40} />
        </div>

        <div className="relative isolate aspect-[4/5] w-full overflow-hidden sm:aspect-video sm:max-h-[620px]">
          <img
            src={img(m.backdrop_path || m.poster_path, "w1280")}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover object-top"
          />
          {videoOn && trailer && window.matchMedia("(min-width:640px)").matches && (
            <iframe
              ref={trailerFrameRef}
              title="Trailer"
              allow="autoplay; encrypted-media"
              tabIndex={-1}
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[56.25vw] min-h-full w-full min-w-[177.78%] -translate-x-1/2 -translate-y-1/2 scale-110 animate-[fade_1s_both]"
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${trailer.key}&playsinline=1&iv_load_policy=3&enablejsapi=1`}
            />
          )}
          <div className="absolute inset-0 -z-[5] bg-linear-to-t from-[#141419] via-[#141419]/30 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 sm:inset-x-10 sm:bottom-8">
            {logo ? (
              <img
                src={img(logo.file_path, "w500")}
                alt={titleOf(m)}
                className="max-h-24 max-w-[75%] object-contain object-left drop-shadow-2xl sm:max-h-32"
              />
            ) : (
              <h2 className="font-display text-3xl font-extrabold leading-none tracking-tighter drop-shadow-2xl sm:text-5xl">
                {titleOf(m)}
              </h2>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {upcoming ? (
                <button
                  onClick={() => toggleReminder(m)}
                  className="btn-shine relative flex h-11 items-center gap-2 overflow-hidden rounded-lg bg-linear-to-r from-red-600 to-accent px-6 text-sm font-bold text-white hover:brightness-110 sm:h-12 sm:px-8 shadow-xl shadow-red-600/30 active:scale-95"
                >
                  <Icon name={reminded ? "check" : "bell"} size={19} />
                  {reminded ? "Reminder Set" : "Notify Me"}
                </button>
              ) : (
                <button
                  onClick={() => onPlay(m, first)}
                  className="btn-shine relative flex h-11 items-center gap-2 overflow-hidden rounded-lg bg-white px-6 text-sm font-bold text-black hover:bg-white/85 sm:h-12 sm:px-8 shadow-xl active:scale-95"
                >
                  <Icon name="play" size={20} />
                  Play
                </button>
              )}
              {trailer && (
                <button
                  onClick={() => setTab("Trailers & clips")}
                  className="h-11 sm:h-12 flex items-center gap-2 rounded-lg bg-white/20 px-5 text-sm font-semibold backdrop-blur hover:bg-white/30 active:scale-95 transition"
                >
                  Trailer
                </button>
              )}
              <RoundBtn
                icon={inList(list, m) ? "check" : "plus"}
                label="My List"
                active={inList(list, m)}
                size={44}
                onClick={() => toggleList(m)}
              />
            </div>
            {upcoming && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-600/20 px-3.5 py-2.5 text-xs text-white backdrop-blur-md">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-red-600 text-white font-bold">
                  <Icon name="bell" size={13} />
                </span>
                <span className="font-semibold">
                  Upcoming Release • Scheduled for {relDate} {days !== null ? `(${days === 0 ? "Today" : `in ${days} days`})` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 px-5 pb-6 pt-2 sm:px-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-white/75">
              {matchOf(m) !== null && <b className="text-emerald-400">{matchOf(m)}% match</b>}
              <span>{yearOf(m)}</span>
              {cert && <Chip>{cert}</Chip>}
              {meta && <span>{meta}</span>}
              <Chip>HD</Chip>
              {d?.vote_count ? (
                <span className="flex items-center gap-1 text-amber">
                  <Icon name="star" size={13} />
                  {m.vote_average?.toFixed(1)}{" "}
                  <i className="not-italic text-white/40">({d.vote_count.toLocaleString()})</i>
                </span>
              ) : null}
            </div>
            {d?.tagline && (
              <p className="mt-4 font-display text-lg italic text-white/80">“{d.tagline}”</p>
            )}
            <p className="mt-3 text-[15px] leading-relaxed text-white/80">{m.overview}</p>
            {providers.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
                  Also available on
                </p>
                <div className="flex flex-wrap gap-2">
                  {providers.map((p: any) => (
                    <img
                      key={p.provider_id}
                      src={img(p.logo_path, "w92")}
                      alt={p.provider_name}
                      title={p.provider_name}
                      className="size-9 rounded-lg border border-white/10"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3 border-t border-white/8 pt-4 text-xs text-white/70 lg:border-t-0 lg:pt-0">
            <Fact
              k="Genres"
              v={m.genre_ids ? genreNames(m.genre_ids).join(", ") : d?.genres?.map((g: any) => g.name).join(", ")}
            />
            <Fact
              k="Cast"
              v={cast
                .slice(0, 5)
                .map((c) => c.name)
                .join(", ")}
            />
            {directors.length > 0 && <Fact k="Director" v={directors.join(", ")} />}
            {writers.length > 0 && <Fact k="Writer" v={writers.join(", ")} />}
            {d?.original_language && (
              <Fact k="Original language" v={d.original_language.toUpperCase()} />
            )}
            {d?.budget > 0 && <Fact k="Budget" v={money(d.budget)} />}
            {d?.revenue > 0 && <Fact k="Box office" v={money(d.revenue)} />}
            {keywords.length > 0 && (
              <div className="pt-2">
                <span className="mb-1.5 block text-white/45">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.slice(0, 10).map((k: any) => (
                    <button
                      key={k.id}
                      onClick={() =>
                        onCatalog({
                          title: k.name,
                          path: `/discover/${type}`,
                          params: { with_keywords: String(k.id) },
                          kind: type,
                        })
                      }
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                      {k.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {tabs.length > 0 && (
          <div className="px-5 pb-12 sm:px-10">
            <div className="no-scrollbar sticky top-0 z-20 -mx-5 overflow-x-auto border-b border-white/10 bg-[#141419]/95 px-5 backdrop-blur sm:-mx-10 sm:px-10">
              <SlideTabs
                variant="line"
                label="Sections"
                items={tabs.map((t) => ({ id: t, label: t }))}
                value={active}
                onChange={setTab}
              />
            </div>
            <div key={active} className="animate-[rise_.5s_cubic-bezier(.16,1,.3,1)_both] pt-6">
              {active === "Episodes" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold">Episodes</h3>
                    <Select
                      ariaLabel="Season"
                      label="Season"
                      value={String(season)}
                      onChange={(v) => setSeason(+v)}
                      options={seasons.map((s) => ({
                        value: String(s.season_number),
                        label: s.name,
                        hint: `${s.episode_count} eps`,
                      }))}
                    />
                  </div>
                  <ol className="divide-y divide-white/8">
                    {(sd?.episodes ?? []).map((e: any) => (
                      <li key={e.id} className="group py-4">
                        <button
                          onClick={() =>
                            onPlay(m, {
                              season: e.season_number,
                              episode: e.episode_number,
                              label: `S${e.season_number} · E${e.episode_number}`,
                            })
                          }
                          className="flex w-full items-start gap-4 text-left"
                        >
                          <span className="pt-2 font-display text-lg font-bold text-white/40 group-hover:text-white">
                            {e.episode_number}
                          </span>
                          <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-panel sm:w-44">
                            {e.still_path ? (
                              <img
                                src={img(e.still_path, "w500")}
                                alt=""
                                className="size-full object-cover transition group-hover:scale-105"
                              />
                            ) : null}
                            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                              <span className="grid size-9 place-items-center rounded-full bg-white text-black">
                                <Icon name="play" size={14} />
                              </span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="truncate font-semibold">{e.name}</h4>
                              {e.runtime && (
                                <span className="shrink-0 text-xs text-white/50">
                                  {e.runtime}m
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/60">
                              {e.overview}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {active === "More like this" && (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
                  {more.slice(0, 20).map((x, n) => (
                    <div key={x.id} className="relative aspect-2/3 [&>div]:!w-full">
                      <PosterCard m={x} i={n} onOpen={onOpen} />
                    </div>
                  ))}
                </div>
              )}
              {active === "Trailers & clips" && (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {videos.map((v) => (
                    <div key={v.id} className="overflow-hidden rounded-xl bg-panel">
                      <div className="aspect-video w-full bg-black">
                        <iframe
                          title={v.name}
                          allow="autoplay; encrypted-media; fullscreen"
                          allowFullScreen
                          src={`https://www.youtube-nocookie.com/embed/${v.key}?rel=0`}
                          className="size-full border-0"
                        />
                      </div>
                      <p className="truncate p-3 text-xs font-semibold">{v.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {active === "Cast & crew" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {cast.slice(0, 25).map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        onOpenPerson
                          ? onOpenPerson(c.id)
                          : onCatalog({
                              title: c.name,
                              path: "/discover/movie",
                              params: { with_cast: String(c.id) },
                              kind: "movie",
                            })
                      }
                      className="group flex items-center gap-3 rounded-xl bg-panel p-2.5 text-left transition hover:bg-white/10"
                    >
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                        {c.profile_path ? (
                          <img
                            src={img(c.profile_path, "w185")}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold group-hover:text-accent">
                          {c.name}
                        </p>
                        <p className="truncate text-[11px] text-white/50">{c.character}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {active === "Reviews" && (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <article
                      key={r.id}
                      className="rounded-xl border border-white/10 bg-panel/70 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <b className="text-sm">{r.author}</b>
                        {r.author_details?.rating && (
                          <span className="flex items-center gap-1 text-xs text-amber">
                            <Icon name="star" size={12} />
                            {r.author_details.rating}/10
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-6 text-xs leading-relaxed text-white/70">
                        {r.content}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
