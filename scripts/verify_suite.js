const http = require('http');
const fs = require('fs');

async function testAll() {
  console.log('=== CinemaVerse Pro Swarm End-to-End Verification ===\n');

  // Test 1: Public upward view
  console.log('--- Test 1: Public Upward View (GET /) ---');
  const pubRes = await fetch('http://localhost:3000/');
  const pubText = await pubRes.text();
  console.log('Status:', pubRes.status);
  console.log('Title:', (pubText.match(/<title[^>]*>(.*?)<\/title>/i) || [])[1]);
  console.log('Has CinePulse / Alexandria cover:', pubText.includes('CinePulse'));
  if (pubRes.status !== 200) throw new Error('Public view did not return 200');

  // Test 2: Unauthenticated /vault
  console.log('\n--- Test 2: Unauthenticated /vault Stealth Gate ---');
  const unauthRes = await fetch('http://localhost:3000/vault');
  console.log('Status:', unauthRes.status);
  if (unauthRes.status !== 404) console.warn('Expected 404 stealth, got:', unauthRes.status);

  // Test 3: Authentication endpoint
  console.log('\n--- Test 3: Authentication (POST /api/vault/verify) ---');
  const authRes = await fetch('http://localhost:3000/api/vault/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'cinema2026' })
  });
  console.log('Status:', authRes.status);
  const authData = await authRes.json();
  console.log('Response body:', authData);
  const cookieHeader = authRes.headers.get('set-cookie');
  console.log('Set-Cookie:', cookieHeader);
  if (!authData.success || !cookieHeader) throw new Error('Authentication failed');

  // Test 4: Authenticated /vault via Session Cookie & Query Param
  console.log('\n--- Test 4: Authenticated GET /vault ---');
  const cookieMatch = cookieHeader.match(/__session_vault=([^;]+)/);
  const cookieVal = cookieMatch ? cookieMatch[0] : '';
  const vaultCookieRes = await fetch('http://localhost:3000/vault', {
    headers: { 'Cookie': cookieVal }
  });
  console.log('GET /vault (via Cookie) Status:', vaultCookieRes.status);
  const vaultHtml = await vaultCookieRes.text();
  console.log('HTML Length:', vaultHtml.length);
  const vaultTitle = (vaultHtml.match(/<title[^>]*>(.*?)<\/title>/i) || [])[1];
  console.log('Vault HTML Title:', vaultTitle);

  const vaultParamRes = await fetch('http://localhost:3000/vault?vault_key=cinema2026');
  console.log('GET /vault?vault_key=cinema2026 Status:', vaultParamRes.status);

  // Extract assets referenced in vault HTML
  const jsMatch = vaultHtml.match(/src="(\/assets\/[^"]+\.js)"/);
  const cssMatch = vaultHtml.match(/href="(\/assets\/[^"]+\.css)"/);
  console.log('Referenced JS bundle:', jsMatch ? jsMatch[1] : null);
  console.log('Referenced CSS bundle:', cssMatch ? cssMatch[1] : null);

  // Test 5: Static assets and TMDb proxy
  console.log('\n--- Test 5: Assets and TMDb Proxy ---');
  const assetsToTest = [
    jsMatch ? jsMatch[1] : '/assets/index-Da9sOgcK.js',
    cssMatch ? cssMatch[1] : '/assets/index-VTYqvEq1.css',
    '/favicon.png',
    '/api/tmdb-proxy/trending/all/day'
  ];

  for (const asset of assetsToTest) {
    const aRes = await fetch('http://localhost:3000' + asset);
    const len = aRes.headers.get('content-length') || (await aRes.arrayBuffer()).byteLength;
    console.log(`Asset ${asset} -> Status: ${aRes.status}, Type: ${aRes.headers.get('content-type')}, Size: ${len} bytes`);
    if (aRes.status !== 200) throw new Error(`Asset ${asset} failed with ${aRes.status}`);
  }

  // Test image proxy
  console.log('\n--- Test 6: TMDb Image Proxy ---');
  const trendingRes = await fetch('http://localhost:3000/api/tmdb-proxy/trending/all/day');
  const trendingData = await trendingRes.json();
  const sample = trendingData.results && trendingData.results[0];
  if (sample && sample.poster_path) {
    const imgUrl = 'http://localhost:3000/api/tmdb-image/w500' + sample.poster_path;
    const imgRes = await fetch(imgUrl);
    const imgBuf = await imgRes.arrayBuffer();
    console.log(`Image Proxy ${imgUrl} -> Status: ${imgRes.status}, Type: ${imgRes.headers.get('content-type')}, Size: ${imgBuf.byteLength} bytes`);
    if (imgRes.status !== 200) throw new Error(`Image proxy failed with ${imgRes.status}`);
  }

  console.log('\n>>> ALL API & ASSET TESTS PASSED SUCCESSFULLY! <<<');
}

testAll().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
