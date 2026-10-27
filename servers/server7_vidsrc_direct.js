/**
 * Server 7: VidFast Cloud Direct
 * 1080p/4K Direct Stream with Zero Ads
 */
module.exports = {
  id: 7,
  clientIndex: 6,
  slug: 'vidfast-direct',
  name: 'Server 7: VidFast Cloud Direct (1080p Direct • ✅ 0 Ads)',
  badge: '✅ 0 Ads • 1080p Direct',
  shortBadge: '✅ 0 Ads',
  provider: 'VidFast Cloud',
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
      ? `https://vidfast.vc/tv/${tmdb || tmdbOrImdb}/${s}/${e}?autoPlay=true`
      : `https://vidfast.vc/movie/${tmdb || tmdbOrImdb}?autoPlay=true`;
  }
};
