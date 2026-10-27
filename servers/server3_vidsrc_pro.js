/**
 * Server 3: VidSrc Pro VIP
 * Ultra HD 4K Multi-Server & Audio
 */
module.exports = {
  id: 3,
  clientIndex: 2,
  slug: 'vidsrc-pro',
  name: 'Server 3: VidSrc Pro VIP (Ultra HD 4K • Multi-Server & Audio)',
  badge: 'Fast 4K • Multi-Audio',
  shortBadge: '4K Multi-Audio',
  provider: 'VidSrc Pro',
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
      ? `https://vidsrc2.ru/embed/tv?imdb=${imdb || ''}&tmdb=${tmdb || ''}&season=${s}&episode=${e}`
      : `https://vidsrc2.ru/embed/movie/${tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
  }
};
