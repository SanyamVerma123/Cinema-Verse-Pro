/**
 * Server 1: Vidly Pro VIP
 * High-speed, Multi-Audio, 4K Glassmorphism Aurora Player with 3 Internal Mirrors & 0 Ads
 * Configured identically to the official Vidly.pro Live Demo preview player
 */
module.exports = {
  id: 1,
  clientIndex: 0,
  slug: 'vidly',
  name: 'Server 1: Vidly Pro VIP (Glassmorphism Aurora • Multi-Audio & 3 Servers • ✅ 0 Ads)',
  badge: '✅ 0 Ads • Multi-Audio 4K',
  shortBadge: '✅ 0 Ads',
  provider: 'Vidly Pro',
  hasAds: false,
  iframeAttributes: {
    allow: 'autoplay; encrypted-media; picture-in-picture',
    referrerPolicy: 'no-referrer',
    allowFullScreen: true
  },
  buildUrl: function({ tmdb, imdb, id, isTv, season, episode }) {
    const s = season || 1;
    const e = episode || 1;
    const tmdbOrImdb = tmdb || imdb || id;
    
    // Configured with ?preview=1 matching the official vidly.pro demo player
    return isTv
      ? `https://vidly.pro/tv/${tmdb || tmdbOrImdb}/${s}/${e}?preview=1&theme=aurora&color=e50914&audioPicker=1&nextEpisode=1`
      : `https://vidly.pro/movie/${tmdb || tmdbOrImdb}?preview=1&theme=aurora&color=e50914&audioPicker=1`;
  }
};
