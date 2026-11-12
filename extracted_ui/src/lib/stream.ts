/**
 * CinemaVerse Pro Universal Multi-Server Streaming Subsystem
 *
 * Maintains the exact server ranking from CinemaVerse Pro:
 *  Server 1: Vidly Pro VIP (Glassmorphism Aurora • Multi-Audio & 3 Servers • 0 Ads)
 *  Server 2: CineSrc VIP Player (Open Source • 0 Ads)
 *  Server 3: 123Embed Cloud Player (In-Player Switcher • 4K)
 *  Server 4: Global World Mirror (Multi-Language & Dubbed)
 *  Server 5: AutoEmbed Prime VIP (Multi-Language • 4K HDR)
 *  Server 6: AnimeWorld VIP (Hindi/Eng/Jap)
 *  Server 7: MultiEmbed Cloud Stream (Global Mirror)
 *  Server 8: VidLink Pro VIP (Ultra HD 4K • Multi-Audio)
 *  Server 9: AnyEmbed Prime Direct (1080p Direct)
 *  Server 10: Nontongo CC Captions (Multi-Subtitles)
 */

export interface StreamServer {
  id: string;
  name: string;
  badge: string;
  build: (type: "movie" | "tv", id: number, season?: number, episode?: number) => string;
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: "vidly",
    name: "Server 1: Vidly Pro VIP",
    badge: "Aurora Glass • 0 Ads",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://vidly.pro/tv/${id}/${s}/${e}?preview=1&theme=aurora&color=e50914&audioPicker=1&nextEpisode=1`
        : `https://vidly.pro/movie/${id}?preview=1&theme=aurora&color=e50914&audioPicker=1`,
  },
  {
    id: "cinesrc",
    name: "Server 2: CineSrc VIP Player",
    badge: "0 Ads • Open Source",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://cinesrc.st/embed/tv/${id}?s=${s}&e=${e}`
        : `https://cinesrc.st/embed/movie/${id}`,
  },
  {
    id: "embed123",
    name: "Server 3: 123Embed Cloud",
    badge: "4K UHD • In-Player Switcher",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://play2.123embed.net/tv/${id}/${s}/${e}`
        : `https://play2.123embed.net/movie/${id}`,
  },
  {
    id: "global",
    name: "Server 4: Global World Mirror",
    badge: "Multi-Language & Dubbed",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://player.autoembed.co/embed/tv/${id}/${s}/${e}`
        : `https://player.autoembed.co/embed/movie/${id}`,
  },
  {
    id: "autoembed",
    name: "Server 5: AutoEmbed Prime VIP",
    badge: "4K HDR • Multi-Language",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`
        : `https://player.autoembed.cc/embed/movie/${id}`,
  },
  {
    id: "animeworld",
    name: "Server 6: AnimeWorld VIP",
    badge: "Hindi / Eng / Japanese Audio",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://player.autoembed.co/embed/tv/${id}/${s}/${e}`
        : `https://player.autoembed.co/embed/movie/${id}`,
  },
  {
    id: "multiembed",
    name: "Server 7: MultiEmbed Cloud Stream",
    badge: "Global Mirror • Multi-Source",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  },
  {
    id: "vidlink",
    name: "Server 8: VidLink Pro VIP",
    badge: "Ultra HD 4K • Multi-Audio",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&player=default&title=true&poster=true&autoplay=true&nextbutton=true`
        : `https://vidlink.pro/movie/${id}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&player=default&title=true&poster=true&autoplay=true&nextbutton=true`,
  },
  {
    id: "anyembed",
    name: "Server 9: AnyEmbed Prime Direct",
    badge: "1080p Direct Mirror",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://anyembed.xyz/embed/tmdb-tv-${id}-${s}-${e}`
        : `https://anyembed.xyz/embed/tmdb-movie-${id}`,
  },
  {
    id: "nontongo",
    name: "Server 10: Nontongo CC Captions",
    badge: "Multi-Subtitles • High Speed",
    build: (type, id, s = 1, e = 1) =>
      type === "tv"
        ? `https://www.nontongo.win/embed/tv/${id}/${s}/${e}`
        : `https://www.nontongo.win/embed/movie/${id}`,
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

  // Default to Server 1: Vidly Pro VIP
  return STREAM_SERVERS[0].build(o.type, o.id, o.season ?? 1, o.episode ?? 1);
}
