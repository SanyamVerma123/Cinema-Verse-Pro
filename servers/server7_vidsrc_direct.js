/**
 * Server 7: VidSrc Cloud Direct
 * 1080p Direct & Multi-Audio
 */
module.exports = {
  id: 7,
  clientIndex: 6,
  slug: 'vidsrc-direct',
  name: 'Server 7: VidSrc Cloud Direct (1080p Direct • Multi-Audio)',
  badge: 'Fast 1080p • Multi-Audio',
  shortBadge: '1080p Direct',
  provider: 'VidSrc Cloud',
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
      ? `https://vidsrc.pm/embed/tv?imdb=${imdb || ''}&tmdb=${tmdb || ''}&season=${s}&episode=${e}`
      : `https://vidsrc.pm/embed/movie/${tmdbOrImdb}`;
  }
};
