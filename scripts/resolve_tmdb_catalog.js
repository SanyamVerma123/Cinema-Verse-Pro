/**
 * TMDB Catalog Resolver & Image Enhancer
 * Uses official TMDB API to verify canonical TMDB IDs and fetch high-res backdrops/posters.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'fe30ba97956d6c5afafc72b84941712d';
const BASE_URL = 'https://api.tmdb.org/3';

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isBogus(tmdbId, imdbId) {
  if (!tmdbId) return true;
  const num = Number(tmdbId);
  if (isNaN(num) || num <= 0 || num > 2000000) return true;
  if (imdbId && typeof imdbId === 'string' && imdbId.startsWith('tt')) {
    const imdbNum = imdbId.replace(/\D/g, '');
    const tmdbStr = String(tmdbId);
    if (imdbNum.startsWith(tmdbStr) && imdbNum.length > tmdbStr.length) return true;
  }
  return false;
}

// Known manual overrides for titles that had wrong IMDb IDs in old dumps
const KNOWN_OVERRIDES = {
  'scam 1992: the harshad mehta story': { tmdbId: 111188, imdbId: 'tt12392504', type: 'series' },
  'scam 1992': { tmdbId: 111188, imdbId: 'tt12392504', type: 'series' },
  'harshad mehta': { tmdbId: 111188, imdbId: 'tt12392504', type: 'series' },
  'scam 2003: the telgi story': { tmdbId: 233777, imdbId: 'tt26900224', type: 'series' },
  'scam 2003': { tmdbId: 233777, imdbId: 'tt26900224', type: 'series' },
  'aadujeevitham: the goat life': { tmdbId: 472221, imdbId: 'tt8369324', type: 'movie' },
  'the goat life': { tmdbId: 472221, imdbId: 'tt8369324', type: 'movie' },
  'turbo': { tmdbId: 1195394, imdbId: 'tt29584485', type: 'movie', year: 2024 },
  'manjummel boys': { tmdbId: 1069945, imdbId: 'tt26425980', type: 'movie' },
  'chithha': { tmdbId: 1115253, imdbId: 'tt27534438', type: 'movie' },
  'stree 2': { tmdbId: 1079091, imdbId: 'tt27510174', type: 'movie' }
};

async function main() {
  console.log('[TMDB Resolver] Loading catalog...');
  const catalogPath = path.join(__dirname, '..', 'catalog.js');
  const catalog = require(catalogPath);

  const cachePath = path.join(__dirname, '..', 'verified_tmdb_cache.json');
  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch(e) {}
  }

  console.log(`[TMDB Resolver] Loaded catalog with ${catalog.length} items. Pre-cached IDs: ${Object.keys(cache).length}`);

  let updatedCount = 0;

  for (let i = 0; i < catalog.length; i++) {
    const item = catalog[i];
    const cleanTitle = (item.title || '')
      .replace(/\s*\(Multi-Audio\)\s*/i, '')
      .replace(/\s*\(VIP\)\s*/i, '')
      .replace(/\s*\(Jio Special\)\s*/i, '')
      .replace(/\s*\(Jio Premier\)\s*/i, '')
      .replace(/\s*\(Jio\)\s*/i, '')
      .replace(/\s*\(Classic\)\s*/i, '')
      .trim()
      .toLowerCase();

    // Check manual override first
    if (KNOWN_OVERRIDES[cleanTitle]) {
      const o = KNOWN_OVERRIDES[cleanTitle];
      item.tmdbId = o.tmdbId;
      if (o.imdbId) item.imdbId = o.imdbId;
      cache[item.imdbId || item.id] = o.tmdbId;
      updatedCount++;
    }

    const needsResolution = isBogus(item.tmdbId, item.imdbId) || (cleanTitle.includes('scam 1992') && item.tmdbId !== 111188);

    if (needsResolution) {
      let resolved = null;

      // 1. Try Find by IMDb ID
      if (item.imdbId && item.imdbId.startsWith('tt')) {
        const findUrl = `${BASE_URL}/find/${item.imdbId}?external_source=imdb_id&api_key=${API_KEY}`;
        const findRes = await fetchJson(findUrl);
        await delay(35);

        if (findRes) {
          const res = (item.type === 'series' || item.type === 'tv')
            ? (findRes.tv_results?.[0] || findRes.movie_results?.[0])
            : (findRes.movie_results?.[0] || findRes.tv_results?.[0]);

          if (res && res.id) {
            resolved = {
              tmdbId: res.id,
              backdrop: res.backdrop_path ? `https://image.tmdb.org/t/p/w1280${res.backdrop_path}` : null,
              poster: res.poster_path ? `https://image.tmdb.org/t/p/w500${res.poster_path}` : null,
              title: res.name || res.title
            };
          }
        }
      }

      // 2. Try Search by Title if Find yielded nothing or had no IMDb ID
      if (!resolved) {
        const query = encodeURIComponent(cleanTitle);
        const searchType = (item.type === 'series' || item.type === 'tv') ? 'tv' : 'movie';
        const yearParam = item.year ? `&year=${item.year}` : '';
        const searchUrl = `${BASE_URL}/search/${searchType}?query=${query}${yearParam}&api_key=${API_KEY}`;
        const searchRes = await fetchJson(searchUrl);
        await delay(35);

        if (searchRes && searchRes.results && searchRes.results.length > 0) {
          const res = searchRes.results[0];
          resolved = {
            tmdbId: res.id,
            backdrop: res.backdrop_path ? `https://image.tmdb.org/t/p/w1280${res.backdrop_path}` : null,
            poster: res.poster_path ? `https://image.tmdb.org/t/p/w500${res.poster_path}` : null,
            title: res.name || res.title
          };
        }
      }

      if (resolved) {
        const oldTmdb = item.tmdbId;
        item.tmdbId = resolved.tmdbId;
        if (resolved.backdrop) item.backdrop = resolved.backdrop;
        if (resolved.poster) item.poster = resolved.poster;
        if (item.imdbId) cache[item.imdbId] = resolved.tmdbId;
        cache[item.id] = resolved.tmdbId;
        updatedCount++;
        console.log(`[Resolved ${updatedCount}] ${item.title} (${item.platform}): ${oldTmdb} -> ${resolved.tmdbId}`);
      }
    }

    // Enhance official TMDB backdrops for Sony LIV, Zee5, JioCinema items if missing or Metahub
    if (['sonyliv', 'zee5', 'jiocinema'].includes(item.platformId) && item.tmdbId && (!item.backdrop || item.backdrop.includes('metahub'))) {
      const type = (item.type === 'series' || item.type === 'tv') ? 'tv' : 'movie';
      const detailUrl = `${BASE_URL}/${type}/${item.tmdbId}?api_key=${API_KEY}`;
      const detailRes = await fetchJson(detailUrl);
      await delay(30);
      if (detailRes) {
        if (detailRes.backdrop_path) {
          item.backdrop = `https://image.tmdb.org/t/p/w1280${detailRes.backdrop_path}`;
        }
        if (detailRes.poster_path) {
          item.poster = `https://image.tmdb.org/t/p/w500${detailRes.poster_path}`;
        }
      }
    }
  }

  console.log(`[TMDB Resolver] Finished processing! Updated ${updatedCount} items.`);

  // Save updated cache
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`[TMDB Resolver] Saved verified cache to ${cachePath}`);

  // Save updated catalog.js
  const catalogContent = 'module.exports = ' + JSON.stringify(catalog, null, 2) + ';\n';
  fs.writeFileSync(catalogPath, catalogContent, 'utf8');
  console.log(`[TMDB Resolver] Saved updated catalog.js`);

  // Save updated initial_catalog.js (first 40 items)
  const initialItems = catalog.slice(0, 40);
  const initialContent = 'if (typeof window !== "undefined") { window.INITIAL_BOOTSTRAP_CATALOG = ' + JSON.stringify(initialItems) + '; }\n';
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'initial_catalog.js'), initialContent, 'utf8');
  console.log(`[TMDB Resolver] Saved updated public/initial_catalog.js`);

  // Save updated Android assets catalog.json
  const androidAssetCatalog = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'catalog.json');
  if (fs.existsSync(path.dirname(androidAssetCatalog))) {
    fs.writeFileSync(androidAssetCatalog, JSON.stringify(catalog), 'utf8');
    console.log(`[TMDB Resolver] Synced updated catalog to Android assets catalog.json`);
  }
}

main().catch(err => {
  console.error('[TMDB Resolver Error]', err);
});
