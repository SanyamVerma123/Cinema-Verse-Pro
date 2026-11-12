import { useEffect, useMemo, useRef, useState } from "react";
import { getStreamUrl, STREAM_SERVERS } from "../lib/stream";
import { progressStore, keyOf, saveProgress } from "../lib/store";
import { img, pickTrailer, titleOf, typeOf, useTmdb, type Media } from "../lib/tmdb";
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
  const [episodesDrawerOpen, setEpisodesDrawerOpen] = useState(false);

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

  // Stepper limits
  const totalEpisodesInSeason = episodesList.length;
  const hasNextEpisode = isTv && (episode < totalEpisodesInSeason || availableSeasons.some((s) => s.season_number > season));
  const hasPrevEpisode = isTv && (episode > 1 || season > 1);

  // Server selection (defaulting to Server 1: Vidly Pro VIP)
  const [currentServer, setCurrentServer] = useState<string>(STREAM_SERVERS[0].id);

  // Dubbed language state
  const [dubLanguage, setDubLanguage] = useState<string>("en");

  // Top bar visibility toggle
  const [topBarVisible, setTopBarVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zapCount, setZapCount] = useState(0);

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

  // Reset loading spinner on server change, episode change or zap
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 900); // 900ms failsafe
    return () => clearTimeout(t);
  }, [url, zapCount, season, episode]);

  // Keyboard shortcuts: Esc, F (fullscreen), Z (zap ads), N (next ep), P (prev ep), E (episodes drawer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (episodesDrawerOpen) {
          setEpisodesDrawerOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "z" || e.key === "Z") {
        zapAds();
      } else if (isTv && (e.key === "n" || e.key === "N")) {
        nextEpisode();
      } else if (isTv && (e.key === "p" || e.key === "P")) {
        prevEpisode();
      } else if (isTv && (e.key === "e" || e.key === "E")) {
        setEpisodesDrawerOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isTv, season, episode, episodesDrawerOpen]);

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

  // TV Episode Steppers
  const nextEpisode = () => {
    if (episode < totalEpisodesInSeason) {
      setEpisode((e) => e + 1);
    } else {
      const nextS = availableSeasons.find((s) => s.season_number === season + 1);
      if (nextS) {
        setSeason(nextS.season_number);
        setEpisode(1);
      }
    }
  };

  const prevEpisode = () => {
    if (episode > 1) {
      setEpisode((e) => e - 1);
    } else if (season > 1) {
      const prevS = availableSeasons.find((s) => s.season_number === season - 1);
      if (prevS) {
        setSeason(prevS.season_number);
        setEpisode(prevS.episode_count || 1);
      }
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

  // Native HLS & Direct Video playback handling
  useEffect(() => {
    const v = video.current;
    if (!url || !v || !isFile(url)) return;

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
                setErr("Stream playback failed. Please select another server above.");
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
      className="fixed inset-0 z-[100] flex flex-col bg-black select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${titleOf(media)}`}
    >
      {/* Floating Reveal Tab when top bar is collapsed */}
      {!topBarVisible && (
        <button
          onClick={() => setTopBarVisible(true)}
          title="Click to Show Controls"
          className="absolute left-1/2 top-0 z-50 -translate-x-1/2 rounded-b-xl border border-t-0 border-white/20 bg-black/80 px-6 py-2 text-white/80 shadow-2xl backdrop-blur-md transition-all hover:bg-black hover:text-white hover:py-2.5"
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
      {topBarVisible && (
        <header className="absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-gradient-to-b from-[#09090d]/98 via-[#09090d]/90 to-transparent p-2.5 sm:px-6 sm:py-3.5 backdrop-blur-xl transition-all duration-300">
          {/* Main Top Row */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Info: Back Button, Title, and Quality Badges */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <button
                onClick={onClose}
                autoFocus
                aria-label="Back to Movie Details"
                title="Back to Movie Details (Esc)"
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 hover:border-white/30 active:scale-95"
              >
                <Icon name="left" size={15} />
                <span className="hidden sm:inline">Back</span>
              </button>

              <div className="min-w-0">
                <h2 className="truncate font-display text-xs sm:text-base lg:text-lg font-extrabold text-white">
                  {titleOf(media)}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[11px]">
                  <span className="rounded-md bg-red-600/90 px-1 sm:px-1.5 py-0.5 font-bold text-white shadow-xs">
                    {isTrailerMode ? "Trailer" : activeServerObj.name.split(":")[0]}
                  </span>
                  <span className="rounded-md border border-white/20 bg-white/10 px-1 sm:px-1.5 py-0.5 font-semibold text-white/90">
                    4K Ultra HD
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-600/20 px-1.5 py-0.5 font-semibold text-purple-300">
                    <Icon name="volume" size={11} /> Dolby Atmos
                  </span>
                  {isTv && (
                    <span className="rounded-md bg-white/15 px-1 sm:px-1.5 py-0.5 font-bold text-amber">
                      S{season}:E{episode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Controls: Desktop Dropdowns + Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* TV Season & Episode Selectors (Desktop) */}
              {isTv && (
                <div className="hidden lg:flex items-center gap-1.5">
                  {/* Season Select (if more than 1 season) */}
                  {availableSeasons.length > 1 && (
                    <Select
                      size="sm"
                      value={String(season)}
                      onChange={(v) => {
                        setSeason(Number(v));
                        setEpisode(1);
                      }}
                      options={seasonOptions}
                      className="w-[110px] text-xs font-semibold bg-[#161722]/95 border-white/20"
                      ariaLabel="Select Season"
                    />
                  )}

                  {/* Episode Select Dropdown */}
                  <Select
                    size="sm"
                    value={String(episode)}
                    onChange={(v) => setEpisode(Number(v))}
                    options={episodeOptions}
                    className="w-[170px] xl:w-[210px] text-xs font-semibold bg-[#161722]/95 border-white/20 hover:border-accent/50"
                    ariaLabel="Select Episode"
                  />

                  {/* Quick Prev / Next Episode Buttons */}
                  <div className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-xl border border-white/15">
                    <button
                      onClick={prevEpisode}
                      disabled={!hasPrevEpisode}
                      title="Previous Episode (Key: P)"
                      className="px-2 py-1 text-xs font-semibold text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-white/10 transition"
                    >
                      {"‹ Prev"}
                    </button>
                    <button
                      onClick={nextEpisode}
                      disabled={!hasNextEpisode}
                      title="Next Episode (Key: N)"
                      className="px-2 py-1 text-xs font-semibold text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-white/10 transition"
                    >
                      {"Next ›"}
                    </button>
                  </div>

                  {/* View All Episodes Drawer Button */}
                  <button
                    onClick={() => setEpisodesDrawerOpen(true)}
                    title="Browse All Episodes (Key: E)"
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                  >
                    <Icon name="list" size={14} />
                    <span className="hidden xl:inline">Episodes</span>
                  </button>
                </div>
              )}

              {/* Server Custom Select (Desktop, shown on sm+) */}
              <div className="hidden sm:block">
                <Select
                  size="sm"
                  value={currentServer}
                  onChange={(v) => setCurrentServer(v)}
                  options={serverOptions}
                  className="w-[180px] lg:w-[210px] text-xs font-semibold bg-[#161722]/95 border-white/20 hover:border-red-500/50"
                  ariaLabel="Select Streaming Server"
                />
              </div>

              {/* Audio / Dubbed Custom Select (Desktop, shown on md+) */}
              <div className="hidden md:block">
                <Select
                  size="sm"
                  value={dubLanguage}
                  onChange={(v) => handleDubChange(v)}
                  options={DUB_OPTIONS}
                  className="w-[130px] lg:w-[150px] text-xs font-semibold bg-white/10 border-white/15"
                  ariaLabel="Select Dubbed Audio Track"
                />
              </div>

              {/* Zap Ads Button */}
              <button
                onClick={zapAds}
                title="Zap Ads & Refresh Clean Stream (Key: Z)"
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-red-500/40 bg-red-600/20 px-2 sm:px-2.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-red-200 transition hover:bg-red-600 hover:text-white active:scale-95 shadow-sm"
              >
                <span className="text-red-400">⚡</span>
                <span className="hidden xs:inline sm:inline">Zap</span>
                <span className="hidden sm:inline">Ads</span>
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                title="Fullscreen (Key: F)"
                aria-label="Toggle Fullscreen"
                className="grid size-8 sm:size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {isFullscreen ? (
                    <>
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </>
                  ) : (
                    <>
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </>
                  )}
                </svg>
              </button>

              {/* Collapse Controls Button (Desktop) */}
              <button
                onClick={() => setTopBarVisible(false)}
                title="Hide Controls (Click to Collapse)"
                aria-label="Hide Controls"
                className="hidden sm:grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                aria-label="Exit Player"
                title="Exit Player (Esc)"
                className="grid size-8 sm:size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          </div>

          {/* Mobile Sub-Header: Scrollable controls including Episode Selector, Server & Dubbing */}
          <div className="mt-2 flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 border-t border-white/10">
            {/* Server Selector on Mobile */}
            <div className="w-[130px] shrink-0">
              <Select
                size="sm"
                value={currentServer}
                onChange={(v) => setCurrentServer(v)}
                options={serverOptions}
                className="w-full text-[11px] font-semibold bg-[#161722]/95 border-white/20"
                ariaLabel="Streaming Server"
              />
            </div>

            {/* TV Series Episode & Season Selector on Mobile */}
            {isTv && (
              <>
                {availableSeasons.length > 1 && (
                  <div className="w-[95px] shrink-0">
                    <Select
                      size="sm"
                      value={String(season)}
                      onChange={(v) => {
                        setSeason(Number(v));
                        setEpisode(1);
                      }}
                      options={seasonOptions}
                      className="w-full text-[11px] font-semibold bg-[#161722]/95 border-white/20"
                      ariaLabel="Season"
                    />
                  </div>
                )}

                <div className="w-[140px] shrink-0">
                  <Select
                    size="sm"
                    value={String(episode)}
                    onChange={(v) => setEpisode(Number(v))}
                    options={episodeOptions}
                    className="w-full text-[11px] font-semibold bg-[#161722]/95 border-white/20"
                    ariaLabel="Episode"
                  />
                </div>

                <div className="flex items-center gap-0.5 shrink-0 bg-white/10 p-0.5 rounded-xl border border-white/15">
                  <button
                    onClick={prevEpisode}
                    disabled={!hasPrevEpisode}
                    className="px-2 py-1 text-[11px] font-bold text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg"
                    title="Previous Episode"
                  >
                    {"‹"}
                  </button>
                  <button
                    onClick={nextEpisode}
                    disabled={!hasNextEpisode}
                    className="px-2 py-1 text-[11px] font-bold text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg"
                    title="Next Episode"
                  >
                    {"›"}
                  </button>
                </div>

                <button
                  onClick={() => setEpisodesDrawerOpen(true)}
                  className="flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95"
                  title="Browse All Episodes"
                >
                  <Icon name="list" size={13} />
                  <span>Episodes</span>
                </button>
              </>
            )}

            {/* Audio Dubbing on Mobile */}
            <div className="w-[110px] shrink-0">
              <Select
                size="sm"
                value={dubLanguage}
                onChange={(v) => handleDubChange(v)}
                options={DUB_OPTIONS}
                className="w-full text-[11px] font-semibold bg-white/10 border-white/15"
                ariaLabel="Audio Dubbing"
              />
            </div>
          </div>
        </header>
      )}

      {/* Main Video Viewport Stage */}
      <div className="relative size-full flex-1 bg-black">
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
            onLoad={() => setIsLoading(false)}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; xr-spatial-tracking"
            allowFullScreen
            referrerPolicy="origin"
            sandbox={url.includes('vidfast.vc') || url.includes('vidlink.pro') || url.includes('vidsrc.su') || url.includes('vidsrc.buzz') || url.includes('cinesrc.st') || url.includes('123embed.net') ? "allow-scripts allow-same-origin allow-forms allow-presentation" : undefined}
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
                You can switch servers anytime from the server dropdown at the top right to watch the full {type === "tv" ? "series" : "movie"}.
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

      {/* Episodes Drawer Overlay (Quick episode switcher with rich thumbnails and overviews) */}
      {isTv && episodesDrawerOpen && (
        <div
          className="fixed inset-0 z-[120] flex justify-end bg-black/75 backdrop-blur-sm animate-[fade_.2s_both]"
          onClick={() => setEpisodesDrawerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Episodes list"
            onClick={(e) => e.stopPropagation()}
            className="no-scrollbar relative flex size-full max-w-md flex-col bg-[#0e0f16] border-l border-white/10 shadow-2xl shadow-black animate-[slideInRight_.3s_cubic-bezier(.16,1,.3,1)_both]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#141520]/90 px-5 py-4 backdrop-blur-md">
              <div className="min-w-0 pr-2">
                <h3 className="font-display text-base font-extrabold text-white truncate">
                  {titleOf(media)}
                </h3>
                <p className="text-xs text-white/50">
                  {currentSeasonObj?.name || `Season ${season}`} • {episodesList.length} Episodes
                </p>
              </div>
              <button
                onClick={() => setEpisodesDrawerOpen(false)}
                aria-label="Close Episodes Drawer"
                className="grid size-8 place-items-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition active:scale-95"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            {/* Season Selector inside drawer */}
            {availableSeasons.length > 1 && (
              <div className="p-4 border-b border-white/8 bg-[#11121a]">
                <Select
                  size="sm"
                  label="Season"
                  value={String(season)}
                  onChange={(v) => {
                    setSeason(Number(v));
                    setEpisode(1);
                  }}
                  options={seasonOptions}
                  className="w-full text-xs font-bold"
                />
              </div>
            )}

            {/* Episodes List */}
            <div className="no-scrollbar flex-1 overflow-y-auto p-4 space-y-3">
              {episodesList.map((e) => {
                const isCur = e.episode_number === episode;
                return (
                  <button
                    key={e.episode_number}
                    onClick={() => {
                      setEpisode(e.episode_number);
                      setEpisodesDrawerOpen(false);
                    }}
                    className={`group w-full flex items-start gap-3 rounded-2xl p-2.5 text-left border transition active:scale-[0.99] ${
                      isCur
                        ? "border-accent/60 bg-accent/15 shadow-lg shadow-accent/10"
                        : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-panel">
                      {e.still_path ? (
                        <img
                          src={img(e.still_path, "w500")}
                          alt=""
                          className="size-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center bg-[#171822] text-xs font-bold text-white/30">
                          E{e.episode_number}
                        </div>
                      )}
                      <span className={`absolute inset-0 grid place-items-center transition ${isCur ? "bg-black/40 opacity-100" : "bg-black/30 opacity-0 group-hover:opacity-100"}`}>
                        <span className={`grid size-7 place-items-center rounded-full text-black ${isCur ? "bg-accent text-white" : "bg-white"}`}>
                          <Icon name="play" size={11} />
                        </span>
                      </span>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[11px] font-black ${isCur ? "text-accent" : "text-white/60"}`}>
                          EPISODE {e.episode_number}
                        </span>
                        {e.runtime && (
                          <span className="text-[10px] text-white/40 shrink-0">
                            {e.runtime}m
                          </span>
                        )}
                      </div>
                      <h4 className={`text-xs font-bold truncate mt-0.5 ${isCur ? "text-white" : "text-white/90 group-hover:text-white"}`}>
                        {e.name || `Episode ${e.episode_number}`}
                      </h4>
                      {e.overview && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/50">
                          {e.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
