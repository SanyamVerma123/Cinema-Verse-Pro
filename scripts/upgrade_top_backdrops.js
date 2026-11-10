/**
 * Upgrade top catalog backdrops to official high-res TMDB image URLs
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
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const catalogPath = path.join(__dirname, '..', 'catalog.js');
  const catalog = require(catalogPath);

  // Filter top titles: featured, rank 1, or rating >= 8.5
  const topList = catalog.filter(x => x.featured || x.rank === 1 || (x.rating && x.rating >= 8.5) || (x.title && x.title.includes('Money Heist')));
  console.log(`Checking ${topList.length} top titles for official TMDB backdrops...`);

  let count = 0;
  for (const item of topList) {
    if (!item.tmdbId) continue;
    // If already has official image.tmdb.org backdrop, skip
    if (item.backdrop && item.backdrop.includes('image.tmdb.org')) continue;

    const type = (item.type === 'series' || item.type === 'tv') ? 'tv' : 'movie';
    const res = await fetchJson(`${BASE_URL}/${type}/${item.tmdbId}?api_key=${API_KEY}`);
    await delay(35);

    if (res) {
      let changed = false;
      if (res.backdrop_path) {
        item.backdrop = `https://image.tmdb.org/t/p/w1280${res.backdrop_path}`;
        changed = true;
      }
      if (res.poster_path) {
        item.poster = `https://image.tmdb.org/t/p/w500${res.poster_path}`;
        changed = true;
      }
      if (changed) {
        count++;
        console.log(`[${count}] Upgraded ${item.title} -> backdrop: ${item.backdrop}`);
      }
    }
  }

  console.log(`Finished upgrading ${count} top items.`);
  fs.writeFileSync(catalogPath, 'module.exports = ' + JSON.stringify(catalog, null, 2) + ';\n', 'utf8');

  // Also update initial_catalog.js
  const featuredOrTop = catalog.filter(x => x.featured || x.rank === 1 || x.trending);
  fs.writeFileSync(
    path.join(__dirname, '..', 'public', 'initial_catalog.js'),
    'if (typeof window !== "undefined") { window.INITIAL_BOOTSTRAP_CATALOG = ' + JSON.stringify(featuredOrTop) + '; }\n',
    'utf8'
  );

  // Sync to Android assets
  const androidAssetCatalog = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'catalog.json');
  if (fs.existsSync(path.dirname(androidAssetCatalog))) {
    fs.writeFileSync(androidAssetCatalog, JSON.stringify(catalog), 'utf8');
  }
}

run().catch(console.error);
