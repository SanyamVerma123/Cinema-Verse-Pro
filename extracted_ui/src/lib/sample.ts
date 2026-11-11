import { GENRE_NAMES } from "./genres";

// Demo data in TMDB's response shape. Used only when no TMDB key is configured.
type S = Record<string, any>;
const T = (
  id: number,
  media_type: "movie" | "tv",
  title: string,
  b: string,
  p: string,
  v: number,
  d: string,
  g: number[],
  o: string,
  trailer: string,
): S => ({
  id,
  media_type,
  [media_type === "tv" ? "name" : "title"]: title,
  backdrop_path: b,
  poster_path: p,
  vote_average: v,
  vote_count: 5000,
  [media_type === "tv" ? "first_air_date" : "release_date"]: d,
  genre_ids: g,
  overview: o,
  popularity: 100,
  trailer,
});
const L: S[] = [
  T(
    693134,
    "movie",
    "Dune: Part Two",
    "/87IVlclAfWL6mdicU1DDuxdwXwe.jpg",
    "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    8.2,
    "2024-02-27",
    [878, 12],
    "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    "Way9Dexny3w",
  ),
  T(
    157336,
    "movie",
    "Interstellar",
    "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    "/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg",
    8.5,
    "2014-11-05",
    [12, 18, 878],
    "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    "zSWdZVtXT7E",
  ),
  T(
    126308,
    "tv",
    "Shōgun",
    "/bwSmgmd90hCWwqOKQYTEraeOZhJ.jpg",
    "/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
    8.6,
    "2024-02-27",
    [18, 10768],
    "In 1600, Lord Toranaga fights for his life as his enemies unite against him, when a mysterious European ship is found marooned.",
    "yAN5uspO_hk",
  ),
  T(
    414906,
    "movie",
    "The Batman",
    "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    "/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    7.7,
    "2022-03-01",
    [80, 9648, 53],
    "When a killer targets Gotham's elite, a trail of cryptic clues sends the Batman deep into the shadows.",
    "mqqft2x_Aa4",
  ),
  T(
    136315,
    "tv",
    "The Bear",
    "/aJtG4txtmiRHwAAqENQHZvBs6kY.jpg",
    "/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg",
    8.3,
    "2022-06-23",
    [18, 35],
    "A young chef from the fine dining world comes home to Chicago to run his family's sandwich shop.",
    "gBmkI4jlaIo",
  ),
  T(
    872585,
    "movie",
    "Oppenheimer",
    "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    "/ptpr0kGAckfQkJeJIt8st5dglvd.jpg",
    8.1,
    "2023-07-19",
    [18, 36],
    "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    "uYPbbksJxIg",
  ),
  T(
    792307,
    "movie",
    "Poor Things",
    "/zh6IdheEYinU4TPtorWsjx6qPQE.jpg",
    "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    7.8,
    "2023-12-07",
    [878, 10749, 35],
    "The incredible tale and fantastical evolution of Bella Baxter, a young woman brought back to life.",
    "RlbR5N6veqw",
  ),
  T(
    666277,
    "movie",
    "Past Lives",
    "/7HR38hMBl23lf38MAN63y4pKsHz.jpg",
    "/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
    7.9,
    "2023-06-02",
    [18, 10749],
    "Childhood friends are reunited in New York for one fateful week as they confront destiny and love.",
    "kA244xewjcI",
  ),
  T(
    335984,
    "movie",
    "Blade Runner 2049",
    "/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
    "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    7.6,
    "2017-10-04",
    [878, 18],
    "A new blade runner unearths a long-buried secret that leads him to track down a former blade runner.",
    "gCcx85zbxz4",
  ),
];

const page = (results: S[]) => ({
  page: 1,
  total_pages: 1,
  total_results: results.length,
  results,
});
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function detail(f: S) {
  const tv = f.media_type === "tv";
  const others = L.filter((x) => x.id !== f.id);
  return {
    ...f,
    genres: f.genre_ids.map((id: number) => ({ id, name: GENRE_NAMES[id] })),
    tagline: "",
    status: "Released",
    original_language: "en",
    ...(tv
      ? {
          number_of_seasons: 1,
          number_of_episodes: 8,
          seasons: [{ season_number: 1, name: "Season 1", episode_count: 8 }],
        }
      : { runtime: 142 }),
    videos: {
      results: [
        {
          key: f.trailer,
          site: "YouTube",
          type: "Trailer",
          name: "Official Trailer",
          official: true,
        },
      ],
    },
    credits: { cast: [], crew: [] },
    similar: page(others),
    recommendations: page(others.slice().reverse()),
    reviews: { results: [] },
    "watch/providers": { results: {} },
    keywords: {},
    images: { logos: [] },
    content_ratings: { results: [] },
    release_dates: { results: [] },
    external_ids: {},
  };
}

export function sampleFor(path: string, params: Record<string, string> = {}): any {
  if (path.startsWith("/search/")) {
    const q = (params.query || "").toLowerCase();
    return page(L.filter((m) => (m.title || m.name).toLowerCase().includes(q)));
  }
  if (/^\/(movie|tv)\/\d+\/season\/\d+/.test(path)) return { episodes: [] };
  const m = path.match(/^\/(movie|tv)\/(\d+)$/);
  if (m) return detail(L.find((x) => x.id === +m[2]) || L[0]);
  if (path.startsWith("/network/")) return { name: "Network" };
  if (path.startsWith("/person/")) return page([]);
  const kind = path.includes("/tv") ? "tv" : path.includes("/movie") ? "movie" : null;
  let list = kind ? L.filter((x) => x.media_type === kind) : L;
  if (params.with_genres) {
    const ids = params.with_genres.split(/[,|]/).map(Number);
    list = list.filter((x) => x.genre_ids.some((g: number) => ids.includes(g)));
  }
  const r = hash(path) % Math.max(list.length, 1);
  return page([...list.slice(r), ...list.slice(0, r)]);
}
