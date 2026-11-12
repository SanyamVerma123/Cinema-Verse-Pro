import type { Kind } from "./tmdb";

/**
 * Every section on every page is described by a TMDB endpoint.
 * Add, remove or reorder entries to change what appears - the components adapt to the response.
 */
export type Variant = "landscape" | "poster" | "top10" | "upcoming" | "people";
type Base = { id: string };
export type RowDef = Base & {
  type: "row";
  title: string;
  sub?: string;
  path: string;
  params?: Record<string, string>;
  kind: Kind | "all";
  variant: Variant;
};
export type SectionDef =
  | RowDef
  | (Base & {
      type: "banner";
      path: string;
      params?: Record<string, string>;
      index: number;
      kind: Kind | "all";
      eyebrow: string;
    })
  | (Base & { type: "genres"; title: string; kind: Kind })
  | (Base & { type: "networks"; title: string })
  | (Base & { type: "continue" })
  | (Base & { type: "mylist" });

const row = (
  id: string,
  title: string,
  path: string,
  kind: Kind | "all",
  variant: Variant = "landscape",
  params?: Record<string, string>,
  sub?: string,
): RowDef => ({ type: "row", id, title, path, kind, variant, params, sub });
const by = (
  id: string,
  title: string,
  kind: Kind,
  genre: string,
  variant: Variant = "landscape",
): RowDef =>
  row(id, title, `/discover/${kind}`, kind, variant, {
    with_genres: genre,
    sort_by: "popularity.desc",
    "vote_count.gte": "200",
  });

export type PageDef = {
  hero: { path: string; kind: Kind | "all"; params?: Record<string, string> };
  sections: SectionDef[];
};

const todayIso = new Date().toISOString().split("T")[0];
const upcomingParams: Record<string, string> = {
  "primary_release_date.gte": todayIso,
  sort_by: "popularity.desc",
};

export const PAGES: Record<string, PageDef> = {
  home: {
    hero: { path: "/trending/all/day", kind: "all" },
    sections: [
      { type: "continue", id: "continue" },
      row(
        "top10",
        "Top 10 today",
        "/trending/all/day",
        "all",
        "top10",
        undefined,
        "The most watched titles right now",
      ),
      row("trend-week", "Trending this week", "/trending/all/week", "all"),
      {
        type: "banner",
        id: "b1",
        path: "/movie/now_playing",
        index: 0,
        kind: "movie",
        eyebrow: "Now in theaters",
      },
      row("now", "In theaters now", "/movie/now_playing", "movie", "poster"),
      { type: "mylist", id: "mylist" },
      row(
        "stars",
        "Popular stars",
        "/person/popular",
        "all",
        "people",
        undefined,
        "The faces behind the stories",
      ),
      row("tv-pop", "Popular series", "/tv/popular", "tv"),
      { type: "genres", id: "g1", title: "Browse by genre", kind: "movie" },
      row("top-movies", "Critically acclaimed", "/movie/top_rated", "movie", "poster"),
      row("airing", "Airing today", "/tv/airing_today", "tv"),
      by("action", "Action & adrenaline", "movie", "28"),
      row(
        "soon",
        "Coming soon",
        "/discover/movie",
        "movie",
        "upcoming",
        upcomingParams,
        "Set a reminder for what is next",
      ),
      by("scifi", "Sci-fi & fantasy", "movie", "878,14", "poster"),
      { type: "networks", id: "n1", title: "Browse by network" },
      by("comedy", "Laugh out loud", "movie", "35"),
      row("korean", "Korean originals", "/discover/tv", "tv", "landscape", {
        with_original_language: "ko",
        sort_by: "popularity.desc",
      }),
      by("horror", "Chills & thrills", "movie", "27,53", "poster"),
      row("anime", "Anime", "/discover/tv", "tv", "poster", {
        with_genres: "16",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      }),
      by("docs", "Documentaries", "movie", "99"),
      row("hindi", "Bollywood hits", "/discover/movie", "movie", "poster", {
        with_original_language: "hi",
        sort_by: "popularity.desc",
      }),
      row("spanish", "Spanish language", "/discover/movie", "movie", "landscape", {
        with_original_language: "es",
        sort_by: "popularity.desc",
      }),
      by("animation", "Animation for everyone", "movie", "16,10751"),
      row("tv-top", "Best series of all time", "/tv/top_rated", "tv", "poster"),
      by("crime", "Crime & mystery", "tv", "80,9648"),
      by("romance", "Romance", "movie", "10749", "poster"),
    ],
  },
  movies: {
    hero: { path: "/movie/popular", kind: "movie" },
    sections: [
      row("m-top10", "Top 10 movies this week", "/trending/movie/week", "movie", "top10"),
      row("m-now", "Now playing", "/movie/now_playing", "movie"),
      {
        type: "banner",
        id: "mb",
        path: "/movie/top_rated",
        index: 0,
        kind: "movie",
        eyebrow: "All-time acclaimed",
      },
      row("m-pop", "Popular", "/movie/popular", "movie", "poster"),
      { type: "genres", id: "mg", title: "Movie genres", kind: "movie" },
      row("m-top", "Top rated", "/movie/top_rated", "movie"),
      row("m-soon", "Upcoming", "/discover/movie", "movie", "upcoming", upcomingParams),
      by("m-action", "Action", "movie", "28", "poster"),
      by("m-comedy", "Comedy", "movie", "35"),
      by("m-drama", "Drama", "movie", "18", "poster"),
      by("m-horror", "Horror", "movie", "27"),
      by("m-war", "War & history", "movie", "10752,36", "poster"),
      by("m-western", "Westerns", "movie", "37"),
      by("m-music", "Music", "movie", "10402", "poster"),
    ],
  },
  tv: {
    hero: { path: "/tv/popular", kind: "tv" },
    sections: [
      row("t-top10", "Top 10 series this week", "/trending/tv/week", "tv", "top10"),
      row("t-air", "Airing today", "/tv/airing_today", "tv"),
      {
        type: "banner",
        id: "tb",
        path: "/tv/top_rated",
        index: 0,
        kind: "tv",
        eyebrow: "Series of the moment",
      },
      row("t-pop", "Popular", "/tv/popular", "tv", "poster"),
      { type: "networks", id: "tn", title: "Browse by network" },
      row("t-on", "On the air", "/tv/on_the_air", "tv"),
      { type: "genres", id: "tg", title: "Series genres", kind: "tv" },
      row("t-top", "Top rated", "/tv/top_rated", "tv", "poster"),
      by("t-drama", "Drama", "tv", "18"),
      by("t-scifi", "Sci-fi & fantasy", "tv", "10765", "poster"),
      by("t-comedy", "Comedy", "tv", "35"),
      by("t-reality", "Reality", "tv", "10764", "poster"),
      by("t-kids", "Kids & family", "tv", "10762,10751"),
    ],
  },
  new: {
    hero: { path: "/discover/movie", kind: "movie", params: upcomingParams },
    sections: [
      row(
        "n-soon",
        "Coming soon",
        "/discover/movie",
        "movie",
        "upcoming",
        upcomingParams,
        "Set a reminder for what is next",
      ),
      row("n-today", "Trending today", "/trending/all/day", "all", "top10"),
      row("n-air", "New episodes airing", "/tv/on_the_air", "tv"),
      row("n-theaters", "In theaters", "/movie/now_playing", "movie", "poster"),
      row("n-week", "Everyone is watching", "/trending/all/week", "all"),
      row("n-tv", "Airing today", "/tv/airing_today", "tv", "poster"),
      { type: "mylist", id: "nm" },
    ],
  },
  anime: {
    hero: {
      path: "/discover/tv",
      kind: "tv",
      params: {
        with_genres: "16",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      },
    },
    sections: [
      row("a-top", "Top 10 Anime Series", "/discover/tv", "tv", "top10", {
        with_genres: "16",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      }),
      row("a-trend", "Trending Anime Series", "/discover/tv", "tv", "poster", {
        with_genres: "16",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      }),
      row("a-movies", "Anime Feature Films", "/discover/movie", "movie", "landscape", {
        with_genres: "16",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      }),
      {
        type: "banner",
        id: "ab",
        path: "/discover/tv",
        index: 0,
        kind: "tv",
        eyebrow: "Masterpiece Sagas",
        params: {
          with_genres: "16",
          with_original_language: "ja",
          sort_by: "vote_average.desc",
          "vote_count.gte": "250",
        },
      },
      row("a-action", "Action & Shonen", "/discover/tv", "tv", "poster", {
        with_genres: "16,10759",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      }),
      row("a-fantasy", "Fantasy & Supernatural", "/discover/tv", "tv", "landscape", {
        with_genres: "16,10765",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      }),
      row("a-top-rated", "Critically Acclaimed Anime", "/discover/tv", "tv", "poster", {
        with_genres: "16",
        with_original_language: "ja",
        sort_by: "vote_average.desc",
        "vote_count.gte": "300",
      }),
      row("a-slice", "Romance & Drama", "/discover/tv", "tv", "landscape", {
        with_genres: "16,18",
        with_original_language: "ja",
        sort_by: "popularity.desc",
      }),
      row("a-scifi", "Sci-Fi & Cyberpunk", "/discover/tv", "tv", "poster", {
        with_genres: "16,10765",
        with_original_language: "ja",
        "vote_count.gte": "150",
        sort_by: "popularity.desc",
      }),
    ],
  },
};

export const NETWORKS = [213, 49, 2739, 1024, 2552, 453, 4330, 3353];
