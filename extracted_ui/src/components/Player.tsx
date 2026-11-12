import { useEffect, useMemo, useRef, useState } from "react";
import { getStreamUrl, STREAM_SERVERS } from "../lib/stream";
import { progressStore, keyOf, saveProgress } from "../lib/store";
import { pickTrailer, titleOf, typeOf, useTmdb, type Media } from "../lib/tmdb";
import { Icon } from "./ui";
import { Select, type Opt } from "./Select";

const isFile = (u: string) => /\.(m3u8|mp4|webm|mov|mkv|mpd)(\?|#|$)/i.test(u);

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM < 10 ? "0" : ""}${remM}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${remM}:${s < 10 ? "0" : ""}${s}`;
};

export function Player({
  media,
  season: initialSeason,
  episode: initialEpisode,
  label: initialLabel,
  onClose,
}: {
  media: Media;
  season?: number;
  episode?: number;
  label?: string;
  onClose: () => void;
}) {
  const type = typeOf(media);
  const isTv = type === "tv";

  // TV Episode & Season navigation state
  const [season, setSeason] = useState(initialSeason ?? 1);
  const [episode, setEpisode] = useState(initialEpisode ?? 1);

  useEffect(() => {
    if (initialSeason !== undefined) setSeason(initialSeason);
    if (initialEpisode !== undefined) setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  // Fetch TV show details (to get all seasons and total episodes)
  const { data: showData } = useTmdb<any>(isTv ? `/tv/${media.id}` : null);
  // Fetch specific season details (to get list of episodes with names, runtimes, stills, overview)
  const { data: seasonData } = useTmdb<any>(
    isTv ? `/tv/${media.id}/season/${season}` : null,
  );

  // Available seasons list
  const availableSeasons: any[] = useMemo(() => {
    if (!isTv) return [];
    const list = (showData?.seasons ?? []).filter((s: any) => s.season_number > 0);
    if (list.length > 0) return list;
    return [{ season_number: 1, name: "Season 1", episode_count: 10 }];
  }, [isTv, showData]);

  // Season Options for Select
  const seasonOptions: Opt[] = useMemo(() => {
    return availableSeasons.map((s) => ({
      value: String(s.season_number),
      label: s.name || `Season ${s.season_number}`,
      hint: s.episode_count ? `${s.episode_count} eps` : undefined,
    }));
  }, [availableSeasons]);

  // Current Season Object
  const currentSeasonObj = availableSeasons.find((s) => s.season_number === season);

  // Episodes list from season details or fallback to placeholders
  const episodesList: any[] = useMemo(() => {
    if (!isTv) return [];
    const eps: any[] = seasonData?.episodes ?? [];
    if (eps.length > 0) return eps;
    const count = currentSeasonObj?.episode_count || Math.max(episode, 12);
    return Array.from({ length: count }, (_, i) => ({
      episode_number: i + 1,
      name: `Episode ${i + 1}`,
      runtime: undefined,
      overview: "",
    }));
  }, [isTv, seasonData, currentSeasonObj, episode]);

  // Episode Options for Select
  const episodeOptions: Opt[] = useMemo(() => {
    return episodesList.map((e) => ({
      value: String(e.episode_number),
      label: `E${e.episode_number}: ${e.name || `Episode ${e.episode_number}`}`,
      hint: e.runtime ? `${e.runtime}m` : undefined,
    }));
  }, [episodesList]);

  // Current episode details
  const currentEpisodeObj = episodesList.find((e) => e.episode_number === episode);
  const currentEpisodeTitle = currentEpisodeObj?.name || (isTv ? `Episode ${episode}` : "");

  // Server selection (defaulting to Server 1: Vidly Pro VIP)
  const [currentServer, setCurrentServer] = useState<string>(STREAM_SERVERS[0].id);

  // Dubbed language state
  const [dubLanguage, setDubLanguage] = useState<string>("en");

  // Top bar visibility and auto-hide states
  const [topBarVisible, setTopBarVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHoveringHeader, setIsHoveringHeader] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zapCount, setZapCount] = useState(0);

  // Ad Shield state for Servers 7, 9, 10
  const isAdShieldServer = ["vidfast", "vidsrc-direct", "vidsrc-buzz"].includes(currentServer);
  const [adShieldAbsorber, setAdShieldAbsorber] = useState(true);

  // Reset ad absorber whenever server or stream changes
  useEffect(() => {
    setAdShieldAbsorber(true);
  }, [currentServer, zapCount, season, episode]);

  // Fetch trailers & videos from TMDb proxy
  const { data: videoData } = useTmdb<any>(`/${type}/${media.id}/videos`);
  const trailer = pickTrailer(videoData?.results);

  // Computed streaming URL
  const isTrailerMode = currentServer === "trailer";
  const url = isTrailerMode
    ? trailer
      ? `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`
      : ""
    : getStreamUrl({
        type,
        id: media.id,
        season: isTv ? season : undefined,
        episode: isTv ? episode : undefined,
        serverId: currentServer,
      });

  const video = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  // Active episode / media label
  const activeLabel = isTv
    ? `S${season} · E${episode}${currentEpisodeTitle ? ` · ${currentEpisodeTitle}` : ""}`
    : initialLabel;

  // Active server object
  const activeServerObj = STREAM_SERVERS.find((s) => s.id === currentServer) || STREAM_SERVERS[0];

  // Auto-collapse top bar ONLY after inactivity and NEVER while menu is open or hovering/interacting
  useEffect(() => {
    if (!topBarVisible || menuOpen || isHoveringHeader) return;
    const idleTimer = setTimeout(() => {
      if (!menuOpen && !isHoveringHeader) {
        setTopBarVisible(false);
      }
    }, 6000);
    return () => clearTimeout(idleTimer);
  }, [topBarVisible, menuOpen, isHoveringHeader]);

  // Handle clicking outside 3-lines dropdown menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  // Reset loading spinner on server change, episode change or zap
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 900); // 900ms failsafe
    return () => clearTimeout(t);
  }, [url, zapCount, season, episode]);

  // Keyboard shortcuts: Esc, F (fullscreen), Z (zap ads)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) {
          setMenuOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "z" || e.key === "Z") {
        zapAds();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, menuOpen]);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Zap Ads action
  const zapAds = () => {
    setZapCount((c) => c + 1);
    setIsLoading(true);
    if (iframeRef.current) {
      const curSrc = iframeRef.current.src;
      iframeRef.current.src = "about:blank";
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = curSrc;
      }, 80);
    }
  };

  // Listen to postMessage from iframe embeds for progress saving
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data) return;
        if (data.type === "MEDIA_DATA" && data.data) {
          const { currentTime, duration } = data.data;
          if (duration && duration > 0) {
            saveProgress(media, currentTime, duration, activeLabel);
          }
        } else if (data.event === "timeupdate" && data.currentTime && data.duration) {
          saveProgress(media, data.currentTime, data.duration, activeLabel);
        }
      } catch {}
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [media, activeLabel]);

  // Ad Shield: Aggressive window.open override & auto-refocus blur handler
  useEffect(() => {
    const origOpen = window.open;
    const blockWindowOpen = function (...args: any[]) {
      console.warn("[Ad Shield] Blocked popup / window.open attempt:", args);
      return null;
    };
    window.open = blockWindowOpen;
    try {
      Object.defineProperty(window, "open", {
        configurable: true,
        writable: true,
        value: blockWindowOpen,
      });
    } catch {}

    // Auto-refocus handler on blur to counter popunders & tab defocusing
    const handleBlur = () => {
      window.focus();
      setTimeout(() => window.focus(), 25);
      setTimeout(() => window.focus(), 60);
      setTimeout(() => window.focus(), 150);
      setTimeout(() => window.focus(), 300);
    };
    window.addEventListener("blur", handleBlur);

    // Anti-hijack beforeunload handler to prevent rogue cross-origin iframe scripts from navigating top window away
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.open = origOpen;
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Native HLS & Direct Video playback handling
  useEffect(() => {
    const v = video.current;
    if (!url || !isFile(url)) return;

    let hlsInstance: any = null;
    const resume = progressStore.get()[keyOf(media)];

    const onMeta = () => {
      if (resume && resume.pct < 96 && resume.time > 0) {
        v.currentTime = resume.time;
        setResumeNotice(`Resumed at ${formatTime(resume.time)}`);
        const timer = setTimeout(() => setResumeNotice(null), 3500);
        return () => clearTimeout(timer);
      }
    };
    v.addEventListener("loadedmetadata", onMeta);

    const onVideoError = () => {
      setErr("The video stream encountered an error. Try switching to another server.");
    };
    v.addEventListener("error", onVideoError);

    if (/\.m3u8/i.test(url) && !v.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          return setErr("This browser does not support HLS streaming.");
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal) {
            switch (d.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setErr("Stream playback failed. Please select another server.");
                break;
            }
          }
        });

        hls.loadSource(url);
        hls.attachMedia(v);
        hlsInstance = hls;
        v.play().catch(() => {});
      });
    } else {
      v.src = url;
      v.play().catch(() => {});
    }

    let lastTime = 0;
    const onTime = () => {
      if (Date.now() - lastTime > 4000) {
        lastTime = Date.now();
        saveProgress(media, v.currentTime, v.duration, activeLabel);
      }
    };
    v.addEventListener("timeupdate", onTime);

    return () => {
      saveProgress(media, v.currentTime, v.duration, activeLabel);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error", onVideoError);
      hlsInstance?.destroy();
    };
  }, [url, media, activeLabel]);

  // Dub Language change handler
  const handleDubChange = (lang: string) => {
    setDubLanguage(lang);
    if (lang === "hi" || lang === "ja" || lang === "ta" || lang === "te") {
      // Auto-switch to multi-language or dubbed server if current server isn't
      if (currentServer !== "vidly" && currentServer !== "global" && currentServer !== "animeworld") {
        setCurrentServer("global");
      }
    }
  };

  // Custom UI-based Options for Server and Dubbing
  const serverOptions: Opt[] = [
    ...STREAM_SERVERS.map((s) => ({
      value: s.id,
      label: s.name,
      hint: s.badge,
    })),
    ...(trailer
      ? [{ value: "trailer", label: "Official Trailer", hint: "YouTube 4K" }]
      : []),
  ];

  const DUB_OPTIONS: Opt[] = [
    { value: "en", label: "🌐 English", hint: "Original" },
    { value: "hi", label: "🇮🇳 Hindi", hint: "Dubbed" },
    { value: "ja", label: "🇯🇵 Japanese", hint: "Original/Dub" },
    { value: "ta", label: "🇮🇳 Tamil", hint: "Dubbed" },
    { value: "te", label: "🇮🇳 Telugu", hint: "Dubbed" },
    { value: "es", label: "🇪🇸 Spanish", hint: "Dubbed" },
    { value: "fr", label: "🇫🇷 French", hint: "Dubbed" },
    { value: "de", label: "🇩🇪 German", hint: "Dubbed" },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-black select-none font-sans overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${titleOf(media)}`}
    >
      {/* Floating Reveal Tab when top bar is collapsed: transparent down arrow button at top center */}
      {!topBarVisible && (
        <button
          onClick={() => setTopBarVisible(true)}
          title="Show Controls"
          aria-label="Show Controls"
          className="absolute left-1/2 top-0 z-50 -translate-x-1/2 rounded-b-2xl border border-white/20 bg-black/40 hover:bg-black/80 px-6 py-1.5 backdrop-blur-md text-white/90 shadow-2xl transition hover:py-2"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {/* Top Player HUD Header */}
      <header
        onMouseEnter={() => setIsHoveringHeader(true)}
        onMouseLeave={() => setIsHoveringHeader(false)}
        className={`absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-gradient-to-b from-[#09090d]/98 via-[#09090d]/90 to-transparent p-2 sm:px-6 sm:py-3.5 landscape:max-h-[520px]:py-1 landscape:max-h-[520px]:px-3 backdrop-blur-xl transition-all duration-300 transform ${
          topBarVisible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left Info: Back Button, Title, and Badges */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3.5 shrink-0">
            <button
              onClick={onClose}
              autoFocus
              aria-label="Back to Movie Details"
              title="Back to Movie Details (Esc)"
              className="flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 py-1.5 sm:px-3 sm:py-2 landscape:max-h-[520px]:px-2 landscape:max-h-[520px]:py-1 text-xs landscape:max-h-[520px]:text-[11px] font-bold text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 active:scale-95"
            >
              <Icon name="left" size={14} />
              <span className="hidden sm:inline landscape:max-h-[520px]:hidden">Back</span>
            </button>

            <div className="min-w-0">
              <h2 className="shrink min-w-[80px] max-w-[140px] sm:max-w-[280px] lg:max-w-md landscape:max-h-[520px]:max-w-[130px] truncate font-display text-xs sm:text-base lg:text-lg font-extrabold text-white">
                {titleOf(media)}
              </h2>
              <div className="mt-0.5 flex items-center flex-nowrap gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap overflow-hidden text-[9px] sm:text-[11px] landscape:max-h-[520px]:text-[9px]">
                <span className="rounded-md bg-red-600/90 px-1 sm:px-1.5 py-0.5 font-bold text-white shadow-xs shrink-0 whitespace-nowrap">
                  {isTrailerMode ? "Trailer" : activeServerObj.name.split(":")[0]}
                </span>
                <span className="hidden xs:inline-block rounded-md border border-white/20 bg-white/10 px-1 sm:px-1.5 py-0.5 font-semibold text-white/90 shrink-0 whitespace-nowrap">
                  4K Ultra HD
                </span>
                <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-600/20 px-1.5 py-0.5 font-semibold text-purple-300 shrink-0 whitespace-nowrap">
                  <Icon name="volume" size={11} /> Dolby Atmos
                </span>
                {isTv && (
                  <span className="rounded-md bg-white/15 px-1 sm:px-1.5 py-0.5 font-bold text-amber shrink-0 whitespace-nowrap">
                    S{season}:E{episode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls: Exactly and ONLY in this order:
              a) Season dropdown (desktop / wide viewports)
              b) Episode dropdown (desktop / wide viewports)
              c) Zap Ads button (⚡ Zap Ads)
              d) 3-lines menu button (≡) with sleek dropdown menu for Server and Dub
              e) Cross close button (✕)
          */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* a) Season dropdown (desktop) */}
            {isTv && (
              <div className="hidden md:block w-[80px] sm:w-[110px]">
                <Select
                  size="sm"
                  value={String(season)}
                  onChange={(v) => {
                    setSeason(Number(v));
                    setEpisode(1);
                  }}
                  options={seasonOptions}
                  className="w-full text-xs font-semibold bg-[#161722]/95 border-white/20"
                  ariaLabel="Select Season"
                />
              </div>
            )}

            {/* b) Episode dropdown (desktop) */}
            {isTv && (
              <div className="hidden md:block w-[105px] sm:w-[160px] md:w-[200px]">
                <Select
                  size="sm"
                  value={String(episode)}
                  onChange={(v) => setEpisode(Number(v))}
                  options={episodeOptions}
                  className="w-full text-xs font-semibold bg-[#161722]/95 border-white/20 hover:border-red-500/50"
                  ariaLabel="Select Episode"
                />
              </div>
            )}

            {/* c) Zap Ads button */}
            <button
              onClick={zapAds}
              title="Zap Ads & Refresh Clean Stream (Key: Z)"
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-red-500/40 bg-red-600/20 px-2 sm:px-2.5 py-1.5 sm:py-2 landscape:max-h-[520px]:py-1 landscape:max-h-[520px]:px-2 text-[10px] sm:text-xs font-bold text-red-200 transition hover:bg-red-600 hover:text-white active:scale-95 shadow-sm shrink-0"
            >
              <span className="text-red-400">⚡</span>
              <span>Zap</span>
              <span className="hidden sm:inline">Ads</span>
            </button>

            {/* d) 3-lines menu button (≡) with sleek dropdown menu for Server and Dub Language */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Server and Audio Settings"
                title="Server & Audio Settings (≡)"
                aria-expanded={menuOpen}
                className={`grid size-8 sm:size-9 place-items-center rounded-xl border transition active:scale-95 ${
                  menuOpen
                    ? "border-red-500 bg-red-600/30 text-white"
                    : "border-white/15 bg-white/10 text-white hover:bg-white/20 hover:border-white/30"
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-white/15 bg-[#0e0f17]/98 backdrop-blur-2xl shadow-2xl p-3 z-50 animate-[fade_.15s_ease-out]">
                  {/* Pick the Server (all 10 servers with badges and active checkmark) */}
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between px-1 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
                        Streaming Servers
                      </span>
                      <span className="text-[10px] font-bold text-red-400">
                        {activeServerObj.name.split(":")[0]}
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                      {serverOptions.map((s) => {
                        const isActive = currentServer === s.value;
                        return (
                          <button
                            key={s.value}
                            onClick={() => {
                              setCurrentServer(s.value);
                              setMenuOpen(false);
                            }}
                            className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition active:scale-[0.98] ${
                              isActive
                                ? "bg-red-600/25 border border-red-500/60 text-white font-bold"
                                : "border border-transparent bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="truncate font-semibold">{s.label}</div>
                              {s.hint && (
                                <div className="text-[10px] text-white/40 group-hover:text-white/60">
                                  {s.hint}
                                </div>
                              )}
                            </div>
                            {isActive ? (
                              <svg
                                className="size-4 shrink-0 text-red-500"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <span className="size-3.5 shrink-0 rounded-full border border-white/20 group-hover:border-white/40" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-2 border-t border-white/10" />

                  {/* Pick the Dub/Audio Language */}
                  <div>
                    <div className="flex items-center justify-between px-1 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
                        Audio / Dub Language
                      </span>
                      <span className="text-[10px] font-bold text-accent">
                        {DUB_OPTIONS.find((d) => d.value === dubLanguage)?.label || "English"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DUB_OPTIONS.map((opt) => {
                        const isActive = dubLanguage === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              handleDubChange(opt.value);
                              setMenuOpen(false);
                            }}
                            className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition active:scale-[0.98] ${
                              isActive
                                ? "bg-red-600/25 border border-red-500/60 text-white font-bold"
                                : "border border-transparent bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isActive && (
                              <svg
                                className="size-3.5 shrink-0 text-red-500 ml-1"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* e) Cross close button (✕) */}
            <button
              onClick={onClose}
              aria-label="Exit Player"
              title="Exit Player (Esc)"
              className="grid size-8 sm:size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95 shrink-0"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Bottom Bar for Season & Episode selection on mobile & horizontal mobile */}
      {isTv && topBarVisible && (
        <div
          onMouseEnter={() => setIsHoveringHeader(true)}
          onMouseLeave={() => setIsHoveringHeader(false)}
          className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl border border-white/20 bg-[#09090d]/90 px-3 py-1.5 backdrop-blur-xl shadow-2xl animate-[fade_.2s_ease-out]"
        >
          <div className="w-[105px]">
            <Select
              size="sm"
              value={String(season)}
              onChange={(v) => {
                setSeason(Number(v));
                setEpisode(1);
              }}
              options={seasonOptions}
              className="w-full text-xs font-semibold bg-[#161722]/95 border-white/20"
              ariaLabel="Select Season"
            />
          </div>
          <div className="w-[145px] sm:w-[170px]">
            <Select
              size="sm"
              value={String(episode)}
              onChange={(v) => setEpisode(Number(v))}
              options={episodeOptions}
              className="w-full text-xs font-semibold bg-[#161722]/95 border-white/20 hover:border-red-500/50"
              ariaLabel="Select Episode"
            />
          </div>
        </div>
      )}

      {/* Main Video Viewport Stage */}
      <div className="relative size-full flex-1 bg-black overflow-hidden">
        {/* Netflix Red Circular Buffering Spinner Overlay */}
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs transition-opacity duration-300">
            <div className="relative flex flex-col items-center">
              <div className="size-16 animate-spin rounded-full border-4 border-white/10 border-t-red-600 shadow-xl shadow-red-600/30" />
              <div className="mt-5 font-display text-sm font-black tracking-wider text-white">
                Loading Stream in 4K Ultra HD
              </div>
              <div className="mt-1 text-xs text-white/50">
                Connecting to {isTrailerMode ? "Official YouTube Trailer" : activeServerObj.name}...
              </div>
            </div>
          </div>
        )}

        {/* First-Interaction Ad Click Absorber Layer for Servers 7, 9, 10 */}
        {isAdShieldServer && adShieldAbsorber && !isLoading && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAdShieldAbsorber(false);
              window.focus();
              setTimeout(() => window.focus(), 30);
              setTimeout(() => window.focus(), 100);
            }}
            className="absolute inset-0 z-20 cursor-pointer bg-black/10 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-200"
            title="Click to Activate Stream Safely (Ad Shield Protected)"
          >
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-black/80 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md transition hover:scale-105 hover:bg-black/95">
              <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>⚡ Ad Shield Active • Click to Play</span>
            </div>
          </div>
        )}

        {/* Video Player Core: Native Video or Universal Iframe Embed */}
        {url && isFile(url) ? (
          <video
            ref={video}
            controls
            playsInline
            autoPlay
            className="size-full bg-black object-contain"
          />
        ) : url ? (
          <iframe
            key={`${url}-${zapCount}`}
            ref={iframeRef}
            src={url}
            title={titleOf(media)}
            onLoad={() => {
              setIsLoading(false);
              if (!menuOpen && !isHoveringHeader) {
                setTimeout(() => {
                  if (!menuOpen && !isHoveringHeader) setTopBarVisible(false);
                }, 4000);
              }
            }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; xr-spatial-tracking"
            allowFullScreen
            referrerPolicy="origin"
            sandbox={
              url.includes('cinesrc.st')
                ? "allow-scripts allow-same-origin allow-forms allow-presentation"
                : undefined
            }
            className="size-full border-0 bg-black"
          />
        ) : (
          <div className="relative flex size-full flex-col items-center justify-center gap-5 px-6 text-center">
            {trailer && (
              <iframe
                title="Trailer"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
                className="aspect-video w-full max-w-5xl rounded-xl border-0 bg-panel shadow-2xl"
              />
            )}
            <div className="max-w-xl rounded-xl border border-white/10 bg-panel/90 p-5 text-left backdrop-blur-md">
              <b className="text-sm text-white">Showing Official 4K Trailer</b>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                You can switch servers anytime from the server menu at the top right to watch the full {type === "tv" ? "series" : "movie"}.
              </p>
            </div>
          </div>
        )}

        {/* Resume notification banner */}
        {resumeNotice && (
          <div className="absolute bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/30 bg-[#12131a]/95 px-5 py-2.5 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md animate-[rise_.3s_both]">
            ✓ {resumeNotice}
          </div>
        )}

        {/* Error notice */}
        {err && (
          <div className="absolute inset-x-0 bottom-20 mx-auto w-fit rounded-xl border border-red-500/30 bg-red-950/80 px-5 py-3 text-sm text-red-200 shadow-2xl backdrop-blur-md">
            {err}
            <button
              onClick={() => {
                setErr("");
                zapAds();
              }}
              className="ml-3 underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
