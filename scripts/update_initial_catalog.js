const fs = require('fs');
const catalog = require('../catalog');
const featuredOrTop = catalog.filter(x => x.featured || x.rank === 1 || x.trending);
fs.writeFileSync('public/initial_catalog.js', 'if (typeof window !== "undefined") { window.INITIAL_BOOTSTRAP_CATALOG = ' + JSON.stringify(featuredOrTop) + '; }\n', 'utf8');
console.log('Saved public/initial_catalog.js with', featuredOrTop.length, 'featured/top items.');
