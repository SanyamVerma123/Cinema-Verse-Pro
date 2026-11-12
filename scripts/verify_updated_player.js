const cp = require('child_process');
const fs = require('fs');

async function verify() {
  console.log('--- Starting CinemaVerse Pro Browser Verification ---');

  // 1. Get authenticated session cookie
  const authRes = await fetch('http://127.0.0.1:3000/api/vault/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'cinema2026' })
  });
  const cookie = (authRes.headers.get('set-cookie') || '').match(/__session_vault=([^;]+)/)[1];
  console.log('Authenticated session token acquired.');

  // 2. Launch headless Chrome with CDP
  const port = 9555;
  const userDataDir = 'C:\\Users\\Hermes\\AppData\\Local\\Temp\\ch_verify_' + Date.now();
  const chrome = cp.spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1800));
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new globalThis.WebSocket(pages[0].webSocketDebuggerUrl);

  let id = 1;
  const cbs = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && cbs.has(d.id)) { cbs.get(d.id)(d.result); cbs.delete(d.id); }
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', d.params.type, ...d.params.args.map(a => a.value));
    }
  };

  const send = (method, params = {}) => new Promise(res => {
    const m = id++;
    cbs.set(m, res);
    ws.send(JSON.stringify({ id: m, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Network.enable');
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.setCookie', { name: '__session_vault', value: cookie, domain: '127.0.0.1', path: '/' });

  // 3. Navigate to /vault
  console.log('Navigating to http://127.0.0.1:3000/vault ...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/vault' });
  await new Promise(r => setTimeout(r, 6000));

  // 4. Verify Homepage Layout, Brand, and Hero Button Clearance
  const homeCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const brand = document.querySelector('header button[aria-label*="Home"]')?.innerText || '';
      const brandLogo = !!document.querySelector('header img[src*="logo.svg"]');
      const heroButtons = Array.from(document.querySelectorAll('section button')).map(b => b.innerText.trim()).filter(Boolean);
      const myListBtn = document.querySelector('button[aria-label*="My List"]');
      const firstRow = document.querySelector('.group\\/row, .top10-card');
      
      let myListRect = null;
      let firstRowRect = null;
      let isOverlapped = false;

      if (myListBtn && firstRow) {
        myListRect = myListBtn.getBoundingClientRect();
        firstRowRect = firstRow.getBoundingClientRect();
        isOverlapped = myListRect.bottom > firstRowRect.top;
      }

      return {
        brandText: brand,
        brandLogo,
        heroButtons,
        myListRect: myListRect ? { top: myListRect.top, bottom: myListRect.bottom } : null,
        firstRowRect: firstRowRect ? { top: firstRowRect.top, bottom: firstRowRect.bottom } : null,
        isOverlapped
      };
    })()`,
    returnByValue: true
  });
  console.log('\n--- HOMEPAGE & HERO CLEARANCE CHECK ---');
  console.log(JSON.stringify(homeCheck.result.value, null, 2));

  // Take screenshot of homepage
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\apps\\FMR\\vault_home_updated.png', Buffer.from(snap1.data, 'base64'));
  console.log('Saved d:\\apps\\FMR\\vault_home_updated.png');

  // 5. Open Detail Modal by clicking "More info" or first card
  console.log('\nOpening Detail Modal...');
  const openDetail = await send('Runtime.evaluate', {
    expression: `(() => {
      const moreInfo = Array.from(document.querySelectorAll('section button')).find(b => b.innerText.includes('More info'));
      if (moreInfo) {
        moreInfo.click();
        return 'Clicked More info button';
      }
      const firstCard = document.querySelector('[aria-label^="Open"]');
      if (firstCard) {
        firstCard.click();
        return 'Clicked card: ' + firstCard.getAttribute('aria-label');
      }
      return 'No trigger found';
    })()`,
    returnByValue: true
  });
  console.log('Action:', openDetail.result.value);
  await new Promise(r => setTimeout(r, 3000));

  // 6. Verify Speaker Icon at Left Corner of Detail Modal
  const speakerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false, reason: 'Dialog not found' };
      const speakerBtn = dialog.querySelector('button[aria-label*="mute" i], button[aria-label*="Mute" i], button[title*="mute" i]');
      const speakerPos = speakerBtn ? speakerBtn.getBoundingClientRect() : null;
      const closeBtn = dialog.querySelector('button[aria-label*="Close" i]');
      const closePos = closeBtn ? closeBtn.getBoundingClientRect() : null;
      return {
        found: !!speakerBtn,
        speakerAria: speakerBtn ? speakerBtn.getAttribute('aria-label') : null,
        speakerPos: speakerPos ? { left: speakerPos.left, top: speakerPos.top } : null,
        closePos: closePos ? { right: window.innerWidth - closePos.right, top: closePos.top } : null,
        hasTrailerIframe: !!dialog.querySelector('iframe[src*="youtube"]')
      };
    })()`,
    returnByValue: true
  });
  console.log('\n--- DETAIL MODAL SPEAKER ICON CHECK ---');
  console.log(JSON.stringify(speakerCheck.result.value, null, 2));

  // Test toggling the speaker button
  console.log('\nTesting speaker button toggle...');
  const toggleRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const speakerBtn = document.querySelector('[role="dialog"] button[aria-label*="mute" i], [role="dialog"] button[title*="mute" i]');
      if (speakerBtn) {
        speakerBtn.click();
        return { afterClickAria: speakerBtn.getAttribute('aria-label') };
      }
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Speaker toggle result:', toggleRes.result.value);

  // Take screenshot of Detail modal with speaker icon
  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\apps\\FMR\\vault_detail_speaker.png', Buffer.from(snap2.data, 'base64'));
  console.log('Saved d:\\apps\\FMR\\vault_detail_speaker.png');

  // 7. Click "Play" in Detail Modal to launch the Streaming View
  console.log('\nClicking Play to launch Streaming Player...');
  const clickPlay = await send('Runtime.evaluate', {
    expression: `(() => {
      const playBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText.trim().startsWith('Play'));
      if (playBtn) {
        playBtn.click();
        return 'Clicked Play in Detail modal';
      }
      return 'Play button not found in modal';
    })()`,
    returnByValue: true
  });
  console.log('Play action:', clickPlay.result.value);
  await new Promise(r => setTimeout(r, 4500));

  // 8. Verify Streaming View HUD, Servers, Controls, and Iframe
  const playerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const playerOverlay = document.querySelector('[aria-label^="Playing"]');
      if (!playerOverlay) return { found: false, reason: 'Player overlay not found' };

      const backBtn = playerOverlay.querySelector('button[aria-label*="Back"]')?.innerText;
      const title = playerOverlay.querySelector('h2')?.innerText;
      const badges = Array.from(playerOverlay.querySelectorAll('span')).map(s => s.innerText.trim()).filter(b => ['4K Ultra HD', 'Dolby Atmos'].includes(b) || b.startsWith('Server'));
      const serverSelect = playerOverlay.querySelector('select[aria-label*="Server"]');
      const serverOptions = serverSelect ? Array.from(serverSelect.querySelectorAll('option')).map(o => o.innerText.trim()) : [];
      const zapBtn = !!Array.from(playerOverlay.querySelectorAll('button')).find(b => b.innerText.includes('Zap Ads'));
      const iframe = playerOverlay.querySelector('iframe');

      return {
        found: true,
        title,
        backButton: backBtn,
        badges,
        serverCount: serverOptions.length,
        serversPreview: serverOptions.slice(0, 10),
        hasZapAdsButton: zapBtn,
        iframeSrc: iframe ? iframe.src : null
      };
    })()`,
    returnByValue: true
  });
  console.log('\n--- STREAMING PLAYER VIEW VERIFICATION ---');
  console.log(JSON.stringify(playerCheck.result.value, null, 2));

  // Take screenshot of Streaming Player
  const snap3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('d:\\apps\\FMR\\vault_streaming_player.png', Buffer.from(snap3.data, 'base64'));
  console.log('Saved d:\\apps\\FMR\\vault_streaming_player.png');

  ws.close();
  chrome.kill();
  console.log('\nVerification complete!');
}

verify().catch(console.error);
