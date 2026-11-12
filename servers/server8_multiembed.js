/**
 * Server 7: VidSrc Cloud VIP
 * High-Speed Multi-Language & Hindi Dubbed Streaming Engine
 * 100% Ad-Free with Multi-Audio, Subtitles & Direct HLS Mirrors
 */
module.exports = {
  id: 7,
  clientIndex: 6,
  slug: 'vidsrc-cloud',
  name: 'Server 7: VidSrc Cloud VIP (Hindi Dubbed • Multi-Audio • ✅ 0 Ads)',
  badge: '✅ 0 Ads • Hindi & Multi-Audio',
  shortBadge: 'Hindi Dubbed',
  provider: 'VidSrc Cloud VIP',
  hasAds: false,
  iframeAttributes: {
    allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
    referrerPolicy: 'no-referrer',
    allowFullScreen: true
  },
  buildUrl: function({ tmdb, imdb, id, isTv, season, episode }) {
    const s = season || 1;
    const e = episode || 1;
    const tmdbOrImdb = tmdb || imdb || id;

    return isTv
      ? `/api/player/vidsrc?type=tv&id=${tmdbOrImdb}&s=${s}&e=${e}`
      : `/api/player/vidsrc?type=movie&id=${tmdbOrImdb}`;
  },
  directUrl: function({ tmdb, imdb, id, isTv, season, episode }) {
    const s = season || 1;
    const e = episode || 1;
    const tmdbOrImdb = tmdb || imdb || id;

    return isTv
      ? `https://vidsrc.su/embed/tv/${tmdbOrImdb}/${s}/${e}`
      : `https://vidsrc.su/embed/movie/${tmdbOrImdb}`;
  }
};
