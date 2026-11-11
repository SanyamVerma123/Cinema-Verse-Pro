// TMDB genre ids are stable across /genre/movie/list and /genre/tv/list.
export const GENRE_NAMES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};
export const MOVIE_GENRES = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37,
];
export const TV_GENRES = [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10764, 10765, 10768, 37];
export const genreNames = (ids: number[] = [], n = 3) =>
  ids
    .map((id) => GENRE_NAMES[id])
    .filter(Boolean)
    .slice(0, n);
