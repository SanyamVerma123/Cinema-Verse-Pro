/**
 * Server 3: VidLink Pro VIP
 * Ultra HD 4K Multi-Audio Player with Subtitles & Zero Ads
 */
module.exports = {
  id: 8,
  clientIndex: 7,
  slug: 'vidlink-pro',
  name: 'Server 8: VidLink Pro VIP (Ultra HD 4K • Multi-Audio)',
  badge: 'Ultra HD 4K • Multi-Audio',
  shortBadge: '4K Multi-Audio',
  provider: 'VidLink Pro',
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
      ? `https://vidlink.pro/tv/${tmdb || tmdbOrImdb}/${s}/${e}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true`
      : `https://vidlink.pro/movie/${tmdb || tmdbOrImdb}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true`;
  }
};
