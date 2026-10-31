const fs = require('fs');
const path = require('path');

async function run() {
  const catalogPath = path.join(__dirname, '..', 'catalog.js');
  const catalog = require(catalogPath);

  console.log(`Analyzing ${catalog.length} items for TMDB collisions, bogus IDs, and bad IMDb references...`);

  // 1. Group items by tmdbId
  const tmdbMap = new Map();
  catalog.forEach(item => {
    if (item.tmdbId) {
      if (!tmdbMap.has(item.tmdbId)) tmdbMap.set(item.tmdbId, []);
      tmdbMap.get(item.tmdbId).push(item);
    }
  });

  const suspiciousItems = new Set();

  for (const [tmdb, items] of tmdbMap.entries()) {
    const titles = [...new Set(items.map(x => (x.title || '').toLowerCase().replace(/\s*\(multi-audio\)|\s*\(classic\)|\s*\(vip\)|\s*\(jio premier\)|\s*\(jio special\)|\s*\(jio\)/gi, '').trim()))];
    const isBogus = Number(tmdb) > 2000000;
    if (titles.length > 1 || isBogus) {
      items.forEach(it => suspiciousItems.add(it));
    }
  }

  // Also include items with synthetic or mismatched imdb/tmdb
  catalog.forEach(item => {
    if (Number(item.tmdbId) > 2000000) suspiciousItems.add(item);
  });

  console.log(`Identified ${suspiciousItems.size} suspicious or collided items. Resolving via Cinemeta open API...`);

  let fixedCount = 0;
  let notFoundCount = 0;

  for (const item of suspiciousItems) {
    const cleanTitle = (item.title || '')
      .replace(/\s*\(Multi-Audio\)|\s*\(Classic\)|\s*\(VIP\)|\s*\(Jio Premier\)|\s*\(Jio Special\)|\s*\(Jio\)/gi, '')
      .trim();
    const isTv = item.type === 'series' || item.type === 'tv';
    const type = isTv ? 'series' : 'movie';

    let resolvedTmdb = null;
    let resolvedImdb = null;

    // A. If IMDb ID exists, check Cinemeta meta endpoint
    if (item.imdbId && item.imdbId.startsWith('tt')) {
      try {
        const metaRes = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${item.imdbId}.json`, { signal: AbortSignal.timeout(4000) });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const meta = metaData.meta;
          if (meta) {
            // Check if meta name roughly matches item title
            const mName = (meta.name || '').toLowerCase();
            const itTitle = cleanTitle.toLowerCase();
            if (mName.includes(itTitle.slice(0, 5)) || itTitle.includes(mName.slice(0, 5))) {
              resolvedTmdb = meta.moviedb_id || meta.tmdb_id;
              resolvedImdb = meta.imdb_id || meta.id;
            }
          }
        }
      } catch (e) {}
    }

    // B. If not resolved or mismatched, search Cinemeta catalog by cleanTitle
    if (!resolvedTmdb) {
      try {
        const searchQ = encodeURIComponent(cleanTitle.toLowerCase());
        const searchRes = await fetch(`https://v3-cinemeta.strem.io/catalog/${type}/top/search=${searchQ}.json`, { signal: AbortSignal.timeout(4000) });
        if (searchRes.ok) {
          const sData = await searchRes.json();
          const matches = sData.metas || [];
          const bestMatch = matches.find(m => (m.name || '').toLowerCase() === cleanTitle.toLowerCase()) || matches[0];
          if (bestMatch) {
            resolvedImdb = bestMatch.imdb_id || bestMatch.id;
            if (bestMatch.moviedb_id || bestMatch.tmdb_id) {
              resolvedTmdb = bestMatch.moviedb_id || bestMatch.tmdb_id;
            } else if (resolvedImdb) {
              // lookup meta for tmdb
              try {
                const m2 = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${resolvedImdb}.json`, { signal: AbortSignal.timeout(3000) });
                if (m2.ok) {
                  const m2d = await m2.json();
                  resolvedTmdb = m2d.meta?.moviedb_id || m2d.meta?.tmdb_id;
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }

    if (resolvedTmdb) {
      const oldTmdb = item.tmdbId;
      item.tmdbId = Number(resolvedTmdb) || resolvedTmdb;
      if (resolvedImdb) item.imdbId = resolvedImdb;
      console.log(`  [FIXED] "${item.title}" [${item.id}] TMDB: ${oldTmdb} => ${item.tmdbId} (IMDb: ${item.imdbId})`);
      fixedCount++;
    } else {
      console.log(`  [SKIP/MANUAL] "${item.title}" [${item.id}] current TMDB: ${item.tmdbId}`);
      notFoundCount++;
    }

    // Rate-limit to avoid hammering
    await new Promise(r => setTimeout(r, 60));
  }

  console.log(`\nResolution Summary: ${fixedCount} fixed, ${notFoundCount} skipped.`);

  if (fixedCount > 0) {
    fs.writeFileSync(catalogPath, 'module.exports = ' + JSON.stringify(catalog, null, 2) + ';\n', 'utf-8');
    console.log(`Successfully updated ${catalogPath} with verified TMDB & IMDb identifiers!`);
  }
}

run().catch(console.error);
