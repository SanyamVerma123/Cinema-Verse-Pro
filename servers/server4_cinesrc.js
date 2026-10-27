/**
 * Server 4: CineSrc VIP Player
 * Open Source Clean Stream
 */
module.exports = {
  id: 4,
  clientIndex: 3,
  slug: 'cinesrc',
  name: 'Server 4: CineSrc VIP Player (Open Source • ✅ 0 Ads)',
  badge: '✅ 0 Ads • Open Source',
  shortBadge: '✅ 0 Ads',
  provider: 'CineSrc VIP',
  hasAds: false,
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
      ? `https://cinesrc.st/embed/tv/${tmdbOrImdb}?s=${s}&e=${e}`
      : `https://cinesrc.st/embed/movie/${tmdbOrImdb}`;
  }
};
