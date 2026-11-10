const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'catalog.js');
const catalog = require(catalogPath);

const cachePath = path.join(__dirname, '..', 'verified_tmdb_cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

// Correct Tabbar TMDB ID is 136460
cache['tt15410104'] = 136460;
cache['sonyliv-25'] = 136460;
cache['sonyliv-2048'] = 136460;
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
console.log('Updated cache with Tabbar -> 136460');

let count = 0;
for (const item of catalog) {
  if ((item.title || '').toLowerCase() === 'tabbar') {
    item.tmdbId = 136460;
    item.imdbId = 'tt15410104';
    item.backdrop = 'https://image.tmdb.org/t/p/w1280/planPZviI1eycuDvfAex8jGUyDF.jpg';
    item.poster = 'https://image.tmdb.org/t/p/w500/otlPrZEtwTlNfyZWisUgZgAiLUR.jpg';
    count++;
  }
}
fs.writeFileSync(catalogPath, 'module.exports = ' + JSON.stringify(catalog, null, 2) + ';\n', 'utf8');
console.log(`Updated ${count} Tabbar items in catalog.js`);

// Sync initial_catalog.js
const featuredOrTop = catalog.filter(x => x.featured || x.rank === 1 || x.trending);
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'initial_catalog.js'),
  'if (typeof window !== "undefined") { window.INITIAL_BOOTSTRAP_CATALOG = ' + JSON.stringify(featuredOrTop) + '; }\n',
  'utf8'
);

// Sync Android assets
const androidAssetCatalog = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'catalog.json');
if (fs.existsSync(androidAssetCatalog)) {
  fs.writeFileSync(androidAssetCatalog, JSON.stringify(catalog), 'utf8');
  console.log('Synced to android assets catalog.json');
}

// Sync tv-engine.js to android
fs.copyFileSync(path.join(__dirname, '..', 'public', 'tv-engine.js'), path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'tv-engine.js'));
console.log('Synced tv-engine.js to android assets');
