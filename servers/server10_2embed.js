/**
 * Server 10: Nontongo CC Captions
 * Multi-Language Closed Captions & Subtitles Player with Zero Ads
 */
module.exports = {
  id: 10,
  clientIndex: 9,
  slug: 'nontongo-cc',
  name: 'Server 10: Nontongo CC Captions (Multi-Subtitles)',
  badge: 'Multi-Subtitles • Asian Dramas',
  shortBadge: 'Subtitles Cloud',
  provider: 'Nontongo Cloud',
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
      ? `https://www.nontongo.win/embed/tv/${tmdb || tmdbOrImdb}/${s}/${e}`
      : `https://www.nontongo.win/embed/movie/${tmdb || tmdbOrImdb}`;
  }
};
