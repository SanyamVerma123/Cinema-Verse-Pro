/**
 * Server 2: Global World Mirror
 * Multi-Language and Dubbed Player
 */
module.exports = {
  id: 2,
  clientIndex: 1,
  slug: 'autoembed-global',
  name: 'Server 2: Global World Mirror (Multi-Language & Dubbed)',
  badge: 'External player • ads vary',
  shortBadge: 'Provider player',
  provider: 'Global World Mirror',
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
      ? `https://player.autoembed.co/embed/tv/${imdb || tmdbOrImdb}/${s}/${e}${imdb ? `?imdb=${imdb}` : ''}`
      : `https://player.autoembed.co/embed/movie/${imdb || tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
  },
  normalizeUrl: function(url, imdbId) {
    if (url && url.includes('//autoembed.co/') && !url.includes('player.autoembed.co')) {
      url = url.replace('//autoembed.co/movie/tmdb/', '//player.autoembed.co/embed/movie/')
               .replace('//autoembed.co/tv/tmdb/', '//player.autoembed.co/embed/tv/')
               .replace('//autoembed.co/movie/imdb/', '//player.autoembed.co/embed/movie/')
               .replace(/-/g, '/');
    }
    if (url && url.includes('player.autoembed.co') && imdbId && !url.includes('imdb=')) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}imdb=${encodeURIComponent(imdbId)}`;
    }
    return url;
  }
};
