const fs = require('fs');
const html = fs.readFileSync('public/index.classic.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('id="player') || l.includes('class="player') || l.includes('video-player') || l.includes('streaming-player')) {
    console.log((i+1) + ': ' + l.trim().slice(0, 140));
  }
});
