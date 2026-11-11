import { useEffect, useRef, useState } from "react";
import { getStreamUrl, STREAM_SERVERS } from "../lib/stream";
import { progressStore, keyOf, saveProgress } from "../lib/store";
import { pickTrailer, titleOf, typeOf, useTmdb, type Media } from "../lib/tmdb";
import { Icon } from "./ui";

const isFile = (u: string) => /\.(m3u8|mp4|webm|mov|mkv|mpd)(\?|#|$)/i.test(u);

export function Player({
  media,
  season,
  episode,
  label,
  onClose,
}: {
  media: Media;
  season?: number;
  episode?: number;
  label?: string;
  onClose: () => void;
}) {
  const type = typeOf(media);
  const [currentServer, setCurrentServer] = useState<string>(STREAM_SERVERS[0].id);
  const url = getStreamUrl({ type, id: media.id, season, episode, serverId: currentServer });
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const { data } = useTmdb<any>(!url ? `/${type}/${media.id}/videos` : null);
  const trailer = pickTrailer(data?.results);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const v = video.current;
    if (!url || !v || !isFile(url)) return;
    let hls: { destroy(): void } | undefined;
    const resume = progressStore.get()[keyOf(media)];
    const onMeta = () => resume && resume.pct < 96 && (v.currentTime = resume.time);
    v.addEventListener("loadedmetadata", onMeta);
    if (/\.m3u8/i.test(url) && !v.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) return setErr("This browser cannot play HLS streams.");
        const h = new Hls();
        h.on(
          Hls.Events.ERROR,
          (_, d) =>
            d.fatal && setErr("The stream could not be loaded. Check the URL and CORS settings."),
        );
        h.loadSource(url);
        h.attachMedia(v);
        hls = h;
        v.play().catch(() => {});
      });
    } else {
      v.src = url;
      v.play().catch(() => {});
    }
    let last = 0;
    const onTime = () => {
      if (Date.now() - last > 5000) {
        last = Date.now();
        saveProgress(media, v.currentTime, v.duration, label);
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => {
      saveProgress(media, v.currentTime, v.duration, label);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      hls?.destroy();
    };
  }, [url, media, label]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${titleOf(media)}`}
    >
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-linear-to-b from-black/90 via-black/50 to-transparent p-4 sm:gap-4 sm:p-6">
        <button
          onClick={onClose}
          autoFocus
          aria-label="Back"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/25 active:scale-95"
        >
          <Icon name="left" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold sm:text-lg">{titleOf(media)}</p>
          {label && <p className="truncate text-xs text-white/60">{label}</p>}
        </div>

        {/* Server Selector Dropdown */}
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={currentServer}
            onChange={(e) => setCurrentServer(e.target.value)}
            className="cursor-pointer rounded-lg border border-white/20 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:border-white/40 focus:border-accent focus:outline-none"
          >
            {STREAM_SERVERS.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#141419] py-1 text-white">
                {s.name} ({s.badge})
              </option>
            ))}
          </select>
        </div>
      </div>

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
          key={url}
          src={url}
          title={titleOf(media)}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          className="size-full border-0"
        />
      ) : (
        <div className="relative flex size-full flex-col items-center justify-center gap-5 px-6 text-center">
          {trailer && (
            <iframe
              title="Trailer"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
              className="aspect-video w-full max-w-5xl rounded-xl border-0 bg-panel"
            />
          )}
        </div>
      )}
      {err && (
        <p className="absolute inset-x-0 bottom-24 mx-auto w-fit rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200">
          {err}
        </p>
      )}
    </div>
  );
}
