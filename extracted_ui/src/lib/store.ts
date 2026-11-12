import { useSyncExternalStore } from "react";
import { typeOf, type Media } from "./tmdb";

function create<T>(key: string, initial: T) {
  let state = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) state = JSON.parse(raw);
  } catch {}
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(v: T) {
      state = v;
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}
type Store<T> = ReturnType<typeof create<T>>;
export const useStore = <T>(s: Store<T>) => useSyncExternalStore(s.subscribe, s.get);

export const keyOf = (m: Media) => `${typeOf(m)}:${m.id}`;
const slim = (m: Media): Media => ({
  id: m.id,
  media_type: typeOf(m),
  title: m.title,
  name: m.name,
  overview: m.overview,
  poster_path: m.poster_path,
  backdrop_path: m.backdrop_path,
  vote_average: m.vote_average,
  release_date: m.release_date,
  first_air_date: m.first_air_date,
  genre_ids: m.genre_ids,
});

export const listStore = create<Media[]>("frame:list", []);

// Non-persistent toast state
function mem<T>(initial: T) {
  let s = initial;
  const subs = new Set<() => void>();
  return {
    get: () => s,
    set(v: T) {
      s = v;
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}
export const toastStore = mem<{ id: number; msg: string; undo?: () => void } | null>(null);
export const inList = (list: Media[], m: Media) => list.some((x) => keyOf(x) === keyOf(m));
export function toggleList(m: Media) {
  const cur = listStore.get();
  const had = inList(cur, m);
  listStore.set(had ? cur.filter((x) => keyOf(x) !== keyOf(m)) : [slim(m), ...cur]);
  toastStore.set({
    id: Date.now(),
    msg: `${had ? "Removed from" : "Added to"} My List`,
    undo: () => toggleList(m),
  });
}

export type Progress = { media: Media; pct: number; time: number; at: number; label?: string };
export const progressStore = create<Record<string, Progress>>("frame:progress", {});
export function saveProgress(m: Media, time: number, duration: number, label?: string) {
  if (!duration) return;
  const pct = Math.min(100, (time / duration) * 100);
  const cur = { ...progressStore.get() };
  if (pct > 96) delete cur[keyOf(m)];
  else cur[keyOf(m)] = { media: slim(m), pct, time, at: Date.now(), label };
  progressStore.set(cur);
}
