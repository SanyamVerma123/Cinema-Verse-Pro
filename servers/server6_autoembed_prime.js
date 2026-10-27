/**
 * Server 6: AutoEmbed Prime VIP
 * Multi-Language & 4K HDR Player
 */
module.exports = {
  id: 6,
  clientIndex: 5,
  slug: 'autoembed-prime',
  name: 'Server 6: AutoEmbed Prime VIP (Multi-Language • 4K HDR)',
  badge: 'Multi-Language 4K',
  shortBadge: 'Provider player',
  provider: 'AutoEmbed Prime',
  hasAds: null,
  iframeAttributes: {
    allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
    referrerPolicy: 'origin'
  },
  buildUrl: function({ tmdb, imdb, id, isTv, season, episode }) {
    const s = season || 1;
    const e = episode || 1;
    const tmdbOrImdb = tmdb || imdb || id;

    return isTv
      ? `https://autoembed.co/tv/tmdb/${tmdbOrImdb}-${s}-${e}`
      : `https://autoembed.co/movie/tmdb/${tmdbOrImdb}`;
  }
};
