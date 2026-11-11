import { useEffect, useRef, useState } from "react";
import { img, titleOf, typeOf, useList, useTmdb, yearOf, type Media } from "../lib/tmdb";
import { genreNames } from "../lib/genres";
import type { Open, OpenCatalog } from "./Rows";
import { Icon } from "./ui";

const SR: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;
const LANGS = [
  ["en-US", "English"],
  ["hi-IN", "हिन्दी"],
  ["es-ES", "Español"],
  ["fr-FR", "Français"],
  ["de-DE", "Deutsch"],
  ["ja-JP", "日本語"],
  ["ko-KR", "한국어"],
];
const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser settings and try again.",
  "no-speech": "We did not hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice recognition needs an internet connection.",
};

export function Search({
  startVoice,
  onClose,
  onOpen,
  onAll,
}: {
  startVoice?: boolean;
  onClose: () => void;
  onOpen: Open;
  onAll: OpenCatalog;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("frame:lang") || "en-US");
  const [err, setErr] = useState("");
  const rec = useRef<any>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const { items, loading } = useList(
    debounced ? "/search/multi" : null,
    { query: debounced, include_adult: "false" },
    "all",
  );
  const titles = items.filter(
    (m) => m.media_type !== "person" && (m.poster_path || m.backdrop_path),
  );
  const people = items.filter((m) => m.media_type === "person");
  const trending = useList(debounced ? null : "/trending/all/day", {}, "all", "poster").items;

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
      if (!heard) setErr((cur) => cur || ERRORS["no-speech"]);
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
    return () => rec.current?.abort(); /* eslint-disable-next-line */
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

  const open: Open = (m, o) => {
    onClose();
    onOpen(m, o);
  };
  return (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto bg-ink/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="mx-auto max-w-6xl px-[4vw] pb-28 pt-5 sm:pt-10">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-14 flex-1 items-center gap-3 rounded-2xl border bg-white/6 px-4 transition sm:h-16 sm:px-5 ${listening ? "border-accent shadow-[0_0_0_4px_rgba(139,108,255,.2)]" : "border-white/12 focus-within:border-white/40"}`}
          >
            <Icon name="search" size={22} className="shrink-0 text-white/50" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={listening ? "Listening…" : "Search movies, series, people"}
              aria-label="Search"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/35 sm:text-lg"
            />
            {q && (
              <button
                aria-label="Clear"
                onClick={() => {
                  setQ("");
                  input.current?.focus();
                }}
                className="text-white/50 hover:text-white"
              >
                <Icon name="close" size={18} />
              </button>
            )}
            <button
              aria-label={listening ? "Stop listening" : "Search by voice"}
              onClick={listening ? stop : start}
              className={`relative grid size-10 shrink-0 place-items-center rounded-full transition sm:size-11 ${listening ? "bg-accent text-white" : "bg-white/10 hover:bg-white/20"}`}
            >
              {listening && (
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
              )}
              <Icon name="mic" size={20} className="relative" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="h-14 rounded-2xl px-3 text-sm font-semibold text-white/70 hover:text-white sm:h-16 sm:px-5"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/45">
          <span>
            {SR
              ? "Tap the mic and say a title, actor or genre"
              : "Voice search is not available in this browser"}
          </span>
          {SR && (
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                localStorage.setItem("frame:lang", e.target.value);
              }}
              aria-label="Voice language"
              className="rounded-lg border border-white/12 bg-panel px-2 py-1.5 text-white/80"
            >
              {LANGS.map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </div>

        {listening && (
          <div className="mt-10 flex flex-col items-center gap-5 text-center" aria-live="polite">
            <div className="flex h-16 items-center gap-1.5">
              {Array.from({ length: 9 }, (_, i) => (
                <i
                  key={i}
                  className="wave-bar w-1.5 rounded-full bg-linear-to-t from-accent to-[#ff6a88]"
                  style={{ animationDelay: `${i * 0.09}s` }}
                />
              ))}
            </div>
            <p className="font-display text-2xl font-bold sm:text-3xl">{q || "Listening…"}</p>
            <p className="text-sm text-white/45">Try “sci-fi movies” or “Christopher Nolan”</p>
          </div>
        )}
        {err && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {err}
          </p>
        )}

        {!listening && !debounced && trending.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-lg font-bold">Trending searches</h2>
            <ul className="grid gap-1 sm:grid-cols-2">
              {trending.slice(0, 10).map((m, i) => (
                <li key={m.id}>
                  <button
                    onClick={() => open(m)}
                    className="group flex w-full items-center gap-4 rounded-xl p-2 text-left hover:bg-white/6"
                  >
                    <span className="w-5 text-center font-display text-lg font-bold text-white/30">
                      {i + 1}
                    </span>
                    <img
                      src={img(m.poster_path, "w92")}
                      alt=""
                      className="h-14 w-10 rounded object-cover"
                    />
                    <span className="min-w-0">
                      <b className="line-clamp-1 text-sm">{titleOf(m)}</b>
                      <i className="text-xs not-italic text-white/45">
                        {genreNames(m.genre_ids, 2).join(" • ")}
                      </i>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!listening && debounced && (
          <div className="mt-8">
            {people.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 font-display text-lg font-bold">People</h2>
                <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
                  {people.slice(0, 12).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onClose();
                        onAll({
                          title: `Starring ${p.name}`,
                          path: "/discover/movie",
                          params: { with_cast: String(p.id), sort_by: "popularity.desc" },
                          kind: "movie",
                        });
                      }}
                      className="group w-20 shrink-0 text-center"
                    >
                      <span className="block aspect-square overflow-hidden rounded-full bg-panel ring-1 ring-white/10 group-hover:ring-accent">
                        {p.profile_path ? (
                          <img
                            src={img(p.profile_path, "w185")}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="grid size-full place-items-center text-xl text-white/40">
                            {p.name?.[0]}
                          </span>
                        )}
                      </span>
                      <b className="mt-1.5 line-clamp-2 text-[11px]">{p.name}</b>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <h2 className="mb-3 font-display text-lg font-bold">
              {loading
                ? "Searching…"
                : titles.length
                  ? `Results for “${debounced}”`
                  : `No results for “${debounced}”`}
            </h2>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
              {titles.map((m: Media) => (
                <button
                  key={`${m.media_type}${m.id}`}
                  onClick={() => open(m)}
                  className="group text-left"
                >
                  <span className="relative block aspect-2/3 overflow-hidden rounded-lg bg-panel ring-1 ring-white/8 transition group-hover:ring-white/40">
                    {m.poster_path ? (
                      <img
                        src={img(m.poster_path, "w342")}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="grid size-full place-items-center p-2 text-center text-xs text-white/50">
                        {titleOf(m)}
                      </span>
                    )}
                  </span>
                  <b className="mt-2 line-clamp-1 text-xs">{titleOf(m)}</b>
                  <i className="text-[11px] not-italic text-white/45">
                    {yearOf(m)} · {typeOf(m) === "tv" ? "Series" : "Movie"}
                  </i>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
