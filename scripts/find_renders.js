const fs = require('fs');
const js = fs.readFileSync('public/app.js', 'utf8');

const matches = [];
const lines = js.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('function render') || line.includes('function setup') || line.includes('function filter')) {
    matches.push({ line: idx + 1, text: line.trim() });
  }
});

console.log('Rendering / Setup functions found:', matches.length);
matches.forEach(m => console.log(`${m.line}: ${m.text}`));
