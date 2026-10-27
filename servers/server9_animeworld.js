/**
 * Server 9: AnimeWorld VIP
 * Dedicated Hindi / English / Japanese Anime & Cartoon Multi-Audio Player
 */
module.exports = {
  id: 9,
  clientIndex: 8,
  slug: 'animeworld',
  name: 'Server 9: AnimeWorld VIP (Hindi/Eng/Jap)',
  badge: 'Hindi / English / Japanese • ads vary',
  shortBadge: 'Provider player',
  provider: 'AnimeWorld',
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
      ? `https://player.autoembed.co/embed/tv/${tmdbOrImdb}/${s}/${e}`
      : `https://player.autoembed.co/embed/movie/${tmdbOrImdb}`;
  }
};
