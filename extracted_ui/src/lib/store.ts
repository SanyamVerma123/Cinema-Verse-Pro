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

// ----------------------------------------------------
// Upcoming Movie Logic & Date Helpers
// ----------------------------------------------------
export function isUpcoming(m?: Media | null): boolean {
  if (!m) return false;
  const d = m.release_date || (m as any).first_air_date;
  if (!d) return false;
  const today = new Date().toISOString().split("T")[0];
  return d > today;
}

export function releaseDateLabel(m?: Media | null): string {
  if (!m) return "";
  const dateStr = m.release_date || (m as any).first_air_date;
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIndex, day);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function daysUntilRelease(m?: Media | null): number | null {
  if (!m) return null;
  const dateStr = m.release_date || (m as any).first_air_date;
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    // Strictly positive upcoming days only; never return 0 or negative for already released titles
    return diffDays > 0 ? diffDays : null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// Notifications & Reminders Store
// ----------------------------------------------------
export type ReminderItem = {
  media: Media;
  addedAt: number;
  releaseDate: string;
};

export const remindersStore = create<ReminderItem[]>("cv:reminders", []);

export const isReminded = (reminders: ReminderItem[], m: Media) =>
  reminders.some((r) => keyOf(r.media) === keyOf(m));

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  try {
    const res = await Notification.requestPermission();
    if (res === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification("CinemaVerse Alerts Activated 🎬", {
          body: "You will receive release alerts even when your browser or mobile screen is closed!",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        });
      }).catch(() => {});
    }
    return res;
  } catch {
    return "denied";
  }
}

export function toggleReminder(m: Media) {
  const cur = remindersStore.get();
  const had = isReminded(cur, m);
  const title = m.title || m.name || "Movie";
  const relDate = m.release_date || (m as any).first_air_date || "";
  const dateFormatted = releaseDateLabel(m);

  if (had) {
    remindersStore.set(cur.filter((r) => keyOf(r.media) !== keyOf(m)));
    toastStore.set({
      id: Date.now(),
      msg: `🔔 Reminder removed for "${title}"`,
    });
  } else {
    remindersStore.set([
      { media: slim(m), addedAt: Date.now(), releaseDate: relDate },
      ...cur,
    ]);
    toastStore.set({
      id: Date.now(),
      msg: `🔔 Alert set! You'll be notified when "${title}" releases${dateFormatted ? ` on ${dateFormatted}` : ""}`,
    });

    // Request system push notification permission so alerts arrive when phone is closed
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        requestNotificationPermission().catch(() => {});
      } else if (Notification.permission === "granted" && "serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(`Reminder Saved: ${title}`, {
            body: `We will notify you the moment "${title}" premieres${dateFormatted ? ` on ${dateFormatted}` : ""}!`,
            icon: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : "/icon-192.png",
            badge: "/icon-192.png",
          }).catch(() => {});
        }).catch(() => {});
      }
    }
  }
}

// ----------------------------------------------------
// User Profile & Settings Store
// ----------------------------------------------------
export type UserSettings = {
  profileName: string;
  avatar: string;
  avatarUrl?: string;
  bio?: string;
  vipBadge?: string;
  defaultServer: string;
  defaultAudio: string;
  quality?: string;
  autoplayNext: boolean;
  autoZapAds?: boolean;
  trailerSound?: boolean;
  pushNotifications: boolean;
  trustedDevice?: boolean;
  deviceName?: string;
  deviceIp?: string;
  lastSyncedAt?: number;
};

export const settingsStore = create<UserSettings>("cv:settings", {
  profileName: "Cinema Pro",
  avatar: "samurai",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
  bio: "4K Film & Anime Connoisseur",
  vipBadge: "Obsidian VIP",
  defaultServer: "vidly",
  defaultAudio: "en",
  quality: "auto",
  autoplayNext: true,
  autoZapAds: true,
  trailerSound: true,
  pushNotifications: true,
  trustedDevice: false,
  deviceName: "",
  deviceIp: "",
  lastSyncedAt: 0,
});

