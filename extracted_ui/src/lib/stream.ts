/**
 * CinemaVerse Multi-Server Streaming Subsystem
 * Supports VidLink Pro VIP (0 Ads), AutoEmbed, VidSrc Pro, MultiEmbed, Embed.su, etc.
 * Supports direct HLS/m3u8, direct video files, and responsive iframe embeds.
 */
export interface StreamServer {
  id: string;
  name: string;
  badge: string;
  build: (type: "movie" | "tv", id: number, season?: number, episode?: number) => string;
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: "vidlink",
    name: "Server 1: VidLink Pro VIP",
    badge: "0 Ads • 4K Aurora",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://vidlink.pro/tv/${id}/${s}/${e}?preview=1&theme=aurora&color=e50914&audioPicker=1&nextEpisode=1`
        : `https://vidlink.pro/movie/${id}?preview=1&theme=aurora&color=e50914&audioPicker=1`,
  },
  {
    id: "autoembed",
    name: "Server 2: AutoEmbed Global",
    badge: "High Speed CDN",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`
        : `https://player.autoembed.cc/embed/movie/${id}`,
  },
  {
    id: "vidsrc_pro",
    name: "Server 3: VidSrc Pro",
    badge: "Multi-Quality",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.pro/embed/movie/${id}`,
  },
  {
    id: "embedsu",
    name: "Server 4: Embed.su VIP",
    badge: "Fast Buffering",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://embed.su/embed/tv/${id}/${s}/${e}`
        : `https://embed.su/embed/movie/${id}`,
  },
  {
    id: "multiembed",
    name: "Server 5: MultiEmbed",
    badge: "Global Fallback",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  },
  {
    id: "cinesrc",
    name: "Server 6: CineSrc Stream",
    badge: "HD Multi-Audio",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://cinesrc.stream/embed/tv/${id}/${s}/${e}`
        : `https://cinesrc.stream/embed/movie/${id}`,
  },
  {
    id: "vidsrc_cc",
    name: "Server 7: VidSrc CC",
    badge: "Alternate CDN",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.cc/v2/embed/movie/${id}`,
  },
];

export const STREAMS: Record<string, string> = {};

const TEMPLATE = import.meta.env.VITE_STREAM_URL_TEMPLATE as string | undefined;

export function getStreamUrl(o: {
  type: "movie" | "tv";
  id: number;
  season?: number;
  episode?: number;
  serverId?: string;
}): string {
  const key = o.type === "tv" ? `tv:${o.id}:${o.season ?? 1}:${o.episode ?? 1}` : `movie:${o.id}`;
  if (STREAMS[key]) return STREAMS[key];
  if (o.type === "tv" && STREAMS[`tv:${o.id}`]) return STREAMS[`tv:${o.id}`];

  if (o.serverId) {
    const srv = STREAM_SERVERS.find((s) => s.id === o.serverId);
    if (srv) return srv.build(o.type, o.id, o.season ?? 1, o.episode ?? 1);
  }

  if (TEMPLATE) {
    return TEMPLATE.replace("{type}", o.type)
      .replace("{id}", String(o.id))
      .replace("{season}", String(o.season ?? 1))
      .replace("{episode}", String(o.episode ?? 1));
  }

  // Default to Server 1: VidLink Pro VIP
  return STREAM_SERVERS[0].build(o.type, o.id, o.season ?? 1, o.episode ?? 1);
}
