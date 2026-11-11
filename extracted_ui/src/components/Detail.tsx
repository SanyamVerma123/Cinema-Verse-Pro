import { useEffect, useMemo, useState } from "react";
import { genreNames } from "../lib/genres";
import { inList, listStore, toggleList, useStore } from "../lib/store";
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
}) {
  const type = typeOf(media);
  const { data: d } = useTmdb<any>(`/${type}/${media.id}`, {
    append_to_response: APPEND,
    include_image_language: "en,null",
  });
  const list = useStore(listStore);
  const [tab, setTab] = useState("");
  const [season, setSeason] = useState(1);
  const [videoOn, setVideoOn] = useState(false);
  const seasons: any[] = (d?.seasons ?? []).filter((s: any) => s.season_number > 0);
  const { data: sd } = useTmdb<any>(type === "tv" && d ? `/tv/${media.id}/season/${season}` : null);
  const m: Media = { ...media, ...(d ?? {}) };
  const trailer = pickTrailer(d?.videos?.results);
  const logo = d?.images?.logos?.find((l: any) => l.iso_639_1 === "en") || d?.images?.logos?.[0];
  const cast: any[] = d?.credits?.cast ?? [];
  const crew: any[] = d?.credits?.crew ?? [];
  const more: Media[] = useMemo(() => {
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
    const t = setTimeout(() => setVideoOn(true), 1500);
    return () => clearTimeout(t);
  }, []);
  const scrollRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setTab("");
    setSeason(1);
  }, [media.id, scrollRef]);

  const first = type === "tv" ? { season: 1, episode: 1, label: "S1 · E1" } : {};
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/75 backdrop-blur-sm sm:p-6 lg:p-10"
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
        className="no-scrollbar relative size-full max-w-[1100px] animate-[rise_.4s_both] overflow-y-auto bg-[#141419] sm:rounded-2xl sm:shadow-2xl sm:shadow-black"
      >
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
              title="Trailer"
              allow="autoplay; encrypted-media"
              tabIndex={-1}
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[56.25vw] min-h-full w-full min-w-[177.78%] -translate-x-1/2 -translate-y-1/2 scale-110 animate-[fade_1s_both]"
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${trailer.key}&playsinline=1&iv_load_policy=3`}
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
              <button
                onClick={() => onPlay(m, first)}
                className="flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-black hover:bg-white/85 sm:h-12 sm:px-8"
              >
                <Icon name="play" size={20} />
                Play
              </button>
              {trailer && (
                <button
                  onClick={() => setTab("Trailers & clips")}
                  className="hidden h-12 items-center gap-2 rounded-lg bg-white/20 px-5 text-sm font-semibold backdrop-blur hover:bg-white/30 sm:flex"
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
                  {providers.slice(0, 8).map((p) => (
                    <img
                      key={p.provider_id}
                      title={p.provider_name}
                      src={img(p.logo_path, "w92")}
                      alt={p.provider_name}
                      className="size-10 rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Fact
              k="Cast"
              v={cast
                .slice(0, 5)
                .map((c) => c.name)
                .join(", ")}
            />
            <Fact
              k={type === "tv" ? "Created by" : "Director"}
              v={
                type === "tv"
                  ? (d?.created_by ?? []).map((c: any) => c.name).join(", ")
                  : directors.join(", ")
              }
            />
            <Fact k="Writers" v={writers.slice(0, 3).join(", ")} />
            <Fact
              k="Genres"
              v={
                (d?.genres ?? []).map((g: any) => g.name).join(", ") ||
                genreNames(m.genre_ids).join(", ")
              }
            />
            <Fact k="Language" v={d?.original_language?.toUpperCase()} />
            <Fact k="Status" v={d?.status} />
            <Fact k="Network" v={(d?.networks ?? []).map((n: any) => n.name).join(", ")} />
            <Fact k="Budget" v={money(d?.budget)} />
            <Fact k="Revenue" v={money(d?.revenue)} />
            <Fact
              k="Studio"
              v={(d?.production_companies ?? [])
                .slice(0, 3)
                .map((c: any) => c.name)
                .join(", ")}
            />
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {keywords.slice(0, 8).map((k) => (
                  <span
                    key={k.id}
                    className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/60"
                  >
                    {k.name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-3 text-xs font-semibold text-accent">
              {d?.external_ids?.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${d.external_ids.imdb_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1"
                >
                  IMDb <Icon name="ext" size={13} />
                </a>
              )}
              {d?.homepage && (
                <a
                  href={d.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1"
                >
                  Website <Icon name="ext" size={13} />
                </a>
              )}
            </div>
          </div>
        </div>

        {tabs.length > 0 && (
          <div className="px-5 pb-12 sm:px-10">
            <div
              className="no-scrollbar sticky top-0 z-20 -mx-5 flex gap-1 overflow-x-auto border-b border-white/10 bg-[#141419]/95 px-5 backdrop-blur sm:-mx-10 sm:px-10"
              role="tablist"
            >
              {tabs.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={t === active}
                  onClick={() => setTab(t)}
                  className={`relative shrink-0 px-4 py-3.5 text-sm font-semibold transition ${t === active ? "text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  {t}
                  {t === active && (
                    <i className="absolute inset-x-3 bottom-0 h-0.5 rounded bg-accent" />
                  )}
                </button>
              ))}
            </div>
            <div className="pt-6">
              {active === "Episodes" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold">Episodes</h3>
                    <select
                      value={season}
                      onChange={(e) => setSeason(+e.target.value)}
                      aria-label="Season"
                      className="rounded-lg border border-white/15 bg-panel px-3 py-2 text-sm"
                    >
                      {seasons.map((s) => (
                        <option key={s.season_number} value={s.season_number}>
                          {s.name} ({s.episode_count})
                        </option>
                      ))}
                    </select>
                  </div>
                  <ol className="divide-y divide-white/8">
                    {(sd?.episodes ?? []).map((e: any) => (
                      <li key={e.id}>
                        <button
                          onClick={() =>
                            onPlay(m, {
                              season,
                              episode: e.episode_number,
                              label: `S${season} · E${e.episode_number} · ${e.name}`,
                            })
                          }
                          className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-white/6 sm:gap-5"
                        >
                          <span className="hidden w-6 text-center font-display text-xl text-white/40 sm:block">
                            {e.episode_number}
                          </span>
                          <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-panel sm:w-44">
                            {e.still_path && (
                              <img
                                src={img(e.still_path, "w300")}
                                alt=""
                                loading="lazy"
                                className="size-full object-cover"
                              />
                            )}
                            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                              <Icon name="play" size={28} />
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex justify-between gap-3 text-sm font-semibold">
                              <span className="truncate">
                                {e.episode_number}. {e.name}
                              </span>
                              <span className="shrink-0 text-xs font-normal text-white/50">
                                {e.runtime ? `${e.runtime}m` : ""}
                              </span>
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-white/50">
                              {e.overview}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {active === "More like this" && (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
                  {more.slice(0, 20).map((x) => (
                    <div key={x.id} className="relative aspect-2/3 [&>div]:!w-full">
                      <PosterCard m={x} onOpen={onOpen} />
                    </div>
                  ))}
                </div>
              )}
              {active === "Trailers & clips" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {videos.slice(0, 8).map((v) => (
                    <figure key={v.key}>
                      <div className="aspect-video overflow-hidden rounded-xl bg-black">
                        <iframe
                          title={v.name}
                          loading="lazy"
                          allowFullScreen
                          src={`https://www.youtube-nocookie.com/embed/${v.key}?rel=0`}
                          className="size-full border-0"
                        />
                      </div>
                      <figcaption className="mt-2 text-sm font-semibold">
                        {v.name} <span className="text-xs font-normal text-white/45">{v.type}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
              {active === "Cast & crew" && (
                <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
                  {[
                    ...cast.slice(0, 18),
                    ...crew.filter((c) => c.job === "Director").slice(0, 2),
                  ].map((p, i) => (
                    <button
                      key={`${p.id}-${i}`}
                      onClick={() =>
                        onCatalog({
                          title: `Starring ${p.name}`,
                          path: "/discover/movie",
                          params: { with_cast: String(p.id), sort_by: "popularity.desc" },
                          kind: "movie",
                        })
                      }
                      className="group text-center"
                    >
                      <span className="mx-auto block aspect-square w-full max-w-28 overflow-hidden rounded-full bg-panel ring-1 ring-white/10 group-hover:ring-accent">
                        {p.profile_path ? (
                          <img
                            src={img(p.profile_path, "w185")}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="grid size-full place-items-center text-xl text-white/40">
                            {p.name[0]}
                          </span>
                        )}
                      </span>
                      <b className="mt-2 line-clamp-1 text-xs">{p.name}</b>
                      <i className="line-clamp-1 text-[11px] not-italic text-white/45">
                        {p.character || p.job}
                      </i>
                    </button>
                  ))}
                </div>
              )}
              {active === "Reviews" && (
                <div className="space-y-4">
                  {reviews.slice(0, 6).map((r) => (
                    <article
                      key={r.id}
                      className="rounded-xl border border-white/8 bg-white/4 p-4 sm:p-5"
                    >
                      <header className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-full bg-accent/30 text-sm font-bold">
                          {(r.author || "?")[0].toUpperCase()}
                        </span>
                        <b className="text-sm">{r.author}</b>
                        {r.author_details?.rating && (
                          <span className="ml-auto flex items-center gap-1 text-xs text-amber">
                            <Icon name="star" size={12} />
                            {r.author_details.rating}/10
                          </span>
                        )}
                      </header>
                      <p className="mt-3 line-clamp-5 text-[13px] leading-relaxed text-white/65">
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
