import { useEffect, useMemo, useRef, useState } from "react";
import { genreNames } from "../lib/genres";
import { inList, listStore, toggleList, useStore } from "../lib/store";
import { img, matchOf, titleOf, typeOf, useList, useTmdb, yearOf, type Media } from "../lib/tmdb";
import type { Open, OpenCatalog } from "./Rows";
import { Select, SlideTabs } from "./Select";
import { Chip, Icon } from "./ui";

const SR: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;
const LANGS = [
  { value: "en-US", label: "English" },
  { value: "hi-IN", label: "हिन्दी" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "ja-JP", label: "日本語" },
  { value: "ko-KR", label: "한국어" },
];
const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser settings and try again.",
  "no-speech": "We did not hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice recognition needs an internet connection.",
};
type F = "all" | "movie" | "tv" | "person";
const FILTERS: { id: F; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Series" },
  { id: "person", label: "People" },
];
const ENDPOINT: Record<F, string> = {
  all: "/search/multi",
  movie: "/search/movie",
  tv: "/search/tv",
  person: "/search/person",
};

const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem("frame:recent") || "[]");
  } catch {
    return [];
  }
};

function Hl({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-accent/35 px-0.5 text-white">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function Preview({
  m,
  onOpen,
  onPerson,
}: {
  m: Media;
  onOpen: Open;
  onPerson: (p: Media) => void;
}) {
  const list = useStore(listStore);
  if (m.media_type === "person") {
    return (
      <div key={`p${m.id}`} className="animate-[fade_.35s_both] p-6 text-center">
        <button
          onClick={() => onPerson(m)}
          title="Open Actor Profile"
          className="mx-auto block size-32 overflow-hidden rounded-full bg-panel ring-2 ring-accent/60 transition hover:scale-105 hover:ring-accent"
        >
          {m.profile_path ? (
            <img src={img(m.profile_path, "w185")} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-4xl text-white/40">
              {m.name?.[0]}
            </span>
          )}
        </button>
        <h3 className="mt-4 font-display text-2xl font-bold">{m.name}</h3>
        <p className="text-xs text-white/50">{m.known_for_department || "Actor / Filmmaker"}</p>
        {m.known_for && m.known_for.length > 0 && (
          <div className="mt-5 space-y-1.5 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/40">
              Known for
            </p>
            {m.known_for.slice(0, 4).map((k) => (
              <button
                key={k.id}
                onClick={() => onOpen({ ...k, media_type: k.media_type ?? "movie" })}
                className="block w-full truncate rounded-lg bg-white/[.05] px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                {titleOf(k)} <i className="text-xs not-italic text-white/40">{yearOf(k)}</i>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => onPerson(m)}
          className="btn-shine relative mt-5 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-accent text-sm font-bold text-white shadow-lg transition hover:scale-[1.02]"
        >
          <Icon name="user" size={16} />
          View Full Biography &amp; Filmography
        </button>
      </div>
    );
  }
  const match = matchOf(m);
  return (
    <div key={`${m.media_type}${m.id}`} className="animate-[fade_.35s_both]">
      <div className="relative aspect-video overflow-hidden bg-panel">
        <img
          src={img(m.backdrop_path || m.poster_path, "w780")}
          alt=""
          className="size-full animate-[kenburns_9s_ease-out_both] object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#101016] via-transparent to-transparent" />
      </div>
      <div className="-mt-10 relative px-6 pb-6">
        <h3 className="font-display text-2xl font-bold leading-tight">{titleOf(m)}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-white/60">
          {match !== null && <b className="text-emerald-400">{match}% match</b>}
          <span>{yearOf(m)}</span>
          <Chip>{typeOf(m) === "tv" ? "SERIES" : "MOVIE"}</Chip>
          <span>{genreNames(m.genre_ids, 2).join(" • ")}</span>
        </div>
        <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-white/65">{m.overview}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => onOpen(m, { play: true })}
            className="btn-shine relative flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-white text-sm font-bold text-black"
          >
            <Icon name="play" size={18} />
            Play
          </button>
          <button
            onClick={() => onOpen(m)}
            className="h-11 rounded-xl bg-white/12 px-5 text-sm font-semibold hover:bg-white/20"
          >
            Details
          </button>
          <button
            aria-label="My List"
            onClick={() => toggleList(m)}
            className={`grid size-11 place-items-center rounded-xl border transition ${inList(list, m) ? "border-accent text-accent" : "border-white/20 hover:border-white/50"}`}
          >
            <Icon
              key={String(inList(list, m))}
              name={inList(list, m) ? "check" : "plus"}
              size={18}
              className="animate-[iconpop_.35s_both]"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Search({
  startVoice,
  onClose,
  onOpen,
  onAll,
  onOpenPerson,
}: {
  startVoice?: boolean;
  onClose: () => void;
  onOpen: Open;
  onAll: OpenCatalog;
  onOpenPerson?: (personId: number) => void;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<F>("all");
  const [active, setActive] = useState(0);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("frame:lang") || "en-US");
  const [err, setErr] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);
  const rec = useRef<any>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading } = useTmdb<{ results?: Media[] }>(
    debounced ? ENDPOINT[filter] : null,
    debounced ? { query: debounced, include_adult: "true" } : {},
  );
  const flat = useMemo(() => {
    const all = (data?.results ?? []).map(
      (m) => ({ ...m, media_type: m.media_type ?? (filter === "all" ? "movie" : filter) }) as Media,
    );
    const titles = all.filter(
      (m) => m.media_type !== "person",
    );
    const people = all.filter((m) => m.media_type === "person");
    return { titles: titles.slice(0, 30), people: people.slice(0, 10) };
  }, [data, filter]);
  const items = [...flat.titles, ...flat.people];
  const cur = items[Math.min(active, items.length - 1)];
  const trending = useList(debounced ? null : "/trending/all/day", {}, "all", "poster").items;

  useEffect(() => setActive(0), [debounced, filter]);
  useEffect(() => {
    document.getElementById(`sr-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const remember = (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    setRecent(next);
    localStorage.setItem("frame:recent", JSON.stringify(next));
  };
  const forget = () => {
    setRecent([]);
    localStorage.removeItem("frame:recent");
  };
  const viewAll = () => {
    const query = debounced || q.trim();
    if (!query) return;
    remember(query);
    onClose();
    onAll({
      title: 'Search results for "' + query + '"',
      path: "/search/multi",
      params: { query, include_adult: "true" },
      kind: "all",
    });
  };
  const personCatalog = (p: Media) => {
    remember(debounced);
    onClose();
    if (onOpenPerson && p.id) {
      onOpenPerson(p.id);
    } else {
      onAll({
        title: `Starring ${p.name}`,
        path: "/discover/movie",
        params: { with_cast: String(p.id), sort_by: "popularity.desc" },
        kind: "movie",
      });
    }
  };
  const choose = (m: Media, o?: { play?: boolean }) => {
    if (m.media_type === "person") return personCatalog(m);
    remember(debounced);
    onClose();
    onOpen(m, o);
  };

  const stop = () => {
    rec.current?.stop();
    setListening(false);
  };
  const start = () => {
    if (!SR)
      return setErr("Voice search is not supported in this browser. Try Chrome, Edge or Safari.");
    setErr("");
    const r = new SR();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    let heard = false;
    r.onresult = (e: any) => {
      heard = true;
      setQ(
        Array.from(e.results)
          .map((x: any) => x[0].transcript)
          .join(""),
      );
    };
    r.onerror = (e: any) => {
      setErr(ERRORS[e.error] || "Voice search stopped unexpectedly.");
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      if (!heard) setErr((c) => c || ERRORS["no-speech"]);
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      setListening(false);
    }
  };
  useEffect(() => {
    if (startVoice) start();
    else input.current?.focus();
    return () => rec.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  const onKeys = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && cur) {
      e.preventDefault();
      choose(cur);
    }
  };

  const row = (m: Media, idx: number) => {
    const person = m.media_type === "person";
    const on = idx === active;
    return (
      <li key={`${m.media_type}${m.id}`} role="presentation">
        <button
          id={`sr-${idx}`}
          role="option"
          aria-selected={on}
          onMouseMove={() => on || setActive(idx)}
          onClick={() => choose(m)}
          style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}
          className={`card-in relative flex w-full items-center gap-4 rounded-2xl p-2.5 pr-4 text-left transition-colors duration-200 ${on ? "bg-white/[.08]" : "hover:bg-white/[.04]"}`}
        >
          {on && (
            <i className="absolute left-0 top-4 bottom-4 w-[3px] animate-[fade_.2s_both] rounded-full bg-linear-to-b from-accent to-[#ff6a88]" />
          )}
          <span
            className={`relative shrink-0 overflow-hidden bg-panel ring-1 ring-white/10 ${person ? "size-14 rounded-full" : "h-[72px] w-[50px] rounded-lg"}`}
          >
            {(person ? m.profile_path : m.poster_path) ? (
              <img
                src={img(person ? m.profile_path : m.poster_path, "w154")}
                alt=""
                loading="lazy"
                className={`size-full object-cover transition duration-500 ${on ? "scale-110" : ""}`}
              />
            ) : (
              <span className="grid size-full place-items-center text-white/40">
                {titleOf(m)[0]}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[15px] font-semibold">
              <Hl text={titleOf(m)} q={debounced} />
            </b>
            <span className="mt-1.5 flex items-center gap-2 text-xs text-white/50">
              {person ? (
                <span>{m.known_for_department}</span>
              ) : (
                <>
                  <span>{yearOf(m)}</span>
                  <Chip>{typeOf(m) === "tv" ? "SERIES" : "MOVIE"}</Chip>
                  <span className="truncate">{genreNames(m.genre_ids, 2).join(" • ")}</span>
                </>
              )}
            </span>
          </span>
          {!person && matchOf(m) !== null && (
            <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-amber sm:flex">
              <Icon name="star" size={12} />
              {m.vote_average?.toFixed(1)}
            </span>
          )}
          <Icon
            name="right"
            size={18}
            className={`shrink-0 transition ${on ? "translate-x-0 text-white opacity-100" : "-translate-x-2 opacity-0"}`}
          />
        </button>
      </li>
    );
  };

  const searching = !!debounced && !listening;
  const label = "text-[10px] font-semibold uppercase tracking-[.2em] text-white/40";
  return (
    <div
      className="fixed inset-0 z-[75] animate-[fade_.25s_both] bg-black/70 backdrop-blur-md sm:px-6 sm:pt-[7vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={onKeys}
        className="relative mx-auto flex h-full w-full max-w-5xl animate-[modalIn_.5s_cubic-bezier(.16,1,.3,1)_both] flex-col overflow-hidden border border-white/12 bg-[#101016]/95 shadow-[0_50px_140px_-20px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:h-[84vh] sm:max-h-[84vh] sm:rounded-3xl"
      >
        <i className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-accent to-transparent" />

        <div className="p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="glow-wrap group relative min-w-0 flex-1 rounded-2xl p-px">
              <span
                className={`glow-ring pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500 ${listening ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"}`}
              />
              <div className="relative flex h-14 items-center gap-3 rounded-[15px] bg-[#16161e] px-4 sm:h-16 sm:px-5">
                <Icon
                  name="search"
                  size={22}
                  className="shrink-0 text-white/45 transition group-focus-within:text-accent"
                />
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      viewAll();
                    }
                  }}
                  placeholder={listening ? "Listening…" : "Search movies, series, people"}
                  aria-label="Search"
                  className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/30 sm:text-lg"
                />
                {q && (
                  <button
                    aria-label="Clear"
                    onClick={() => {
                      setQ("");
                      input.current?.focus();
                    }}
                    className="grid size-7 place-items-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
                <button
                  aria-label={listening ? "Stop listening" : "Search by voice"}
                  onClick={listening ? stop : start}
                  className={`relative grid size-10 shrink-0 place-items-center rounded-full transition sm:size-11 ${listening ? "bg-linear-to-br from-accent to-[#ff6a88] text-white" : "bg-white/10 hover:bg-white/20"}`}
                >
                  {listening && (
                    <>
                      <i className="absolute inset-0 animate-[ring_1.6s_ease-out_infinite] rounded-full border border-accent" />
                      <i className="absolute inset-0 animate-[ring_1.6s_ease-out_.6s_infinite] rounded-full border border-[#ff6a88]" />
                    </>
                  )}
                  <Icon name="mic" size={20} className="relative" />
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="hidden h-12 items-center rounded-xl border border-white/12 px-3 text-[11px] font-semibold tracking-wider text-white/60 transition hover:border-white/40 hover:text-white sm:flex"
            >
              ESC
            </button>
            <button
              onClick={onClose}
              aria-label="Close search"
              className="grid size-12 place-items-center rounded-xl text-white/70 sm:hidden"
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <SlideTabs items={FILTERS} value={filter} onChange={setFilter} label="Result type" />
            {SR && (
              <Select
                size="sm"
                value={lang}
                options={LANGS}
                ariaLabel="Voice language"
                icon={<Icon name="mic" size={14} className="text-white/50" />}
                onChange={(v) => {
                  setLang(v);
                  localStorage.setItem("frame:lang", v);
                }}
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 h-full border-t border-white/8 overflow-hidden flex flex-col">
          {listening ? (
            <div
              className="grid h-full min-h-[320px] place-content-center justify-items-center gap-6 px-6 py-14 text-center"
              aria-live="polite"
            >
              <div className="flex h-20 items-center gap-1.5">
                {Array.from({ length: 13 }, (_, i) => (
                  <i
                    key={i}
                    className="wave-bar w-1.5 rounded-full bg-linear-to-t from-accent to-[#ff6a88]"
                    style={{ animationDelay: `${i * 0.07}s` }}
                  />
                ))}
              </div>
              <p className="min-h-10 font-display text-3xl font-bold sm:text-4xl">
                {q || "Listening…"}
              </p>
              <p className="text-sm text-white/45">Say a title, an actor or a genre</p>
            </div>
          ) : (
            <div
              className={`grid flex-1 min-h-0 h-full overflow-hidden ${searching && items.length ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}
            >
              <div
                role="listbox"
                aria-label="Results"
                className="flex-1 min-h-0 h-full overflow-y-auto overscroll-contain p-3 sm:p-4"
              >
                {err && (
                  <p
                    role="alert"
                    className="mb-3 animate-[rise_.4s_both] rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  >
                    {err}
                  </p>
                )}

                {!debounced && (
                  <div className="animate-[fade_.4s_both] space-y-7">
                    {recent.length > 0 && (
                      <section>
                        <div className="mb-2.5 flex items-center justify-between px-1">
                          <h2 className={label}>Recent</h2>
                          <button
                            onClick={forget}
                            className="text-xs text-white/40 hover:text-white"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recent.map((r, i) => (
                            <button
                              key={r}
                              onClick={() => setQ(r)}
                              style={{ animationDelay: `${i * 40}ms` }}
                              className="card-in flex items-center gap-2 rounded-full border border-white/12 bg-white/[.04] px-3.5 py-2 text-sm text-white/80 transition hover:border-accent hover:bg-accent/15 hover:text-white"
                            >
                              <Icon name="clock" size={14} className="text-white/40" />
                              {r}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                    <section>
                      <h2 className={`${label} mb-2.5 flex items-center gap-2 px-1`}>
                        <Icon name="trend" size={13} className="text-accent" />
                        Trending now
                      </h2>
                      <ul className="grid gap-x-3 sm:grid-cols-2">
                        {trending.slice(0, 8).map((m, i) => (
                          <li key={m.id}>
                            <button
                              onClick={() => choose(m)}
                              style={{ animationDelay: `${i * 45}ms` }}
                              className="card-in group flex w-full items-center gap-4 rounded-2xl p-2.5 text-left transition hover:bg-white/[.06]"
                            >
                              <span className="w-6 text-center font-display text-xl font-extrabold text-white/20 transition group-hover:text-accent">
                                {i + 1}
                              </span>
                              <img
                                src={img(m.poster_path, "w92")}
                                alt=""
                                className="h-14 w-10 rounded-md object-cover"
                              />
                              <span className="min-w-0">
                                <b className="block truncate text-sm">{titleOf(m)}</b>
                                <i className="text-xs not-italic text-white/45">
                                  {genreNames(m.genre_ids, 2).join(" • ")}
                                </i>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                )}

                {searching && loading && !data && (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className="shimmer h-[92px] rounded-2xl" />
                    ))}
                  </div>
                )}

                {searching && data && items.length === 0 && (
                  <div className="animate-[rise_.5s_both] px-4 py-14 text-center">
                    <span className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-white/[.06] text-white/40">
                      <Icon name="search" size={28} />
                    </span>
                    <h2 className="font-display text-xl font-bold">No results for “{debounced}”</h2>
                    <p className="mt-1.5 text-sm text-white/45">
                      Check the spelling, or try a different filter.
                    </p>
                  </div>
                )}

                {searching && items.length > 0 && (
                  <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
                    {flat.titles.length > 0 && (
                      <h2 className={`${label} mb-1.5 px-1`}>
                        Titles <i className="not-italic text-white/25">· {flat.titles.length}</i>
                      </h2>
                    )}
                    <ul>{flat.titles.map((m, i) => row(m, i))}</ul>
                    {flat.people.length > 0 && (
                      <h2 className={`${label} mb-1.5 mt-5 px-1`}>
                        People <i className="not-italic text-white/25">· {flat.people.length}</i>
                      </h2>
                    )}
                    <ul>{flat.people.map((m, i) => row(m, flat.titles.length + i))}</ul>

                    {/* Prominent "View all results" button */}
                    <div className="mt-4 pt-3 border-t border-white/10 px-1 pb-2">
                      <button
                        onClick={viewAll}
                        className="group w-full flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/20 hover:border-accent/50 py-3.5 px-5 text-sm font-bold text-white shadow-lg transition active:scale-[0.99]"
                      >
                        <span>View all results for &ldquo;{debounced || q}&rdquo;</span>
                        <span className="text-accent transition-transform duration-200 group-hover:translate-x-1">→</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {searching && cur && (
                <aside
                  aria-label="Preview"
                  className="hidden h-full overflow-y-auto overscroll-contain border-l border-white/8 bg-black/20 lg:block"
                >
                  <Preview m={cur} onOpen={choose} onPerson={personCatalog} />
                </aside>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center justify-between border-t border-white/8 px-5 py-3 text-[11px] text-white/35 sm:flex">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd>navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd">↵</kbd>open
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd">esc</kbd>close
            </span>
          </span>
          <span>Powered by TMDB</span>
        </div>
      </div>
    </div>
  );
}
