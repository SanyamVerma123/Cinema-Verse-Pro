const fs = require('fs');
const js = fs.readFileSync('public/app.js', 'utf8');

const lazyImgs = (js.match(/loading=["']lazy["']/g) || []).length;
const asyncImgs = (js.match(/decoding=["']async["']/g) || []).length;
const imgTags = (js.match(/<img\b/g) || []).length;

console.log('Image optimization audit in app.js:');
console.log('  Total <img tags generated:', imgTags);
console.log('  With loading="lazy":', lazyImgs);
console.log('  With decoding="async":', asyncImgs);

// Check scroll event listeners
const scrollListeners = (js.match(/addEventListener\(['"]scroll['"]/g) || []).length;
console.log('  Scroll event listeners:', scrollListeners);

// Check requestAnimationFrame usage
const rAF = (js.match(/requestAnimationFrame/g) || []).length;
console.log('  requestAnimationFrame usages:', rAF);
