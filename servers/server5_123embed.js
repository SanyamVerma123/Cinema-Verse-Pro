/**
 * Server 5: 123Embed Cloud Player
 * In-Player Switcher & 4K Mirror
 */
module.exports = {
  id: 3,
  clientIndex: 2,
  slug: '123embed',
  name: 'Server 3: 123Embed Cloud Player (In-Player Switcher • 4K)',
  badge: 'In-Player Switcher • 4K',
  shortBadge: 'Provider player',
  provider: '123Embed Cloud',
  hasAds: null,
  iframeAttributes: {
    allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
    referrerPolicy: 'no-referrer',
    allowFullScreen: true,
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation'
  },
  buildUrl: function({ tmdb, imdb, id, isTv, season, episode }) {
    const s = season || 1;
    const e = episode || 1;
    const tmdbOrImdb = tmdb || imdb || id;

    return isTv
      ? `https://play2.123embed.net/tv/${tmdbOrImdb}/${s}/${e}`
      : `https://play2.123embed.net/movie/${tmdbOrImdb}`;
  }
};
