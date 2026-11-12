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

  // Server selection (defaulting to Server 1: VidLink Pro VIP)
  const [currentServer, setCurrentServer] = useState<string>(STREAM_SERVERS[0].id);

  // Computed streaming URL
  const isTrailerMode = currentServer === "trailer";
  const url = isTrailerMode
    ? ""
    : getStreamUrl({
        type,
        id: media.id,
        season: isTv ? season : undefined,
        episode: isTv ? episode : undefined,
        serverId: currentServer,
      });

  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  // Fetch trailers & videos from TMDb proxy
  const { data: videoData } = useTmdb<any>(`/${type}/${media.id}/videos`);
  const trailer = pickTrailer(videoData?.results);

  // Active episode / media label
  const activeLabel = isTv
    ? `S${season} · E${episode}${initialLabel && !initialLabel.startsWith(`S${season}`) ? ` · ${initialLabel}` : ""}`
    : initialLabel;

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Listen to postMessage from iframe embeds (e.g. VidLink Pro) for progress saving
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data) return;
        // VidLink postMessage format: { type: "MEDIA_DATA", data: { currentTime, duration } }
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

    // HLS .m3u8 playback
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

    let lastSave = 0;
    const onTime = () => {
      if (Date.now() - lastSave > 4000) {
        lastSave = Date.now();
        saveProgress(media, v.currentTime, v.duration, activeLabel);
      }
    };
    v.addEventListener("timeupdate", onTime);

    return () => {
      saveProgress(media, v.currentTime, v.duration, activeLabel);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error", onVideoError);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [url, media, activeLabel]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${titleOf(media)}`}
    >
      {/* Top Bar Header with Controls */}
      <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-black/95 via-black/60 to-transparent p-4 sm:p-6">
        {/* Left: Back button & Title Info */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onClose}
            autoFocus
            aria-label="Back"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/25 active:scale-95"
          >
            <Icon name="left" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-sm font-bold sm:text-base md:text-lg">
              {titleOf(media)}
            </h1>
            {activeLabel && <p className="truncate text-xs text-white/60">{activeLabel}</p>}
          </div>
        </div>

        {/* Right: TV Controls, Trailer Toggle & Server Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* TV Episode Quick Navigation Stepper */}
          {isTv && (
            <div className="flex items-center rounded-lg border border-white/15 bg-black/60 px-1.5 py-1 text-xs backdrop-blur-md">
              <button
                disabled={episode <= 1}
                onClick={() => {
                  setErr("");
                  setEpisode((e) => Math.max(1, e - 1));
                }}
                aria-label="Previous Episode"
                className="px-2 py-0.5 font-medium text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="Previous Episode"
              >
                Prev
              </button>
              <span className="px-2 font-semibold text-accent">
                S{season}:E{episode}
              </span>
              <button
                onClick={() => {
                  setErr("");
                  setEpisode((e) => e + 1);
                }}
                aria-label="Next Episode"
                className="px-2 py-0.5 font-medium text-white/70 transition hover:text-white"
                title="Next Episode"
              >
                Next
              </button>
            </div>
          )}

          {/* Official YouTube Trailer Toggle Button */}
          {trailer && (
            <button
              onClick={() => {
                setErr("");
                setCurrentServer((prev) => (prev === "trailer" ? STREAM_SERVERS[0].id : "trailer"));
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold backdrop-blur-md transition ${
                isTrailerMode
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                  : "border border-white/15 bg-white/10 text-white hover:bg-white/20"
              }`}
              title={isTrailerMode ? "Switch to Full Stream" : "Watch Official YouTube Trailer"}
            >
              <Icon name="play" size={13} />
              <span>{isTrailerMode ? "Stream Full" : "Trailer"}</span>
            </button>
          )}

          {/* Sleek Multi-Server Selector Dropdown */}
          <div className="relative">
            <select
              value={currentServer}
              onChange={(e) => {
                setErr("");
                setCurrentServer(e.target.value);
              }}
              aria-label="Select Streaming Server"
              className="cursor-pointer appearance-none rounded-lg border border-white/20 bg-black/80 py-1.5 pl-3 pr-8 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:border-white/40 focus:border-accent focus:outline-none"
            >
              <optgroup label="Streaming Servers (VIP)" className="bg-[#141419] text-white/60">
                {STREAM_SERVERS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#141419] py-1 text-white">
                    {s.name} ({s.badge})
                  </option>
                ))}
              </optgroup>
              {trailer && (
                <optgroup label="Official Media" className="bg-[#141419] text-white/60">
                  <option value="trailer" className="bg-[#141419] py-1 text-amber-400">
                    🎬 Official Trailer (YouTube HD)
                  </option>
                </optgroup>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-white/50">
              <Icon name="down" size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Playback Container */}
      <div className="relative flex size-full flex-1 items-center justify-center overflow-hidden bg-black">
        {/* Official YouTube Trailer Player */}
        {isTrailerMode ? (
          trailer ? (
            <iframe
              key={trailer.key}
              title={`${titleOf(media)} - Official Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
              className="size-full border-0 bg-black"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 px-6 text-center">
              <p className="text-base font-semibold text-white/80">Official Trailer Not Available</p>
              <p className="text-xs text-white/50">
                Switch back to a stream server above to watch the full title.
              </p>
              <button
                onClick={() => setCurrentServer(STREAM_SERVERS[0].id)}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-accent/80"
              >
                Switch to Server 1: VidLink Pro VIP
              </button>
            </div>
          )
        ) : url && isFile(url) ? (
          /* Direct Video / Native HLS Player */
          <video
            ref={video}
            controls
            playsInline
            autoPlay
            className="size-full bg-black object-contain"
          />
        ) : url ? (
          /* Multi-Server Responsive Embed */
          <iframe
            key={`${currentServer}:${url}`}
            src={url}
            title={titleOf(media)}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
            allowFullScreen
            className="size-full border-0 bg-black"
          />
        ) : (
          /* Fallback when stream URL is missing */
          <div className="flex flex-col items-center justify-center gap-4 px-6 text-center">
            {trailer ? (
              <iframe
                title="Trailer"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
                className="aspect-video w-full max-w-5xl rounded-xl border-0 bg-panel shadow-2xl"
              />
            ) : (
              <p className="text-sm text-white/60">No stream source available for this title.</p>
            )}
          </div>
        )}

        {/* Resume Position Indicator Toast */}
        {resumeNotice && (
          <div className="pointer-events-none absolute bottom-16 left-6 z-30 flex items-center gap-2 rounded-lg border border-white/20 bg-black/85 px-4 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            {resumeNotice}
          </div>
        )}

        {/* Error Notice */}
        {err && (
          <div className="absolute inset-x-0 bottom-16 mx-auto flex w-fit max-w-[90%] items-center gap-3 rounded-lg border border-red-500/30 bg-red-950/80 px-4 py-2.5 text-xs text-red-200 shadow-xl backdrop-blur-md">
            <span>{err}</span>
            <button
              onClick={() => {
                setErr("");
                // Switch to next server
                const idx = STREAM_SERVERS.findIndex((s) => s.id === currentServer);
                const next = STREAM_SERVERS[(idx + 1) % STREAM_SERVERS.length];
                setCurrentServer(next.id);
              }}
              className="rounded bg-red-500/30 px-2 py-1 font-semibold text-white transition hover:bg-red-500/50"
            >
              Try Next Server
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
