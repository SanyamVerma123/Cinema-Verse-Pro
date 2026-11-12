const http = require('http');

async function test() {
  const rAuth = await fetch('http://127.0.0.1:3000/api/vault/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'cinema2026' })
  });
  const cookie = rAuth.headers.get('set-cookie');
  console.log('Auth status:', rAuth.status, 'Cookie:', cookie ? 'YES' : 'NO');

  const rVault = await fetch('http://127.0.0.1:3000/vault', {
    headers: { 'Cookie': cookie }
  });
  console.log('Vault status:', rVault.status);
  const html = await rVault.text();
  console.log('Vault HTML length:', html.length, 'contains root:', html.includes('id="root"'));

  const jsMatch = html.match(/src="(\/assets\/[^"']+)"/);
  const cssMatch = html.match(/href="(\/assets\/[^"']+)"/);
  if (jsMatch) {
    const rJs = await fetch('http://127.0.0.1:3000' + jsMatch[1]);
    console.log('JS asset (' + jsMatch[1] + ') status:', rJs.status, 'len:', (await rJs.text()).length);
  }
  if (cssMatch) {
    const rCss = await fetch('http://127.0.0.1:3000' + cssMatch[1]);
    console.log('CSS asset (' + cssMatch[1] + ') status:', rCss.status, 'len:', (await rCss.text()).length);
  }

  // Also test unauthenticated /vault -> must be 404
  const rUnauth = await fetch('http://127.0.0.1:3000/vault');
  console.log('Unauth Vault status (must be 404):', rUnauth.status);

  // Also test root / -> must be 200 OK
  const rRoot = await fetch('http://127.0.0.1:3000/');
  console.log('Root / status:', rRoot.status);
}

test().catch(console.error);
