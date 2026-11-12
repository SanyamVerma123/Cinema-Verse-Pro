import { useEffect, useMemo, useState } from "react";
import { sampleFor } from "./sample";

const KEY =
  (import.meta.env.VITE_TMDB_API_KEY as string | undefined) ||
  "fe30ba97956d6c5afafc72b84941712d";
const TOKEN =
  (import.meta.env.VITE_TMDB_READ_TOKEN as string | undefined) ||
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmZTMwYmE1Nzk1NmQ2YzVhZmFmYzcyYjg0OTQxNzEyZCIsIm5iZiI6MTc5Mjc2MDc5My4yNiwic3ViIjoiNmFkYjViZDkzZmI5ZWQzYzVhNTFhOWQxIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.mPe9qkNYhjLys43F3Ie04yv5BQ29n5t4wkrSXx-b86A";

/** True when a TMDB credential is configured. */
export const hasApi = Boolean(KEY || TOKEN);

export type Kind = "movie" | "tv";
export type Media = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  known_for_department?: string;
  known_for?: Media[];
};
export const titleOf = (m: Media) => m.title || m.name || "Untitled";
export const yearOf = (m: Media) => (m.release_date || m.first_air_date || "").slice(0, 4);
export const typeOf = (m: Media): Kind => (m.media_type === "tv" ? "tv" : "movie");
export const matchOf = (m: Media) => (m.vote_average ? Math.round(m.vote_average * 10) : null);

export const img = (path?: string | null, size = "w500") => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // Route through local proxy to unblock Indian ISP DNS sinkholes (Jio/Airtel) with disk caching
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/api/tmdb-image/${size}${cleanPath}`;
};

const cache = new Map<string, Promise<any>>();
export function tmdb<T = any>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ language: "en-US", ...params });
  if (!TOKEN && KEY) qs.set("api_key", KEY);
  const cacheKey = `${path}?${qs}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const p: Promise<T> = (async () => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    // 1. Try local server proxy (zero ISP blocks, disk-cached)
    try {
      const localUrl = `/api/tmdb-proxy${cleanPath}?${qs}`;
      const res = await fetch(localUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error && data.status_code === undefined) return data;
      }
    } catch (e) {
      // Fall through to upstream direct
    }

    // 2. Try direct TMDB API with Token/Key
    if (hasApi) {
      try {
        const directUrl = `https://api.themoviedb.org/3${cleanPath}?${qs}`;
        const res = await fetch(directUrl, {
          headers: TOKEN ? { Authorization: `Bearer ${TOKEN}`, accept: "application/json" } : {},
        });
        if (res.ok) return await res.json();
      } catch (e) {
        // Fall through to sample
      }
    }

    // 3. Fallback to sample data
    return sampleFor(path, params);
  })();

  cache.set(cacheKey, p);
  p.catch(() => cache.delete(cacheKey));
  return p;
}

export function useTmdb<T = any>(path: string | null, params: Record<string, string> = {}) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({
    data: null,
    loading: !!path,
    error: "",
  });
  const key = path ? path + JSON.stringify(params) : "";
  useEffect(() => {
    if (!path) return setState({ data: null, loading: false, error: "" });
    let live = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    tmdb<T>(path, params)
      .then((data) => live && setState({ data, loading: false, error: "" }))
      .catch(
        (e) => live && setState({ data: null, loading: false, error: String(e.message || e) }),
      );
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}

/** Normalise list results: attach media_type from the endpoint kind and drop unusable rows. */
export function useList(
  path: string | null,
  params: Record<string, string>,
  kind: Kind | "all",
  need: "backdrop" | "poster" | "any" = "any",
) {
  const { data, loading, error } = useTmdb<{ results?: Media[] }>(path, params);
  const items = useMemo(
    () =>
      (data?.results ?? [])
        .map(
          (m) => ({ ...m, media_type: m.media_type ?? (kind === "all" ? "movie" : kind) }) as Media,
        )
        .filter((m) =>
          need === "backdrop" ? m.backdrop_path : need === "poster" ? m.poster_path : true,
        ),
    [data, kind, need],
  );
  return { items, loading, error };
}

export const pickTrailer = (videos: any[] = []) =>
  videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
  videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
  videos.find((v) => v.site === "YouTube");

export function certOf(d: any): string {
  const tv = d?.content_ratings?.results?.find((r: any) => r.iso_3166_1 === "US")?.rating;
  const mv = d?.release_dates?.results
    ?.find((r: any) => r.iso_3166_1 === "US")
    ?.release_dates?.find((x: any) => x.certification)?.certification;
  return tv || mv || "";
}
export const runtimeLabel = (min?: number) =>
  min ? `${Math.floor(min / 60) ? Math.floor(min / 60) + "h " : ""}${min % 60}m` : "";
