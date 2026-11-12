import { useCallback, useEffect, useState } from "react";
import { Catalog, type CatalogCfg } from "./components/Catalog";
import { Detail } from "./components/Detail";
import { Hero } from "./components/Hero";
import { NotificationsDrawer } from "./components/NotificationsDrawer";
import { PersonModal } from "./components/PersonModal";
import { Player } from "./components/Player";
import { Sections, type Open } from "./components/Rows";
import { Search } from "./components/Search";
import { SlideTabs } from "./components/Select";
import { SettingsModal } from "./components/SettingsModal";
import { Brand, Icon, type IconName } from "./components/ui";
import { PAGES } from "./lib/layout";
import {
  isUpcoming,
  listStore,
  releaseDateLabel,
  remindersStore,
  toastStore,
  toggleReminder,
  useStore,
} from "./lib/store";
import { hasApi, titleOf, type Media } from "./lib/tmdb";

type PageId = "home" | "movies" | "tv" | "new" | "browse" | "list" | "catalog";
const NAV: [PageId, string][] = [
  ["home", "Home"],
  ["movies", "Movies"],
  ["tv", "Series"],
  ["new", "New & Popular"],
  ["browse", "Browse"],
  ["list", "My List"],
];
const MOBILE: [PageId, string, IconName][] = [
  ["home", "Home", "home"],
  ["movies", "Movies", "film"],
  ["tv", "Series", "tv"],
  ["browse", "Browse", "compass"],
  ["list", "My List", "list"],
];
const HINTS = [
  "Search movies, series, cast...",
  "Try “Stranger Things”",
  "Try “Christopher Nolan”",
  "Try “Avengers: Doomsday”",
  "Tap the mic to speak",
];

function Hint() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % HINTS.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      key={i}
      className="hidden min-w-0 flex-1 animate-[hintIn_.55s_cubic-bezier(.16,1,.3,1)_both] truncate text-left lg:inline"
    >
      {HINTS[i]}
    </span>
  );
}

function Toast() {
  const t = useStore(toastStore);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => toastStore.set(null), 3400);
    return () => clearTimeout(id);
  }, [t]);
  if (!t) return null;
  return (
    <div
      key={t.id}
      role="status"
      className="fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 md:bottom-8"
    >
      <div className="relative flex animate-[toastIn_.5s_cubic-bezier(.16,1,.3,1)_both] items-center gap-4 overflow-hidden rounded-2xl border border-white/15 bg-[#16161e]/95 py-3 pl-4 pr-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <span className="grid size-7 place-items-center rounded-full bg-accent/25 text-accent">
          <Icon name="check" size={15} className="animate-[iconpop_.5s_.1s_both]" />
        </span>
        <span className="text-sm font-medium">{t.msg}</span>
        {t.undo && (
          <button
            onClick={() => {
              t.undo?.();
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-accent hover:bg-white/10"
          >
            Undo
          </button>
        )}
        <i className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[shrink_3.4s_linear_both] bg-linear-to-r from-accent to-[#ff6a88]" />
      </div>
    </div>
  );
}

type PlayReq = { media: Media; season?: number; episode?: number; label?: string };

export default function App() {
  const [page, setPage] = useState<PageId>("home");
  const [catalog, setCatalog] = useState<CatalogCfg | null>(null);
  const [detail, setDetail] = useState<{ media: Media; play?: boolean } | null>(null);
  const [player, setPlayer] = useState<PlayReq | null>(null);
  const [search, setSearch] = useState<{ voice: boolean } | null>(null);
  const [personId, setPersonId] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notice, setNotice] = useState(!hasApi);
  const list = useStore(listStore);
  const reminders = useStore(remindersStore);

  // Register service worker for background notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const go = useCallback((p: PageId) => {
    setPage(p);
    setCatalog(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const open: Open = useCallback((media, o) => {
    if (o?.play && isUpcoming(media)) {
      const rel = releaseDateLabel(media);
      toastStore.set({
        id: Date.now(),
        msg: `📅 "${titleOf(media)}" premieres on ${rel}. Scheduled in your notifications!`,
      });
      toggleReminder(media);
      setDetail({ media, play: false });
      return;
    }
    setDetail({ media, play: o?.play });
  }, []);

  const play = useCallback(
    (media: Media, o?: { season?: number; episode?: number; label?: string }) => {
      if (isUpcoming(media)) {
        const rel = releaseDateLabel(media);
        toastStore.set({
          id: Date.now(),
          msg: `📅 "${titleOf(media)}" premieres on ${rel}. Not released yet!`,
        });
        toggleReminder(media);
        return;
      }
      setDetail(null);
      setPlayer({ media, ...o });
    },
    [],
  );

  const openCatalog = useCallback(
    (cfg: CatalogCfg) => {
      setCatalog(cfg);
      setPage("catalog");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  useEffect(() => {
    let raf = 0;
    const root = document.documentElement;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = root.scrollHeight - window.innerHeight;
        root.style.setProperty("--sy", String(Math.min(y, 1400)));
        root.style.setProperty("--p", String(max > 0 ? y / max : 0));
        setScrolled(y > 40);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch({ voice: false });
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearch({ voice: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const def = PAGES[page];
  const active = page === "catalog" ? "" : page;
  const pageKey = page === "catalog" && catalog ? `c${catalog.title}${catalog.path}` : page;

  return (
    <div className="min-h-screen bg-ink pb-20 text-white md:pb-0 font-sans selection:bg-purple-600 selection:text-white">
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          className={`flex h-16 items-center px-[4vw] transition-all duration-500 sm:h-20 ${
            scrolled
              ? "bg-[#09090d]/90 shadow-2xl shadow-black/80 backdrop-blur-2xl border-b border-white/8"
              : "bg-gradient-to-b from-black/85 via-black/40 to-transparent"
          }`}
        >
          <button
            onClick={() => go("home")}
            aria-label="CinemaVerse Home"
            className="group mr-6 flex items-center gap-3 transition hover:opacity-95"
          >
            <Brand />
          </button>
          <nav aria-label="Main" className="hidden md:block">
            <SlideTabs
              variant="pill"
              label="Primary"
              items={NAV.map(([id, label]) => ({ id, label }))}
              value={active}
              onChange={(id) => go(id as PageId)}
              className="[&_button]:!px-3 lg:[&_button]:!px-4"
            />
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <button
              onClick={() => setSearch({ voice: false })}
              aria-label="Search"
              className="glow-wrap group relative flex h-11 items-center rounded-full p-px transition active:scale-[.97] lg:w-72"
            >
              <span className="glow-ring pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <span className="relative flex size-full items-center gap-3 rounded-full border border-white/14 bg-[#15151c]/80 px-4 text-sm text-white/60 backdrop-blur-xl transition group-hover:border-transparent group-hover:text-white">
                <Icon
                  name="search"
                  size={18}
                  className="shrink-0 transition group-hover:text-accent"
                />
                <Hint />
                <kbd className="kbd ml-auto hidden lg:inline-block">⌘K</kbd>
              </span>
            </button>
            {/* Notification Bell Button */}
            <button
              onClick={() => setNotificationsOpen(true)}
              aria-label="Release Notifications and Reminders"
              title="Release Notifications and Reminders"
              className="group relative grid size-10 sm:size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white/90 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:border-white/30 hover:text-white active:scale-95"
            >
              <Icon
                name="bell"
                size={19}
                className="transition-transform duration-200 group-hover:rotate-12"
              />
              {reminders.length > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-linear-to-r from-red-600 to-accent px-1 text-[10px] font-black text-white shadow-lg ring-2 ring-[#0c0d14] animate-pulse">
                  {reminders.length}
                </span>
              )}
            </button>

            {/* Profile Avatar / Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Profile and Settings"
              title="Profile and Settings"
              className="relative grid size-10 sm:size-11 place-items-center rounded-full bg-linear-to-br from-red-600 via-purple-600 to-indigo-600 text-xs font-black text-white ring-2 ring-white/20 shadow-md shadow-purple-600/30 transition hover:scale-105 active:scale-95"
            >
              CV
            </button>
          </div>
          <i
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-linear-to-r from-accent via-[#ff6a88] to-amber"
            style={{ transform: "scaleX(var(--p, 0))" }}
          />
        </div>
      </header>

      <main>
        <div key={pageKey} className="animate-[pageIn_.7s_cubic-bezier(.16,1,.3,1)_backwards]">
          {page === "catalog" && catalog ? (
            <Catalog cfg={catalog} onOpen={open} />
          ) : page === "browse" ? (
            <Catalog
              cfg={{ title: "Browse", path: "", kind: "movie", browse: true }}
              onOpen={open}
            />
          ) : page === "list" ? (
            <Catalog cfg={{ title: "My List", path: "", kind: "all" }} onOpen={open} />
          ) : (
            def && (
              <>
                <Hero
                  path={def.hero.path}
                  kind={def.hero.kind}
                  params={def.hero.params}
                  onOpen={open}
                />
                {/* Spacing fix: Clean transition below hero with no overlap on hero action buttons */}
                <div className="relative z-10 mt-1 sm:mt-0 pb-12">
                  <Sections sections={def.sections} onOpen={open} onAll={openCatalog} />
                </div>
              </>
            )
          )}
        </div>
      </main>

      <footer className="border-t border-white/8 px-[4vw] py-12 text-xs text-white/45">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand className="!text-xl opacity-90" />
            <p className="mt-3 max-w-xs leading-relaxed text-white/60">
              Universal Multi-OTT Streaming Universe. Discover extraordinary films and series in 4K with zero ads.
            </p>
          </div>
          {[
            ["Explore", "Movies", "Series", "New & Popular"],
            ["Account", "My List", "Continue watching", "Settings"],
            ["Platform", "Universal OTTs", "4K Ultra HD", "Privacy"],
          ].map(([h, ...ls]) => (
            <div key={h}>
              <b className="text-white/80">{h}</b>
              <ul className="mt-3 space-y-2">
                {ls.map((l) => (
                  <li key={l} className="hover:text-white/80 transition-colors cursor-pointer">{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-3xl leading-relaxed text-white/40">
          © 2026 CinemaVerse Pro. Universal Multi-OTT Streaming Universe. Powered by official TMDb data &amp; multi-source CDN streams.
        </p>
      </footer>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
      >
        {MOBILE.map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => go(id)}
            aria-current={active === id ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition active:scale-90 ${active === id ? "text-white" : "text-white/45"}`}
          >
            {active === id && (
              <i className="absolute inset-x-5 top-0 h-0.5 animate-[fade_.3s_both] rounded-b bg-linear-to-r from-accent to-[#ff6a88]" />
            )}
            <Icon
              name={icon}
              size={21}
              className={`transition ${active === id ? "-translate-y-0.5 text-accent" : ""}`}
            />
            {label}
          </button>
        ))}
      </nav>

      {detail && (
        <Detail
          media={detail.media}
          autoPlay={detail.play}
          onClose={() => setDetail(null)}
          onOpen={open}
          onPlay={play}
          onCatalog={openCatalog}
          onOpenPerson={(id) => setPersonId(id)}
        />
      )}
      {personId !== null && (
        <PersonModal
          personId={personId}
          onClose={() => setPersonId(null)}
          onOpenMedia={open}
        />
      )}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpenMedia={open}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      {search && (
        <Search
          startVoice={search.voice}
          onClose={() => setSearch(null)}
          onOpen={open}
          onAll={openCatalog}
        />
      )}
      {player && (
        <Player
          media={player.media}
          season={player.season}
          episode={player.episode}
          label={player.label}
          onClose={() => setPlayer(null)}
        />
      )}
      <Toast />
    </div>
  );
}
