const fs = require('fs');

if (fs.existsSync('public/index.classic.html')) {
  const html = fs.readFileSync('public/index.classic.html', 'utf8');
  console.log('Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
  
  // Find brand / logo usages
  const lines = html.split('\n');
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes('logo') || l.toLowerCase().includes('brand') || l.toLowerCase().includes('cinemaverse')) {
      console.log((i+1) + ': ' + l.trim().slice(0, 140));
    }
  });
}
