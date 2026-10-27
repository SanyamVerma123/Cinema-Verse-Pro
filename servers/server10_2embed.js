/**
 * Server 10: 2Embed CC Captions
 * Multi-Language Closed Captions & Subtitles Player
 */
module.exports = {
  id: 10,
  clientIndex: 9,
  slug: '2embed',
  name: 'Server 10: 2Embed CC Captions',
  badge: 'External player • ads vary',
  shortBadge: 'Provider player',
  provider: '2Embed CC',
  hasAds: null,
  iframeAttributes: {
    allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
    referrerPolicy: 'no-referrer',
    allowFullScreen: true
  },
  buildUrl: function({ tmdb, imdb, id, isTv, season, episode }) {
    const s = season || 1;
    const e = episode || 1;
    const imdbOrTmdb = imdb || tmdb || id;

    return isTv
      ? `https://www.2embed.cc/embedtv/${imdbOrTmdb}&s=${s}&e=${e}`
      : `https://www.2embed.cc/embed/${imdbOrTmdb}`;
  }
};
