/**
 * CinemaVerse Modular Streaming Server Registry
 * Loads each streaming server provider independently.
 * An error or modification in one server file NEVER affects any other server.
 */

const fs = require('fs');
const path = require('path');

const SERVER_FILES = [
  { id: 1, file: './server1_vidly' },
  { id: 2, file: './server2_autoembed_global' },
  { id: 3, file: './server3_vidsrc_pro' },
  { id: 4, file: './server4_cinesrc' },
  { id: 5, file: './server5_123embed' },
  { id: 6, file: './server6_autoembed_prime' },
  { id: 7, file: './server7_vidsrc_direct' },
  { id: 8, file: './server8_multiembed' },
  { id: 9, file: './server9_animeworld' },
  { id: 10, file: './server10_2embed' }
];

function loadServers() {
  const loaded = [];
  for (const item of SERVER_FILES) {
    try {
      const serverMod = require(item.file);
      loaded.push(serverMod);
    } catch (err) {
      console.error(`[ServerRegistry] Failed to load server ${item.file}:`, err.message);
    }
  }
  return loaded;
}

const registeredServers = loadServers();

/**
 * Build stream server list for a specific media item
 */
function buildStreamServers(params) {
  const { type, id, tmdb, imdb, season = 1, episode = 1 } = params;
  const isTv = type === 'series' || type === 'tv';
  const s = parseInt(season, 10) || 1;
  const e = parseInt(episode, 10) || 1;
  const tmdbOrImdb = tmdb || imdb || id;

  return registeredServers.map(srv => {
    let url = '';
    try {
      url = srv.buildUrl({
        type,
        id,
        tmdb: tmdb || tmdbOrImdb,
        imdb,
        isTv,
        season: s,
        episode: e
      });
      if (typeof srv.normalizeUrl === 'function') {
        url = srv.normalizeUrl(url, imdb);
      }
    } catch (err) {
      console.error(`[ServerRegistry] Error building URL for ${srv.name}:`, err.message);
    }

    return {
      id: srv.id,
      name: srv.name,
      badge: srv.badge,
      url,
      iframeAttributes: srv.iframeAttributes || {}
    };
  });
}

/**
 * Get client-side metadata definitions for STREAMING_SERVERS array
 */
function getClientDefinitions() {
  return registeredServers.map((srv, idx) => ({
    id: idx,
    serverId: srv.id,
    name: srv.name,
    badge: srv.badge,
    shortBadge: srv.shortBadge,
    provider: srv.provider,
    hasAds: srv.hasAds,
    iframeAttributes: srv.iframeAttributes || {}
  }));
}

module.exports = {
  registeredServers,
  loadServers,
  buildStreamServers,
  getClientDefinitions
};
