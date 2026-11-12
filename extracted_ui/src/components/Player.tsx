import { useEffect, useRef, useState } from "react";
import { getStreamUrl, STREAM_SERVERS } from "../lib/stream";
import { progressStore, keyOf, saveProgress } from "../lib/store";
import { pickTrailer, titleOf, typeOf, useTmdb, type Media } from "../lib/tmdb";
import { Icon } from "./ui";

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
    ? `S${season} · E${episode}${initialLabel && !initialLabel.startsWith(`S${season}`) ? ` · ${initialLabel}` : ""}`
    : initialLabel;

  // Active server object
  const activeServerObj = STREAM_SERVERS.find((s) => s.id === currentServer) || STREAM_SERVERS[0];

  // Reset loading spinner on server change or zap
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 900); // 900ms failsafe
    return () => clearTimeout(t);
  }, [url, zapCount]);

  // Keyboard shortcuts: Esc, F (fullscreen), Z (zap ads), N (next ep), P (prev ep)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "z" || e.key === "Z") {
        zapAds();
      } else if (isTv && (e.key === "n" || e.key === "N")) {
        nextEpisode();
      } else if (isTv && (e.key === "p" || e.key === "P")) {
        prevEpisode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isTv, season, episode]);

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
    setEpisode((e) => e + 1);
  };
  const prevEpisode = () => {
    setEpisode((e) => Math.max(1, e - 1));
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
        <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-b from-[#09090d]/95 via-[#09090d]/80 to-transparent p-3 sm:px-6 sm:py-3.5 backdrop-blur-md transition-all duration-300">
          {/* Left Info: Back Button, Title, and Quality Badges */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={onClose}
              autoFocus
              aria-label="Back to Movie Details"
              title="Back to Movie Details (Esc)"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 hover:border-white/30 active:scale-95"
            >
              <Icon name="left" size={16} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-extrabold text-white sm:text-base lg:text-lg">
                {titleOf(media)}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                <span className="rounded-md bg-red-600/90 px-1.5 py-0.5 font-bold text-white shadow-xs">
                  {isTrailerMode ? "Trailer" : activeServerObj.name.split(":")[0]}
                </span>
                <span className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-semibold text-white/90">
                  4K Ultra HD
                </span>
                <span className="hidden rounded-md border border-purple-500/40 bg-purple-600/20 px-1.5 py-0.5 font-semibold text-purple-300 sm:inline-flex items-center gap-1">
                  <Icon name="volume" size={11} /> Dolby Atmos
                </span>
                {isTv && (
                  <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-bold text-amber">
                    S{season}:E{episode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls: Server Dropdown, Audio Dub Selector, TV Steppers, Zap Ads, Fullscreen, Close */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* TV Episode Steppers */}
            {isTv && (
              <div className="hidden lg:flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/15">
                <button
                  onClick={prevEpisode}
                  disabled={episode <= 1}
                  title="Previous Episode (Key: P)"
                  className="px-2.5 py-1 text-xs font-semibold text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-white/10 transition"
                >
                  ‹ Prev
                </button>
                <span className="px-1.5 text-xs font-bold text-white/90">
                  Ep {episode}
                </span>
                <button
                  onClick={nextEpisode}
                  title="Next Episode (Key: N)"
                  className="px-2.5 py-1 text-xs font-semibold text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
                >
                  Next ›
                </button>
              </div>
            )}

            {/* Server Selector Dropdown */}
            <div className="relative flex items-center">
              <select
                value={currentServer}
                onChange={(e) => setCurrentServer(e.target.value)}
                aria-label="Select Streaming Server"
                className="h-9 cursor-pointer appearance-none rounded-xl border border-white/20 bg-[#161722]/90 pl-3 pr-8 text-xs font-bold text-white shadow-lg backdrop-blur-md outline-none transition hover:border-red-500 hover:bg-[#1f202e] focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                {STREAM_SERVERS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#12131a] text-white py-1">
                    {s.name} ({s.badge})
                  </option>
                ))}
                {trailer && (
                  <option value="trailer" className="bg-[#12131a] text-amber py-1">
                    Official Trailer (YouTube 4K)
                  </option>
                )}
              </select>
              <span className="pointer-events-none absolute right-2.5 text-white/50">
                <Icon name="down" size={13} />
              </span>
            </div>

            {/* Audio & Dubbed Language Selector */}
            <div className="relative hidden md:flex items-center">
              <select
                value={dubLanguage}
                onChange={(e) => handleDubChange(e.target.value)}
                aria-label="Change Dubbed Audio Track"
                title="Change Dubbed Audio Track"
                className="h-9 cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/10 pl-2.5 pr-7 text-xs font-semibold text-white/90 backdrop-blur outline-none transition hover:bg-white/20 focus:border-accent"
              >
                <option value="en" className="bg-[#12131a] text-white">🌐 English (Original)</option>
                <option value="hi" className="bg-[#12131a] text-white">🇮🇳 Hindi Dubbed</option>
                <option value="ja" className="bg-[#12131a] text-white">🇯🇵 Japanese Audio</option>
                <option value="ta" className="bg-[#12131a] text-white">🇮🇳 Tamil Dubbed</option>
                <option value="te" className="bg-[#12131a] text-white">🇮🇳 Telugu Dubbed</option>
                <option value="es" className="bg-[#12131a] text-white">🇪🇸 Spanish Dubbed</option>
                <option value="fr" className="bg-[#12131a] text-white">🇫🇷 French Dubbed</option>
                <option value="de" className="bg-[#12131a] text-white">🇩🇪 German Dubbed</option>
              </select>
              <span className="pointer-events-none absolute right-2 text-white/40">
                <Icon name="down" size={12} />
              </span>
            </div>

            {/* Zap Ads Button */}
            <button
              onClick={zapAds}
              title="Zap Ads & Refresh Clean Stream (Key: Z)"
              className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-600/20 px-2.5 py-2 text-xs font-bold text-red-200 transition hover:bg-red-600 hover:text-white active:scale-95 shadow-sm"
            >
              <span className="text-red-400">⚡</span>
              <span className="hidden sm:inline">Zap Ads</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title="Fullscreen (Key: F)"
              aria-label="Toggle Fullscreen"
              className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/25 active:scale-95"
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

            {/* Collapse Controls Button */}
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
              className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95"
            >
              <Icon name="close" size={16} />
            </button>
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
    </div>
  );
}
