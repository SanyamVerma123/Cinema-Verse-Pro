/**
 * Server 7: AnyEmbed Prime Direct
 * 1080p/4K Direct Stream with Zero Redirects & Zero Ads
 */
module.exports = {
  id: 7,
  clientIndex: 6,
  slug: 'anyembed-direct',
  name: 'Server 7: AnyEmbed Prime Direct (1080p Direct • ✅ 0 Ads)',
  badge: '✅ 0 Ads • 1080p Direct',
  shortBadge: '✅ 0 Ads',
  provider: 'AnyEmbed Prime',
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
      ? `https://anyembed.xyz/embed/tmdb-tv-${tmdb || tmdbOrImdb}-${s}-${e}`
      : `https://anyembed.xyz/embed/tmdb-movie-${tmdb || tmdbOrImdb}`;
  }
};
