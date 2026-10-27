/**
 * Server 8: MultiEmbed Cloud Stream
 * Global Cloud Mirror
 */
module.exports = {
  id: 8,
  clientIndex: 7,
  slug: 'multiembed',
  name: 'Server 8: MultiEmbed Cloud Stream (Global Mirror)',
  badge: 'External player • ads vary',
  shortBadge: 'Cloud Mirror',
  provider: 'MultiEmbed Cloud',
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
      ? `https://multiembed.mov/?video_id=${tmdbOrImdb}&tmdb=1&s=${s}&e=${e}`
      : `https://multiembed.mov/?video_id=${tmdbOrImdb}&tmdb=1`;
  }
};
