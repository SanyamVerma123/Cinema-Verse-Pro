import { useEffect, useRef, useState, type ReactNode } from "react";
import { genreNames, GENRE_NAMES, MOVIE_GENRES, TV_GENRES } from "../lib/genres";
import type { RowDef, SectionDef } from "../lib/layout";
import { NETWORKS } from "../lib/layout";
import {
  daysUntilRelease,
  inList,
  isReminded,
  isUpcoming,
  keyOf,
  listStore,
  progressStore,
  releaseDateLabel,
  remindersStore,
  toggleList,
  toggleReminder,
  useStore,
} from "../lib/store";
import {
  img,
  matchOf,
  titleOf,
  typeOf,
  useList,
  useTmdb,
  yearOf,
  type Kind,
  type Media,
} from "../lib/tmdb";
import { Reveal } from "./Reveal";
import { Chip, Icon, RoundBtn } from "./ui";

export type Open = (m: Media, o?: { play?: boolean }) => void;
export type OpenCatalog = (c: {
  title: string;
  path: string;
  params?: Record<string, string>;
  kind: Kind | "all";
}) => void;

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setSeen(true), io.disconnect()),
      { rootMargin: "700px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

const W = {
  landscape: "w-[74vw] sm:w-[46vw] md:w-[31vw] lg:w-[23vw] xl:w-[19vw] 2xl:w-[16vw]",
  poster: "w-[36vw] sm:w-[25vw] md:w-[18vw] lg:w-[14vw] xl:w-[11.5vw] 2xl:w-[10vw]",
  top10: "w-[62vw] sm:w-[42vw] md:w-[32vw] lg:w-[25vw] xl:w-[21vw] 2xl:w-[17vw]",
  upcoming: "w-[78vw] sm:w-[50vw] md:w-[36vw] lg:w-[28vw] xl:w-[23vw]",
  people: "w-[28vw] sm:w-[19vw] md:w-[14vw] lg:w-[11vw] xl:w-[9vw]",
};

export function Scroller({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) =>
    ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: "smooth" });
  const btn =
    "absolute top-0 bottom-0 z-20 hidden w-14 items-center justify-center text-white opacity-0 transition group-hover/row:opacity-100 md:flex";
  return (
    <div className="group/row relative">
      <button
        aria-label="Scroll left"
        onClick={() => go(-1)}
        className={`${btn} left-0 bg-linear-to-r from-ink/90 to-transparent`}
      >
        <Icon name="left" size={28} />
      </button>
      <div
        ref={ref}
        className={`no-scrollbar -my-8 flex snap-x snap-proximity scroll-px-[4vw] gap-2.5 overflow-x-auto px-[4vw] py-8 sm:gap-3 ${className}`}
      >
        {children}
      </div>
      <button
        aria-label="Scroll right"
        onClick={() => go(1)}
        className={`${btn} right-0 bg-linear-to-l from-ink/90 to-transparent`}
      >
        <Icon name="right" size={28} />
      </button>
    </div>
  );
}

function Heading({ title, sub, onAll }: { title: string; sub?: string; onAll?: () => void }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 px-[4vw]">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl lg:text-[22px]">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
      </div>
      {onAll && (
        <button
          onClick={onAll}
          className="group flex shrink-0 items-center gap-1 text-xs font-semibold text-accent"
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all group-hover:max-w-24 group-hover:opacity-100">
            View all
          </span>
          <Icon name="right" size={16} />
        </button>
      )}
    </div>
  );
}

function Card({
  m,
  onOpen,
  variant,
  rank,
  progress,
  i = 0,
}: {
  m: Media;
  onOpen: Open;
  variant: "landscape" | "poster";
  rank?: number;
  progress?: number;
  i?: number;
}) {
  const list = useStore(listStore);
  const saved = inList(list, m);
  const src =
    variant === "landscape"
      ? img(m.backdrop_path || m.poster_path, "w780")
      : img(m.poster_path, "w342");
  const match = matchOf(m);
  return (
    <div
      style={rank ? undefined : { animationDelay: `${Math.min(i, 12) * 55}ms` }}
      className={`card-in ${variant === "landscape" ? "aspect-video" : "aspect-2/3"} group/card relative shrink-0 snap-start ${rank ? "w-full" : W[variant]} transition duration-300 [@media(hover:hover)]:hover:z-30 [@media(hover:hover)]:hover:scale-[1.12]`}
    >
      <button
        onClick={() => onOpen(m)}
        aria-label={`Open ${titleOf(m)}`}
        className="shine absolute inset-0 overflow-hidden rounded-lg bg-panel ring-1 ring-white/5 transition group-hover/card:shadow-2xl group-hover/card:shadow-black group-hover/card:ring-white/25"
      >
        {src ? (
          <img src={src} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center p-3 text-center text-sm font-semibold text-white/60">
            {titleOf(m)}
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-transparent to-transparent" />
        {variant === "landscape" && (
          <span className="absolute bottom-2.5 left-3 right-3 line-clamp-1 text-left text-[13px] font-bold drop-shadow">
            {titleOf(m)}
          </span>
        )}
        {progress !== undefined && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
            <i className="block h-full bg-accent" style={{ width: `${progress}%` }} />
          </span>
        )}
      </button>
      {/* Hover preview (hover-capable devices only) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-1 rounded-b-lg bg-linear-to-t from-black via-black/90 to-transparent p-2.5 pt-10 opacity-0 transition group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:opacity-100 [@media(hover:hover)]:block">
        <div className="flex items-center gap-1.5">
          <RoundBtn
            icon="play"
            label="Play"
            solid
            size={30}
            onClick={() => onOpen(m, { play: true })}
          />
          <RoundBtn
            icon={saved ? "check" : "plus"}
            label={saved ? "Remove from My List" : "Add to My List"}
            active={saved}
            size={30}
            onClick={() => toggleList(m)}
          />
          <span className="ml-auto" />
          <RoundBtn icon="down" label="More info" size={30} onClick={() => onOpen(m)} />
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {match !== null && <span className="font-bold text-emerald-400">{match}% match</span>}
          <span className="text-white/60">{yearOf(m)}</span>
          <Chip>{typeOf(m) === "tv" ? "SERIES" : "HD"}</Chip>
        </div>
        <p className="mt-1 line-clamp-1 text-[11px] text-white/55">
          {genreNames(m.genre_ids).join(" • ")}
        </p>
      </div>
    </div>
  );
}

export const PosterCard = (p: { m: Media; onOpen: Open; i?: number }) => (
  <Card {...p} variant="poster" />
);

function Top10Card({ m, rank, onOpen }: { m: Media; rank: number; onOpen: Open }) {
  return (
    <div
      style={{ animationDelay: `${rank * 60}ms` }}
      className={`card-in top10-card flex shrink-0 snap-start items-end ${W.top10}`}
    >
      <span
        className="top-num -mr-4 -mb-1 shrink-0 select-none font-display text-[clamp(90px,11vw,170px)] font-black leading-[.8]"
        aria-hidden="true"
      >
        {rank}
      </span>
      <div className="relative z-10 min-w-0 flex-1">
        <Card m={m} onOpen={onOpen} variant="poster" rank={rank} />
      </div>
    </div>
  );
}

function UpcomingCard({ m, onOpen, i = 0 }: { m: Media; onOpen: Open; i?: number }) {
  const reminders = useStore(remindersStore);
  const reminded = isReminded(reminders, m);
  const d = new Date(m.release_date || m.first_air_date || "");
  const ok = !isNaN(+d);
  const days = daysUntilRelease(m);

  return (
    <article
      style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
      className={`card-in shrink-0 snap-start ${W.upcoming}`}
    >
      <button
        onClick={() => onOpen(m)}
        className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-panel"
      >
        <img
          src={img(m.backdrop_path || m.poster_path, "w780")}
          alt=""
          loading="lazy"
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
        {ok && (
          <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1.5 text-center backdrop-blur">
            <b className="block font-display text-lg leading-none">{d.getDate()}</b>
            <i className="text-[10px] font-semibold not-italic tracking-widest text-accent">
              {d.toLocaleString("en", { month: "short" }).toUpperCase()}
            </i>
          </span>
        )}
        {days !== null && (
          <span className="absolute right-3 top-3 rounded-lg bg-linear-to-r from-red-600 to-accent px-2 py-1 text-[10px] font-bold text-white shadow-md backdrop-blur">
            {`In ${days} days`}
          </span>
        )}
      </button>
      <div className="mt-2.5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-bold">{titleOf(m)}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/50">
            {m.overview || genreNames(m.genre_ids).join(" • ")}
          </p>
        </div>
        <button
          onClick={() => toggleReminder(m)}
          className={`flex shrink-0 flex-col items-center gap-1 text-[10px] font-semibold transition active:scale-90 ${reminded ? "text-accent" : "text-white/70 hover:text-white"}`}
        >
          <Icon name={reminded ? "check" : "bell"} size={18} />
          {reminded ? "Saved" : "Remind me"}
        </button>
      </div>
    </article>
  );
}

function PersonCard({ p, onAll, i = 0 }: { p: Media; onAll: OpenCatalog; i?: number }) {
  const src = img(p.profile_path, "w185");
  return (
    <button
      onClick={() =>
        onAll({
          title: `Starring ${p.name}`,
          path: "/discover/movie",
          params: { with_cast: String(p.id), sort_by: "popularity.desc" },
          kind: "movie",
        })
      }
      style={{ animationDelay: `${Math.min(i, 14) * 45}ms` }}
      className={`card-in group shrink-0 snap-start text-center ${W.people}`}
    >
      <span className="relative mx-auto block aspect-square w-full overflow-hidden rounded-full bg-panel ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-accent">
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            className="size-full object-cover grayscale-[.3] transition group-hover:grayscale-0"
          />
        ) : (
          <span className="grid size-full place-items-center font-display text-2xl text-white/40">
            {p.name?.[0]}
          </span>
        )}
      </span>
      <b className="mt-2.5 line-clamp-1 text-xs font-semibold">{p.name}</b>
      <i className="line-clamp-1 text-[11px] not-italic text-white/45">
        {p.known_for?.[0] ? titleOf(p.known_for[0]) : p.known_for_department}
      </i>
    </button>
  );
}

function Skeleton({ variant }: { variant: RowDef["variant"] }) {
  return (
    <div className="flex gap-3 overflow-hidden px-[4vw]">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className={`shimmer shrink-0 rounded-lg ${W[variant]} ${variant === "poster" || variant === "top10" ? "aspect-2/3" : variant === "people" ? "aspect-square !rounded-full" : "aspect-video"}`}
        />
      ))}
    </div>
  );
}

export function Row({ def, onOpen, onAll }: { def: RowDef; onOpen: Open; onAll: OpenCatalog }) {
  const [ref, seen] = useInView<HTMLElement>();
  const need =
    def.variant === "poster" || def.variant === "top10"
      ? "poster"
      : def.variant === "people"
        ? "any"
        : "backdrop";
  const { items, loading, error } = useList(
    seen ? def.path : null,
    def.params ?? {},
    def.kind,
    need,
  );
  if (seen && !loading && !items.length)
    return error ? (
      <p className="px-[4vw] text-xs text-red-300/80">
        {def.title}: {error}
      </p>
    ) : null;
  const cap = def.variant === "top10" ? 10 : def.variant === "people" ? 20 : 20;
  const shown = (def.variant === "upcoming" ? items.filter(isUpcoming) : items).slice(0, cap);
  const all =
    def.variant === "people" || def.variant === "top10"
      ? undefined
      : () => onAll({ title: def.title, path: def.path, params: def.params, kind: def.kind });
  return (
    <section ref={ref} className="min-h-[180px]">
      <Heading title={def.title} sub={def.sub} onAll={all} />
      {loading || !seen ? (
        <Skeleton variant={def.variant} />
      ) : (
        <Scroller>
          {shown.map((m, i) =>
            def.variant === "top10" ? (
              <Top10Card key={m.id} m={m} rank={i + 1} onOpen={onOpen} />
            ) : def.variant === "upcoming" ? (
              <UpcomingCard key={m.id} m={m} onOpen={onOpen} i={i} />
            ) : def.variant === "people" ? (
              <PersonCard key={m.id} p={m} onAll={onAll} i={i} />
            ) : (
              <Card
                key={m.id}
                m={m}
                i={i}
                onOpen={onOpen}
                variant={def.variant === "poster" ? "poster" : "landscape"}
              />
            ),
          )}
        </Scroller>
      )}
    </section>
  );
}

export function ContinueRow({ onOpen }: { onOpen: Open }) {
  const prog = useStore(progressStore);
  const items = Object.values(prog).sort((a, b) => b.at - a.at);
  if (!items.length) return null;
  return (
    <section>
      <Heading title="Continue watching" sub="Pick up right where you left off" />
      <Scroller>
        {items.map((p, i) => (
          <Card
            i={i}
            key={keyOf(p.media)}
            m={p.media}
            onOpen={(m) => onOpen(m, { play: true })}
            variant="landscape"
            progress={p.pct}
          />
        ))}
      </Scroller>
    </section>
  );
}

export function MyListRow({ onOpen, onAll }: { onOpen: Open; onAll: OpenCatalog }) {
  const list = useStore(listStore);
  if (!list.length) return null;
  return (
    <section>
      <Heading
        title="My List"
        sub={`${list.length} saved`}
        onAll={() => onAll({ title: "My List", path: "", kind: "all" })}
      />
      <Scroller>
        {list.map((m, i) => (
          <Card key={keyOf(m)} m={m} i={i} onOpen={onOpen} variant="poster" />
        ))}
      </Scroller>
    </section>
  );
}

export function Banner({
  def,
  onOpen,
}: {
  def: Extract<SectionDef, { type: "banner" }>;
  onOpen: Open;
}) {
  const [ref, seen] = useInView<HTMLElement>();
  const { items } = useList(seen ? def.path : null, def.params ?? {}, def.kind, "backdrop");
  const m = items[def.index];
  const list = useStore(listStore);
  return (
    <section ref={ref} className="px-[4vw]">
      {m ? (
        <div className="group relative isolate min-h-[340px] overflow-hidden rounded-2xl bg-panel sm:min-h-[400px] lg:min-h-[460px]">
          <img
            src={img(m.backdrop_path, "w1280")}
            alt=""
            loading="lazy"
            className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-[2500ms] ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-ink via-ink/70 to-transparent" />
          <div className="absolute inset-0 -z-10 bg-linear-to-t from-ink/80 to-transparent sm:hidden" />
          <div className="stagger flex min-h-[inherit] max-w-xl flex-col justify-end gap-3 p-6 sm:justify-center sm:p-12">
            <span className="text-[11px] font-bold uppercase tracking-[.25em] text-accent">
              {def.eyebrow}
            </span>
            <h2 className="font-display text-3xl font-extrabold leading-none tracking-tight sm:text-5xl">
              {titleOf(m)}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              {matchOf(m) !== null && <b className="text-emerald-400">{matchOf(m)}% match</b>}
              <span>{yearOf(m)}</span>
              <span>{genreNames(m.genre_ids, 2).join(" • ")}</span>
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-white/70">{m.overview}</p>
            <div className="mt-2 flex gap-2.5">
              <button
                onClick={() => onOpen(m, { play: true })}
                className="btn-shine relative flex h-11 items-center gap-2 overflow-hidden rounded-lg bg-white px-5 text-sm font-bold text-black hover:bg-white/85"
              >
                <Icon name="play" size={18} />
                Play
              </button>
              <button
                onClick={() => toggleList(m)}
                className="flex h-11 items-center gap-2 rounded-lg bg-white/15 px-5 text-sm font-semibold backdrop-blur hover:bg-white/25"
              >
                <Icon name={inList(list, m) ? "check" : "plus"} size={18} />
                My List
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="shimmer min-h-[340px] rounded-2xl lg:min-h-[460px]" />
      )}
    </section>
  );
}

export function GenreTiles({
  title,
  kind,
  onAll,
}: {
  title: string;
  kind: Kind;
  onAll: OpenCatalog;
}) {
  const ids = kind === "movie" ? MOVIE_GENRES : TV_GENRES;
  return (
    <section>
      <Heading title={title} />
      <div className="grid grid-cols-2 gap-2.5 px-[4vw] sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
        {ids.slice(0, 12).map((id, n) => (
          <button
            key={id}
            onClick={() =>
              onAll({
                title: GENRE_NAMES[id],
                path: `/discover/${kind}`,
                params: {
                  with_genres: String(id),
                  sort_by: "popularity.desc",
                  "vote_count.gte": "100",
                },
                kind,
              })
            }
            style={{ ["--h" as string]: (id * 47) % 360, animationDelay: `${n * 45}ms` }}
            className="genre-tile card-in group relative h-20 overflow-hidden rounded-xl p-4 text-left sm:h-24"
          >
            <span className="font-display text-base font-bold sm:text-lg">{GENRE_NAMES[id]}</span>
            <Icon
              name="right"
              size={20}
              className="absolute bottom-3 right-3 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function NetworkTile({ id, onAll }: { id: number; onAll: OpenCatalog }) {
  const [ref, seen] = useInView<HTMLButtonElement>();
  const { data } = useTmdb<any>(seen ? `/network/${id}` : null);
  return (
    <button
      ref={ref}
      onClick={() =>
        onAll({
          title: data?.name || "Network",
          path: "/discover/tv",
          params: { with_networks: String(id), sort_by: "popularity.desc" },
          kind: "tv",
        })
      }
      className="grid h-20 shrink-0 snap-start place-items-center rounded-xl border border-white/10 bg-panel px-8 transition hover:border-white/40 hover:bg-white/10 sm:h-24 sm:w-48 w-40"
    >
      {data?.logo_path ? (
        <img
          src={img(data.logo_path, "w300")}
          alt={data.name}
          className="max-h-9 max-w-full object-contain brightness-0 invert"
        />
      ) : (
        <span className="text-sm font-bold text-white/70">{data?.name ?? ""}</span>
      )}
    </button>
  );
}
export function Networks({ title, onAll }: { title: string; onAll: OpenCatalog }) {
  return (
    <section>
      <Heading title={title} />
      <Scroller>
        {NETWORKS.map((id) => (
          <NetworkTile key={id} id={id} onAll={onAll} />
        ))}
      </Scroller>
    </section>
  );
}

export function Sections({
  sections,
  onOpen,
  onAll,
}: {
  sections: SectionDef[];
  onOpen: Open;
  onAll: OpenCatalog;
}) {
  return (
    <div className="flex flex-col gap-9 sm:gap-11">
      {sections.map((s) => (
        <Reveal key={s.id}>
          {s.type === "row" ? (
            <Row def={s} onOpen={onOpen} onAll={onAll} />
          ) : s.type === "banner" ? (
            <Banner def={s} onOpen={onOpen} />
          ) : s.type === "genres" ? (
            <GenreTiles title={s.title} kind={s.kind} onAll={onAll} />
          ) : s.type === "networks" ? (
            <Networks title={s.title} onAll={onAll} />
          ) : s.type === "continue" ? (
            <ContinueRow onOpen={onOpen} />
          ) : (
            <MyListRow onOpen={onOpen} onAll={onAll} />
          )}
        </Reveal>
      ))}
    </div>
  );
}
