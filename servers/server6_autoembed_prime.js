/**
 * Server 6: AutoEmbed Prime VIP
 * Multi-Language & 4K HDR Player
 */
module.exports = {
  id: 5,
  clientIndex: 4,
  slug: 'autoembed-prime',
  name: 'Server 5: AutoEmbed Prime VIP (Multi-Language • 4K HDR)',
  badge: 'Multi-Language 4K',
  shortBadge: 'Provider player',
  provider: 'AutoEmbed Prime',
  hasAds: null,
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
      ? `https://player.autoembed.co/embed/tv/${tmdbOrImdb}/${s}/${e}${imdb ? `?imdb=${imdb}` : ''}`
      : `https://player.autoembed.co/embed/movie/${tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
  }
};
