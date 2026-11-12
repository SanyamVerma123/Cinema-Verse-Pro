import { useEffect, useRef, useState } from "react";
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
  useList,
  useTmdb,
  yearOf,
  type Kind,
  type Media,
} from "../lib/tmdb";
import type { Open } from "./Rows";
import { Chip, Icon, RoundBtn } from "./ui";

const canAutoplay = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 768px)").matches &&
  !(navigator as any).connection?.saveData;

export function Hero({
  path,
  kind,
  params,
  onOpen,
}: {
  path: string;
  kind: Kind | "all";
  params?: Record<string, string>;
  onOpen: Open;
}) {
  const { items } = useList(path, params ?? {}, kind, "backdrop");
  const slides = items.slice(0, 6);
  const [i, setI] = useState(0);
  const [videoOn, setVideoOn] = useState(false);
  const [muted, setMuted] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);
  const m: Media | undefined = slides[i];
  const list = useStore(listStore);
  const reminders = useStore(remindersStore);
  const upcoming = m ? isUpcoming(m) : false;
  const reminded = m ? isReminded(reminders, m) : false;
  const relDate = m ? releaseDateLabel(m) : "";
  const days = m ? daysUntilRelease(m) : null;

  const { data } = useTmdb<any>(m ? `/${typeOf(m)}/${m.id}` : null, {
    append_to_response: "videos,images,content_ratings,release_dates",
    include_image_language: "en,null",
  });
  const trailer = pickTrailer(data?.videos?.results);
  const logo =
    data?.images?.logos?.find((l: any) => l.iso_639_1 === "en") || data?.images?.logos?.[0];

  useEffect(() => {
    setVideoOn(false);
    setMuted(true);
    const t = setTimeout(() => canAutoplay() && setVideoOn(true), 2200);
    return () => clearTimeout(t);
  }, [i, m?.id]);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), videoOn ? 28000 : 10000);
    return () => clearTimeout(t);
  }, [i, videoOn, slides.length]);

  const toggleSound = () => {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: muted ? "unMute" : "mute", args: [] }),
      "*",
    );
    setMuted(!muted);
  };

  if (!m) return <div className="shimmer h-[78vh] min-h-[520px] w-full" />;
  const cert = certOf(data);
  const meta = data?.runtime
    ? runtimeLabel(data.runtime)
    : data?.number_of_seasons
      ? `${data.number_of_seasons} season${data.number_of_seasons > 1 ? "s" : ""}`
      : "";

  return (
    <section
      className="relative isolate h-[86vh] min-h-[600px] w-full overflow-hidden md:h-[96vh] md:max-h-[1040px]"
      aria-roledescription="carousel"
    >
      {slides.map((s, idx) => (
        <img
          key={s.id}
          src={img(s.backdrop_path, "w1280")}
          alt=""
          fetchPriority={idx === 0 ? "high" : "low"}
          className={`absolute inset-0 -z-30 size-full object-cover object-[70%_20%] transition-opacity duration-1000 md:object-center ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {videoOn && trailer && (
        <div className="absolute inset-0 -z-20 overflow-hidden animate-[fade_1.2s_both]">
          <iframe
            ref={frame}
            title="Trailer"
            allow="autoplay; encrypted-media"
            tabIndex={-1}
            src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${trailer.key}&enablejsapi=1&iv_load_policy=3&disablekb=1`}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-full min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2 scale-[1.15]"
          />
        </div>
      )}
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-ink/90 via-ink/35 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/20 to-ink/50" />

      <div
        key={m.id}
        className="absolute bottom-16 sm:bottom-20 md:bottom-[22vh] left-[4vw] right-[4vw] max-w-[660px] z-20 animate-[rise_.7s_both]"
      >
        <div className="mb-2 sm:mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-white/80">
          <span className="grid size-5 place-items-center rounded bg-accent">
            <Icon name="play" size={10} />
          </span>
          {typeOf(m) === "tv" ? "Series" : "Film"}
          <span className="text-white/30">/</span>
          <span className="text-accent">#{i + 1} trending</span>
        </div>
        {logo ? (
          <img
            src={img(logo.file_path, "w500")}
            alt={titleOf(m)}
            className="max-h-20 sm:max-h-28 md:max-h-36 w-auto max-w-[80%] object-contain object-left drop-shadow-2xl"
          />
        ) : (
          <h1 className="font-display text-[clamp(28px,6vw,72px)] font-extrabold leading-[.95] tracking-tighter drop-shadow-2xl">
            {titleOf(m)}
          </h1>
        )}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1.5 text-xs sm:text-[13px] text-white/80">
          {upcoming ? (
            <span className="rounded-md bg-linear-to-r from-red-600 to-accent px-2 py-0.5 text-xs font-bold text-white shadow-xs">
              Releases {relDate} {days !== null ? `(In ${days}d)` : ""}
            </span>
          ) : (
            matchOf(m) !== null && <b className="text-emerald-400">{matchOf(m)}% match</b>
          )}
          <span>{yearOf(m)}</span>
          {cert && <Chip>{cert}</Chip>}
          {meta && <span>{meta}</span>}
          <Chip>4K</Chip>
          <Chip>HDR</Chip>
        </div>
        <p className="mt-2.5 sm:mt-3.5 line-clamp-2 sm:line-clamp-3 max-w-lg text-xs sm:text-[15px] leading-relaxed text-white/80">
          {m.overview}
        </p>
        <p className="mt-2 text-[11px] sm:text-xs text-white/50">{genreNames(m.genre_ids, 4).join("  •  ")}</p>
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
          {upcoming ? (
            <button
              onClick={() => toggleReminder(m)}
              className="btn-shine relative overflow-hidden flex h-10 sm:h-12 items-center gap-2 rounded-lg bg-linear-to-r from-red-600 to-accent px-5 sm:px-7 text-xs sm:text-[15px] font-bold text-white transition hover:brightness-110 active:scale-95 shadow-xl shadow-red-600/30"
            >
              <Icon name={reminded ? "check" : "bell"} size={18} />
              {reminded ? "Reminder Set" : "Notify Me"}
            </button>
          ) : (
            <button
              onClick={() => onOpen(m, { play: true })}
              className="btn-shine relative overflow-hidden flex h-10 sm:h-12 items-center gap-2 rounded-lg bg-white px-5 sm:px-7 text-xs sm:text-[15px] font-bold text-black transition hover:bg-white/85 active:scale-95 shadow-xl shadow-black/40"
            >
              <Icon name="play" size={20} />
              Play
            </button>
          )}
          <button
            onClick={() => onOpen(m)}
            className="flex h-10 sm:h-12 items-center gap-2 rounded-lg bg-white/20 px-4 sm:px-6 text-xs sm:text-[15px] font-semibold backdrop-blur-md transition hover:bg-white/30 active:scale-95 border border-white/10"
          >
            <Icon name="info" size={18} />
            More info
          </button>
          <RoundBtn
            icon={inList(list, m) ? "check" : "plus"}
            label="My List"
            size={42}
            className="size-10 sm:size-12"
            active={inList(list, m)}
            onClick={() => toggleList(m)}
          />
        </div>
      </div>

      <div className="absolute bottom-16 sm:bottom-20 md:bottom-[22vh] right-0 z-20 flex items-center gap-3">
        {videoOn && trailer && (
          <RoundBtn
            icon={muted ? "mute" : "volume"}
            label={muted ? "Unmute trailer" : "Mute trailer"}
            size={40}
            onClick={toggleSound}
          />
        )}
        {cert && (
          <span className="border-l-[3px] border-white/70 bg-black/40 py-1.5 pl-3 pr-[4vw] text-xs sm:text-sm font-semibold backdrop-blur">
            {cert}
          </span>
        )}
      </div>

      <div className="absolute bottom-3 sm:bottom-6 left-[4vw] right-[4vw] z-10 flex items-end justify-between gap-6">
        <div className="flex gap-1.5" role="tablist" aria-label="Featured titles">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={idx === i}
              aria-label={`Show ${titleOf(s)}`}
              onClick={() => setI(idx)}
              className="group py-3"
            >
              <span
                className={`block h-1 overflow-hidden rounded-full bg-white/25 transition-all ${idx === i ? "w-12" : "w-6 group-hover:bg-white/50"}`}
              >
                {idx === i && (
                  <i
                    key={`${i}${videoOn}`}
                    className="block h-full origin-left bg-white animate-[grow_linear_both]"
                    style={{ animationDuration: videoOn ? "28s" : "10s" }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="hidden gap-2.5 lg:flex">
          {slides.map(
            (s, idx) =>
              idx !== i && (
                <button
                  key={s.id}
                  onClick={() => setI(idx)}
                  aria-label={titleOf(s)}
                  className="group relative aspect-video w-36 overflow-hidden rounded-md opacity-70 ring-1 ring-white/20 transition hover:opacity-100 hover:ring-white/60 xl:w-44"
                >
                  <img
                    src={img(s.backdrop_path, "w300")}
                    alt=""
                    className="size-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 px-2 pb-1.5 pt-5 text-left text-[11px] font-semibold">
                    {titleOf(s)}
                  </span>
                </button>
              ),
          )}
        </div>
      </div>
    </section>
  );
}
