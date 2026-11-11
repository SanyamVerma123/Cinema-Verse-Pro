import { useCallback, useEffect, useState } from "react";
import { Catalog, type CatalogCfg } from "./components/Catalog";
import { Detail } from "./components/Detail";
import { Hero } from "./components/Hero";
import { Player } from "./components/Player";
import { Sections, type Open } from "./components/Rows";
import { Search } from "./components/Search";
import { Brand, Icon, type IconName } from "./components/ui";
import { PAGES } from "./lib/layout";
import { listStore, useStore } from "./lib/store";
import { hasApi, type Media } from "./lib/tmdb";

type PageId = "home" | "movies" | "tv" | "new" | "browse" | "list" | "catalog";
const NAV: [PageId, string, IconName][] = [
  ["home", "Home", "home"],
  ["movies", "Movies", "film"],
  ["tv", "Series", "tv"],
  ["new", "New & Popular", "bell"],
  ["browse", "Browse", "compass"],
  ["list", "My List", "list"],
];
type PlayReq = { media: Media; season?: number; episode?: number; label?: string };

export default function App() {
  const [page, setPage] = useState<PageId>("home");
  const [catalog, setCatalog] = useState<CatalogCfg | null>(null);
  const [detail, setDetail] = useState<{ media: Media; play?: boolean } | null>(null);
  const [player, setPlayer] = useState<PlayReq | null>(null);
  const [search, setSearch] = useState<{ voice: boolean } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [notice, setNotice] = useState(!hasApi);
  const list = useStore(listStore);

  const go = useCallback((p: PageId) => {
    setPage(p);
    setCatalog(null);
    window.scrollTo({ top: 0 });
  }, []);
  const openCatalog = useCallback((c: Omit<CatalogCfg, "browse">) => {
    setCatalog(c);
    setPage("catalog");
    setDetail(null);
    window.scrollTo({ top: 0 });
  }, []);
  const open: Open = useCallback((media, o) => setDetail({ media, play: o?.play }), []);
  const play = useCallback(
    (media: Media, o: { season?: number; episode?: number; label?: string } = {}) =>
      setPlayer({ media, ...o }),
    [],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") ||
        (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName))
      ) {
        e.preventDefault();
        setSearch({ voice: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const def = PAGES[page];
  const active = page === "catalog" ? "" : page;
  return (
    <div className="min-h-screen bg-ink pb-20 text-white md:pb-0">
      <header className="fixed inset-x-0 top-0 z-50">
        {notice && (
          <div className="relative flex items-center justify-center bg-accent px-10 py-2 text-center text-xs font-medium sm:text-[13px]">
            <span>
              Demo data. Add <code className="rounded bg-black/25 px-1">VITE_TMDB_READ_TOKEN</code>{" "}
              to <code className="rounded bg-black/25 px-1">.env</code> and restart to load live
              TMDB catalogs.
            </span>
            <button
              aria-label="Dismiss"
              onClick={() => setNotice(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div
          className={`flex h-16 items-center gap-5 px-[4vw] transition-colors duration-300 lg:gap-8 ${scrolled ? "bg-ink/90 shadow-lg shadow-black/40 backdrop-blur-xl" : "bg-linear-to-b from-black/80 to-transparent"}`}
        >
          <button onClick={() => go("home")} aria-label="Frame home">
            <Brand />
          </button>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map(([id, label]) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active === id ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-[13px] transition lg:px-3.5 ${active === id ? "bg-white/12 font-semibold text-white" : "text-white/65 hover:text-white"}`}
              >
                {label}
                {id === "list" && list.length > 0 && (
                  <sup className="ml-1 text-accent">{list.length}</sup>
                )}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSearch({ voice: false })}
              aria-label="Search"
              className="flex h-10 items-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-3.5 text-sm text-white/70 backdrop-blur transition hover:border-white/40 hover:text-white lg:w-64"
            >
              <Icon name="search" size={18} />
              <span className="hidden lg:inline">Search</span>
              <kbd className="ml-auto hidden rounded border border-white/20 px-1.5 text-[10px] lg:inline">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setSearch({ voice: true })}
              aria-label="Search by voice"
              title="Search by voice"
              className="grid size-10 place-items-center rounded-full bg-linear-to-br from-accent to-[#ff6a88] shadow-lg shadow-accent/30 transition hover:scale-105 active:scale-95"
            >
              <Icon name="mic" size={19} />
            </button>
            <span
              className="ml-1 hidden size-9 place-items-center rounded-full bg-linear-to-br from-amber to-[#ff6a88] text-sm font-bold text-black sm:grid"
              aria-hidden="true"
            >
              A
            </span>
          </div>
        </div>
      </header>

      <main>
        {page === "catalog" && catalog ? (
          <Catalog
            key={catalog.title + catalog.path + JSON.stringify(catalog.params)}
            cfg={catalog}
            onOpen={open}
          />
        ) : page === "browse" ? (
          <Catalog
            key="browse"
            cfg={{ title: "Browse", path: "", kind: "movie", browse: true }}
            onOpen={open}
          />
        ) : page === "list" ? (
          <Catalog key="list" cfg={{ title: "My List", path: "", kind: "all" }} onOpen={open} />
        ) : (
          def && (
            <div key={page}>
              <Hero
                path={def.hero.path}
                kind={def.hero.kind}
                params={def.hero.params}
                onOpen={open}
              />
              <div className="relative z-10 -mt-[6vh] pb-10 md:-mt-[7vh]">
                <Sections sections={def.sections} onOpen={open} onAll={openCatalog} />
              </div>
            </div>
          )
        )}
      </main>

      <footer className="border-t border-white/8 px-[4vw] py-12 text-xs text-white/45">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand className="!text-2xl opacity-80" />
            <p className="mt-3 max-w-xs leading-relaxed">
              Your personal cinema. Discover films and series, then watch from your own library.
            </p>
          </div>
          {[
            ["Explore", "Movies", "Series", "New & Popular"],
            ["Account", "My List", "Continue watching", "Settings"],
            ["Support", "Help centre", "Terms of use", "Privacy"],
          ].map(([h, ...ls]) => (
            <div key={h}>
              <b className="text-white/70">{h}</b>
              <ul className="mt-3 space-y-2">
                {ls.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-3xl leading-relaxed">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Film and series
          metadata and imagery are provided by TMDB.
        </p>
      </footer>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-ink/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {(
          [
            ["home", "Home", "home"],
            ["movies", "Movies", "film"],
            ["tv", "Series", "tv"],
            ["browse", "Browse", "compass"],
            ["list", "My List", "list"],
          ] as [PageId, string, IconName][]
        ).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => go(id)}
            aria-current={active === id ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active === id ? "text-white" : "text-white/45"}`}
          >
            <Icon name={icon} size={21} className={active === id ? "text-accent" : ""} />
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
        />
      )}
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
    </div>
  );
}
