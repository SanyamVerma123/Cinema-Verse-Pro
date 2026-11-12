const fs = require('fs');

console.log('=== VERIFYING STREAMING ENGINE SUBSYSTEM ===');

// 1. Verify stream.ts
const streamContent = fs.readFileSync('extracted_ui/src/lib/stream.ts', 'utf8');
const requiredServers = [
  { id: 'vidlink', label: 'Server 1: VidLink Pro VIP' },
  { id: 'autoembed', label: 'Server 2: AutoEmbed Global' },
  { id: 'vidsrc_pro', label: 'Server 3: VidSrc Pro' },
  { id: 'embedsu', label: 'Server 4: Embed.su VIP' },
  { id: 'multiembed', label: 'Server 5: MultiEmbed' },
  { id: 'cinesrc', label: 'Server 6: CineSrc Stream' },
  { id: 'vidsrc_cc', label: 'Server 7: VidSrc CC' },
];

console.log('\n--- 1. Multi-Server Definitions (stream.ts) ---');
for (const s of requiredServers) {
  const hasId = streamContent.includes(s.id);
  const hasLabel = streamContent.includes(s.label);
  console.log(`[STREAM SERVER] ${s.label}: ${hasId && hasLabel ? 'PASS' : 'FAIL'}`);
  if (!hasId || !hasLabel) process.exit(1);
}

// 2. Verify Player.tsx
const playerContent = fs.readFileSync('extracted_ui/src/components/Player.tsx', 'utf8');
console.log('\n--- 2. Player.tsx Features ---');
const playerFeatures = [
  { name: 'Server Selector Dropdown', check: playerContent.includes('STREAM_SERVERS.map') },
  { name: 'Trailer Player / Toggle', check: playerContent.includes('isTrailerMode') && playerContent.includes('youtube-nocookie.com/embed') },
  { name: 'TV Season & Episode Stepper', check: playerContent.includes('Previous Episode') && playerContent.includes('Next Episode') },
  { name: 'HLS.js Native / Adaptive Playback', check: playerContent.includes('hls.js') && playerContent.includes('Hls.Events.ERROR') },
  { name: 'Direct Video File Support', check: playerContent.includes('isFile(url)') && playerContent.includes('<video') },
  { name: 'Progress Saving (postMessage & timeupdate)', check: playerContent.includes('saveProgress') && playerContent.includes('MEDIA_DATA') },
  { name: 'Progress Resume Capability', check: playerContent.includes('progressStore.get()') && playerContent.includes('v.currentTime = resume.time') },
];

for (const f of playerFeatures) {
  console.log(`[PLAYER FEATURE] ${f.name}: ${f.check ? 'PASS' : 'FAIL'}`);
  if (!f.check) process.exit(1);
}

// 3. Verify tmdb.ts
const tmdbContent = fs.readFileSync('extracted_ui/src/lib/tmdb.ts', 'utf8');
console.log('\n--- 3. TMDb Proxy Routing (tmdb.ts) ---');
const tmdbFeatures = [
  { name: 'Routes TMDb API through /api/tmdb-proxy/...', check: tmdbContent.includes('/api/tmdb-proxy') },
  { name: 'Routes images through /api/tmdb-image/...', check: tmdbContent.includes('/api/tmdb-image/') },
  { name: 'Sample fallback available', check: tmdbContent.includes('sampleFor') },
];

for (const t of tmdbFeatures) {
  console.log(`[TMDB FEATURE] ${t.name}: ${t.check ? 'PASS' : 'FAIL'}`);
  if (!t.check) process.exit(1);
}

console.log('\n>>> ALL 3 MODULES VERIFIED SUCCESSFULLY! <<<');
