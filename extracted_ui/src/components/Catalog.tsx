import { useCallback, useEffect, useState } from "react";
import { MOVIE_GENRES, GENRE_NAMES, TV_GENRES } from "../lib/genres";
import { listStore, useStore } from "../lib/store";
import { tmdb, type Kind, type Media } from "../lib/tmdb";
import { PosterCard, type Open } from "./Rows";
import { Select, SlideTabs } from "./Select";
import { Icon } from "./ui";

export type CatalogCfg = {
  title: string;
  path: string;
  params?: Record<string, string>;
  kind: Kind | "all";
  browse?: boolean;
};

const SORTS: [string, string][] = [
  ["popularity.desc", "Most popular"],
  ["vote_average.desc", "Highest rated"],
  ["date", "Newest"],
  ["revenue.desc", "Box office"],
];
const YEARS = ["", ...Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i))];

export function Catalog({ cfg, onOpen }: { cfg: CatalogCfg; onOpen: Open }) {
  const [kind, setKind] = useState<Kind>(cfg.kind === "tv" ? "tv" : "movie");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("popularity.desc");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("");
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const isListInit = !cfg.browse && cfg.path === "";
  const [loading, setLoading] = useState(!isListInit);
  const [error, setError] = useState("");
  const mylist = useStore(listStore);
  const isList = !cfg.browse && cfg.path === "";

  const request = useCallback(
    (p: number) => {
      let path = cfg.path;
      let params: Record<string, string> = { ...(cfg.params ?? {}), page: String(p) };
      let k: Kind | "all" = cfg.kind;
      if (cfg.browse) {
        k = kind;
        path = `/discover/${kind}`;
        const dateKey = kind === "tv" ? "first_air_date" : "primary_release_date";
        params = {
          page: String(p),
          sort_by: sort === "date" ? `${dateKey}.desc` : sort,
          "vote_count.gte": sort === "vote_average.desc" ? "500" : "50",
        };
        if (sort === "date") params[`${dateKey}.lte`] = new Date().toISOString().slice(0, 10);
        if (genre) params.with_genres = genre;
        if (rating) params["vote_average.gte"] = rating;
        if (year) params[kind === "tv" ? "first_air_date_year" : "primary_release_year"] = year;
      }
      return tmdb<{ results: Media[]; total_pages: number }>(path, params).then((r) => ({
        results: r.results
          .map((m) => ({ ...m, media_type: m.media_type ?? (k === "all" ? "movie" : k) }) as Media)
          .filter((m) => m.poster_path),
        total: r.total_pages,
      }));
    },
    [cfg, kind, genre, sort, year, rating],
  );

  useEffect(() => {
    if (isList) return;
    let live = true;
    setLoading(true);
    setError("");
    setItems([]);
    setPage(1);
    request(1)
      .then((r) => {
        if (live) {
          setItems(r.results);
          setPages(r.total);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [request, isList]);

  const more = () => {
    setLoading(true);
    request(page + 1)
      .then((r) => {
        setItems((x) => [...x, ...r.results.filter((n) => !x.some((o) => o.id === n.id))]);
        setPage(page + 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  const shown = isList ? mylist : items;
  return (
    <div className="min-h-screen px-[4vw] pb-24 pt-24 sm:pt-28">
      <h1 className="animate-[rise_.7s_cubic-bezier(.16,1,.3,1)_both] font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
        {cfg.browse ? "Browse" : cfg.title}
      </h1>
      {cfg.browse && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <SlideTabs
              label="Type"
              items={[
                { id: "movie" as Kind, label: "Movies" },
                { id: "tv" as Kind, label: "Series" },
              ]}
              value={kind}
              onChange={(k) => {
                setKind(k);
                setGenre("");
              }}
            />
            <Select
              label="Sort"
              value={sort}
              onChange={setSort}
              options={SORTS.filter(([v]) => kind === "movie" || v !== "revenue.desc").map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <Select
              label="Year"
              value={year}
              onChange={setYear}
              options={YEARS.map((y) => ({ value: y, label: y || "Any year" }))}
            />
            <Select
              label="Rating"
              value={rating}
              onChange={setRating}
              options={["", "6", "7", "8"].map((r) => ({
                value: r,
                label: r ? `${r}+ stars` : "Any rating",
              }))}
            />
          </div>
          <div className="no-scrollbar -mx-[4vw] flex gap-2 overflow-x-auto px-[4vw] pb-1">
            {["", ...(kind === "movie" ? MOVIE_GENRES : TV_GENRES).map(String)].map((g, n) => (
              <button
                key={g}
                style={{ animationDelay: `${n * 30}ms` }}
                onClick={() => setGenre(g)}
                className={`card-in shrink-0 rounded-full border px-4 py-1.5 text-sm transition active:scale-95 ${genre === g ? "border-white bg-white font-semibold text-black" : "border-white/15 text-white/70 hover:border-white/50"}`}
              >
                {g ? GENRE_NAMES[+g] : "All"}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-8 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      <div className="mt-8 grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
        {shown.map((m, n) => (
          <div key={`${m.media_type}${m.id}`} className="relative aspect-2/3 [&>div]:!w-full">
            <PosterCard m={m} i={n % 16} onOpen={onOpen} />
          </div>
        ))}
        {loading &&
          !isList &&
          Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="shimmer aspect-2/3 rounded-lg" />
          ))}
      </div>
      {!loading && !shown.length && !error && (
        <div className="grid place-items-center gap-3 py-24 text-center text-white/50">
          <Icon name={isList ? "plus" : "search"} size={36} />
          <p className="text-sm">
            {isList
              ? "Nothing saved yet. Tap + on any title to build your list."
              : "No titles match these filters."}
          </p>
        </div>
      )}
      {!isList && !loading && page < pages && (
        <div className="mt-10 text-center">
          <button
            onClick={more}
            className="rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
