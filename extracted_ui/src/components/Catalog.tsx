import { useCallback, useEffect, useRef, useState } from "react";
import { MOVIE_GENRES, GENRE_NAMES, TV_GENRES } from "../lib/genres";
import { listStore, useStore } from "../lib/store";
import { tmdb, yearOf, type Kind, type Media } from "../lib/tmdb";
import { PosterCard, type Open } from "./Rows";
import { Select, SlideTabs } from "./Select";
import { Icon } from "./ui";

export type CatalogCfg = {
  title: string;
  path: string;
  params?: Record<string, string>;
  kind: Kind | "all";
  browse?: boolean;
  isSearch?: boolean;
};

type SearchTab = "all" | "movie" | "tv" | "anime";

const SEARCH_TABS: { id: SearchTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Series" },
  { id: "anime", label: "Anime" },
];

const SORTS: [string, string][] = [
  ["popularity.desc", "Most popular"],
  ["vote_average.desc", "Highest rated"],
  ["date", "Newest"],
  ["revenue.desc", "Box office"],
];
const YEARS = ["", ...Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i))];

export function Catalog({ cfg, onOpen }: { cfg: CatalogCfg; onOpen: Open }) {
  const isSearch = Boolean(cfg.isSearch || cfg.path?.startsWith("/search"));
  const [kind, setKind] = useState<Kind>(cfg.kind === "tv" ? "tv" : "movie");
  const [searchTab, setSearchTab] = useState<SearchTab>("all");
  const [searchQuery, setSearchQuery] = useState(cfg.params?.query || "");
  const [activeQuery, setActiveQuery] = useState(cfg.params?.query || "");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("popularity.desc");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("");
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const isListInit = !cfg.browse && !isSearch && cfg.path === "";
  const [loading, setLoading] = useState(!isListInit);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const mylist = useStore(listStore);
  const isList = !cfg.browse && !isSearch && cfg.path === "";

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingMore = useRef(false);

  // Sync external search query updates
  useEffect(() => {
    if (cfg.params?.query !== undefined) {
      setSearchQuery(cfg.params.query);
      setActiveQuery(cfg.params.query);
    }
  }, [cfg.params?.query]);

  // Debounced query refinement for search
  useEffect(() => {
    if (!isSearch) return;
    const timer = setTimeout(() => {
      setActiveQuery((prev) => (prev !== searchQuery ? searchQuery : prev));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearch]);

  const effectiveKind = isSearch
    ? searchTab === "movie"
      ? "movie"
      : searchTab === "tv"
        ? "tv"
        : "all"
    : kind;

  const availableGenreIds =
    effectiveKind === "movie"
      ? MOVIE_GENRES
      : effectiveKind === "tv"
        ? TV_GENRES
        : searchTab === "anime"
          ? [16, ...MOVIE_GENRES.filter((id) => id !== 16)]
          : Array.from(new Set([...MOVIE_GENRES, ...TV_GENRES]));

  const genreSelectOptions = [
    { value: "", label: "All genres" },
    ...availableGenreIds
      .filter((id) => GENRE_NAMES[id])
      .map((id) => ({ value: String(id), label: GENRE_NAMES[id] }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

  const request = useCallback(
    (p: number) => {
      let path = cfg.path;
      let params: Record<string, string> = { ...(cfg.params ?? {}), page: String(p) };
      let k: Kind | "all" = cfg.kind;
      let filterFn: ((m: Media) => boolean) | null = null;
      let clientSort: string | null = null;

      if (isSearch) {
        const q = activeQuery.trim();
        if (searchTab === "all") {
          k = "all";
          path = q ? "/search/multi" : "/trending/all/day";
          params = q
            ? { query: q, page: String(p), include_adult: "false" }
            : { page: String(p) };
        } else if (searchTab === "movie") {
          k = "movie";
          path = q ? "/search/movie" : "/discover/movie";
          params = q
            ? { query: q, page: String(p), include_adult: "false" }
            : {
                page: String(p),
                sort_by: sort === "date" ? "primary_release_date.desc" : sort,
              };
          if (year) params.primary_release_year = year;
          if (!q && genre) params.with_genres = genre;
        } else if (searchTab === "tv") {
          k = "tv";
          path = q ? "/search/tv" : "/discover/tv";
          params = q
            ? { query: q, page: String(p), include_adult: "false" }
            : {
                page: String(p),
                sort_by: sort === "date" ? "first_air_date.desc" : sort,
              };
          if (year) params.first_air_date_year = year;
          if (!q && genre) params.with_genres = genre;
        } else if (searchTab === "anime") {
          k = "tv";
          if (q) {
            path = "/search/multi";
            params = { query: q, page: String(p), include_adult: "false" };
            filterFn = (m: any) =>
              Boolean(
                m.genre_ids?.includes(16) ||
                  m.original_language === "ja" ||
                  m.origin_country?.includes("JP"),
              );
          } else {
            path = "/discover/tv";
            params = {
              page: String(p),
              with_genres: genre && genre !== "16" ? `16,${genre}` : "16",
              with_original_language: "ja",
              sort_by: sort === "date" ? "first_air_date.desc" : sort,
            };
            if (year) params.first_air_date_year = year;
          }
        }

        if (q) {
          if (genre) {
            const prev = filterFn;
            filterFn = (m: Media) =>
              (prev ? prev(m) : true) && Boolean(m.genre_ids?.includes(Number(genre)));
          }
          if (year) {
            const prev = filterFn;
            filterFn = (m: Media) => (prev ? prev(m) : true) && yearOf(m) === year;
          }
          if (sort && sort !== "popularity.desc") {
            clientSort = sort;
          }
        }
      } else if (cfg.browse) {
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

      return tmdb<{ results: Media[]; total_pages: number }>(path, params).then((r) => {
        let results = (r.results || [])
          .map((m) => ({ ...m, media_type: m.media_type ?? (k === "all" ? "movie" : k) }) as Media)
          .filter((m) => m.poster_path);

        if (filterFn) {
          results = results.filter(filterFn);
        }

        if (clientSort) {
          if (clientSort === "vote_average.desc") {
            results.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
          } else if (clientSort === "date") {
            results.sort((a, b) => (yearOf(b) || "").localeCompare(yearOf(a) || ""));
          } else if (clientSort === "popularity.desc") {
            results.sort((a, b) => ((b as any).popularity || 0) - ((a as any).popularity || 0));
          }
        }

        return {
          results,
          total: r.total_pages || 1,
        };
      });
    },
    [cfg, isSearch, activeQuery, searchTab, kind, genre, sort, year, rating],
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

  // Unlimited pagination / Infinite scroll fetching
  const more = useCallback(() => {
    if (isFetchingMore.current || loading) return;
    if (pages > 0 && page >= pages) return;
    isFetchingMore.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    request(nextPage)
      .then((r) => {
        setItems((x) => {
          const ids = new Set(x.map((o) => `${o.media_type}${o.id}`));
          const added = r.results.filter((n) => !ids.has(`${n.media_type}${n.id}`));
          return [...x, ...added];
        });
        setPage(nextPage);
        if (r.total) setPages(r.total);
        setLoadingMore(false);
        isFetchingMore.current = false;
      })
      .catch(() => {
        setLoadingMore(false);
        isFetchingMore.current = false;
      });
  }, [loading, page, pages, request]);

  useEffect(() => {
    if (isList) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !isFetchingMore.current &&
          (pages === 0 || page < pages)
        ) {
          more();
        }
      },
      { rootMargin: "800px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isList, loading, page, pages, more]);

  const shown = isList ? mylist : items;
  const displayTitle = isSearch
    ? activeQuery
      ? `Search results for “${activeQuery}”`
      : "Search"
    : cfg.browse
      ? "Browse"
      : cfg.title;

  return (
    <div className="min-h-screen px-[4vw] pb-24 pt-24 sm:pt-28">
      <h1 className="animate-[rise_.7s_cubic-bezier(.16,1,.3,1)_both] font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
        {displayTitle}
      </h1>

      {/* Search Input Bar for refinement when in search mode */}
      {isSearch && (
        <div className="mt-5 max-w-2xl animate-[rise_.5s_both]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveQuery(searchQuery);
            }}
            className="flex items-center gap-3"
          >
            <div className="glow-wrap group relative min-w-0 flex-1 rounded-2xl p-px">
              <span className="glow-ring pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
              <div className="relative flex h-13 sm:h-14 items-center gap-3 rounded-[15px] bg-[#16161e] px-4 shadow-lg border border-white/10">
                <Icon
                  name="search"
                  size={20}
                  className="shrink-0 text-white/40 transition group-focus-within:text-accent"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Modify search: movies, TV series, anime..."
                  aria-label="Search query"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm sm:text-base outline-none placeholder:text-white/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear query"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveQuery("");
                    }}
                    className="grid size-7 place-items-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </div>
            <button
              type="submit"
              className="btn-shine relative h-13 sm:h-14 shrink-0 rounded-2xl bg-white px-6 text-sm font-bold text-black transition hover:bg-white/90 active:scale-95 shadow-md"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Filter controls for Search Results */}
      {isSearch && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <SlideTabs
              label="Type"
              items={SEARCH_TABS}
              value={searchTab}
              onChange={(tab) => {
                setSearchTab(tab);
                setGenre("");
              }}
            />
            <Select
              label="Genre"
              value={genre}
              onChange={setGenre}
              options={genreSelectOptions}
            />
            <Select
              label="Sort"
              value={sort}
              onChange={setSort}
              options={SORTS.filter(
                ([v]) => searchTab === "movie" || v !== "revenue.desc",
              ).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="Year"
              value={year}
              onChange={setYear}
              options={YEARS.map((y) => ({ value: y, label: y || "Any year" }))}
            />
          </div>
          <div className="no-scrollbar -mx-[4vw] flex gap-2 overflow-x-auto px-[4vw] pb-1">
            {["", ...availableGenreIds.map(String)].map((g, n) => (
              <button
                key={g}
                style={{ animationDelay: `${n * 30}ms` }}
                onClick={() => setGenre(g)}
                className={`card-in shrink-0 rounded-full border px-4 py-1.5 text-sm transition active:scale-95 ${genre === g ? "border-white bg-white font-semibold text-black" : "border-white/15 text-white/70 hover:border-white/50"}`}
              >
                {g ? GENRE_NAMES[+g] || `Genre ${g}` : "All"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter controls for Browse Tab */}
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
              label="Genre"
              value={genre}
              onChange={setGenre}
              options={genreSelectOptions}
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
        {(loading || loadingMore) &&
          !isList &&
          Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="shimmer aspect-2/3 rounded-lg" />
          ))}
      </div>

      {/* Infinite scroll sentinel trigger */}
      {!isList && <div ref={sentinelRef} className="h-16 w-full pointer-events-none" />}

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

      {!isList && !loading && !loadingMore && page < pages && (
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
