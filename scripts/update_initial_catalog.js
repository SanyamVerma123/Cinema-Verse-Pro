const fs = require('fs');
const catalog = require('../catalog');

function optimizeCatalogMediaUrl(u) {
  if (!u || typeof u !== 'string') return u;
  if (u.includes('image.tmdb.org/t/p/')) {
    return u.replace(/^https?:\/\/image\.tmdb\.org\/t\/p\//, '/api/tmdb-image/');
  }
  if (u.includes('images.metahub.space/')) {
    return u.replace(/^https?:\/\/images\.metahub\.space\//, '/api/metahub-image/');
  }
  return u;
}

const featuredOrTop = catalog.filter(x => x.featured || x.rank === 1 || x.trending).map(item => ({
  ...item,
  poster: optimizeCatalogMediaUrl(item.poster),
  backdrop: optimizeCatalogMediaUrl(item.backdrop)
}));

fs.writeFileSync('public/initial_catalog.js', 'if (typeof window !== "undefined") { window.INITIAL_BOOTSTRAP_CATALOG = ' + JSON.stringify(featuredOrTop) + '; }\n', 'utf8');
console.log('Saved public/initial_catalog.js with', featuredOrTop.length, 'featured/top items using unblocked proxy URLs.');
