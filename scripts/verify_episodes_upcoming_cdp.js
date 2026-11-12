const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;

const ARTIFACT_DIR = 'C:/Users/Hermes/.gemini/antigravity/brain/a1e9e2ea-04c0-4a36-8410-1fce29063be6';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startChrome() {
  const dataDir = path.join(require('os').tmpdir(), 'chrome-dbg-' + Date.now());
  const chromeProcess = spawn(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    [
      '--headless',
      '--remote-debugging-port=9222',
      '--no-sandbox',
      '--disable-gpu',
      `--user-data-dir=${dataDir}`,
      'about:blank',
    ],
    { stdio: 'pipe' }
  );

  return new Promise((resolve, reject) => {
    chromeProcess.stderr.on('data', (d) => {
      const str = d.toString();
      console.log('[Chrome]', str.trim());
      if (str.includes('DevTools listening on')) {
        resolve(chromeProcess);
      }
    });
    chromeProcess.on('error', reject);
    setTimeout(() => resolve(chromeProcess), 3500);
  });
}

function getCdpWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find((t) => t.type === 'page') || list[0];
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error('No debuggable page target found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const res = JSON.parse(event.data.toString());
    if (res.id && pending.has(res.id)) {
      const { resolve, reject } = pending.get(res.id);
      pending.delete(res.id);
      if (res.error) reject(res.error);
      else resolve(res.result);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve({ send, close: () => ws.close() });
    ws.onerror = (err) => reject(err);
  });
}

async function run() {
  console.log('Starting headless Chrome...');
  const chromeProcess = await startChrome();
  await sleep(1500);

  console.log('Connecting to Chrome CDP on 127.0.0.1:9222...');
  const wsUrl = await getCdpWsUrl();
  const cdp = await createCdpClient(wsUrl);
  console.log('Connected to CDP successfully.');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  // Authenticate session vault cookie
  console.log('Authenticating vault session...');
  const authRes = await fetch('http://127.0.0.1:3000/api/vault/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'cinema2026' }),
  });
  const setCookieHeader = authRes.headers.get('set-cookie') || '';
  const tokenMatch = setCookieHeader.match(/__session_vault=([^;]+)/);
  const sessionToken = tokenMatch ? tokenMatch[1] : '';
  console.log('Obtained vault session token:', sessionToken.slice(0, 16) + '...');

  await cdp.send('Network.setCookie', {
    name: '__session_vault',
    value: sessionToken,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    secure: false,
  });

  // 1. Mobile verification (375x667)
  console.log('\n--- 1. Testing Mobile Viewport (375x667) ---');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:3000/vault' });
  await sleep(3500);

  // Take screenshot of mobile home
  const snap1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'vault_mobile_home_updated.png'), Buffer.from(snap1.data, 'base64'));
  console.log('Saved vault_mobile_home_updated.png');

  // 2. Open Notification Drawer and inspect upcoming movies
  console.log('\n--- 2. Checking Notification Drawer & Upcoming Filtering ---');
  await cdp.send('Runtime.evaluate', {
    expression: `
      const bell = document.querySelector('button[title*="Notification"], button[aria-label*="Notification"]');
      if (bell) bell.click();
    `,
  });
  await sleep(1500);

  // Inspect what upcoming movies are listed and whether any 0 days exist
  const upcomingInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const titles = Array.from(document.querySelectorAll('div, p, span'))
        .filter(el => el.textContent.includes('In ') && el.textContent.includes('days'))
        .map(el => el.textContent.trim());
      const zeroDays = titles.filter(t => t.includes('In 0 days') || t.includes('0 days'));
      const banner = document.querySelector('button[aria-label="Dismiss Banner"], button[title="Dismiss Banner"]');
      return {
        countdownBadges: titles.slice(0, 6),
        zeroDaysCount: zeroDays.length,
        hasDismissBanner: Boolean(banner)
      };
    })()`,
    returnByValue: true,
  });
  console.log('Notification drawer upcoming info:', upcomingInfo.result?.value);

  const snap2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'vault_mobile_notifications_clean.png'), Buffer.from(snap2.data, 'base64'));
  console.log('Saved vault_mobile_notifications_clean.png');

  // Test dismiss banner
  await cdp.send('Runtime.evaluate', {
    expression: `
      const dismissBtn = document.querySelector('button[aria-label="Dismiss Banner"], button[title="Dismiss Banner"]');
      if (dismissBtn) dismissBtn.click();
    `,
  });
  await sleep(600);

  // Close drawer
  await cdp.send('Runtime.evaluate', {
    expression: `
      const closeBtn = document.querySelector('[role="dialog"][aria-label="Release Alerts and Notifications"] button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    `,
  });
  await sleep(800);

  // 3. Test TV Episode Selector in Mobile Player HUD
  console.log('\n--- 3. Testing TV Series Player & Mobile Episode Selector ---');
  // Navigate to Series tab
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const seriesNav = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Series');
      if (seriesNav) seriesNav.click();
    })()`,
  });
  await sleep(2000);

  // Click a TV series card on the Series page
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('article button'));
      const tvCard = cards.find(b => b.textContent.includes('SERIES') || b.textContent.includes('season') || b.textContent.includes('episodes')) || cards[0];
      if (tvCard) tvCard.click();
    })()`,
  });
  await sleep(1500);

  // In the detail modal, click Play
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const playBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Play');
      if (playBtn) playBtn.click();
    })()`,
  });
  await sleep(2500);

  // Check Player HUD for Episode selector on Mobile
  const mobilePlayerInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const selects = Array.from(document.querySelectorAll('button[role="combobox"]')).map(b => b.textContent.trim());
      const epDrawerBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Episodes') || b.title?.includes('Episodes'));
      const iframe = document.querySelector('iframe');
      const badge = document.querySelector('span[class*="text-amber"]');
      return {
        comboboxes: selects,
        hasEpDrawerBtn: Boolean(epDrawerBtn),
        badge: badge ? badge.textContent.trim() : '',
        iframeSrc: iframe ? iframe.src : ''
      };
    })()`,
    returnByValue: true,
  });
  console.log('Mobile Player HUD Info (TV Series):', mobilePlayerInfo.result?.value);

  const snap3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'vault_mobile_player_episodes.png'), Buffer.from(snap3.data, 'base64'));
  console.log('Saved vault_mobile_player_episodes.png');

  // Test opening the Episodes Drawer
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const epDrawerBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Episodes') || b.title?.includes('Episodes'));
      if (epDrawerBtn) epDrawerBtn.click();
    })()`,
  });
  await sleep(1200);

  const snap4 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'vault_mobile_episodes_drawer.png'), Buffer.from(snap4.data, 'base64'));
  console.log('Saved vault_mobile_episodes_drawer.png');

  // 4. Desktop verification (1280x800)
  console.log('\n--- 4. Testing Desktop Viewport (1280x800) ---');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(1200);

  // Close episode drawer if open
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const closeEp = document.querySelector('[role="dialog"][aria-label="Episodes list"] button[aria-label="Close Episodes Drawer"]');
      if (closeEp) closeEp.click();
    })()`,
  });
  await sleep(800);

  const desktopPlayerInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const selects = Array.from(document.querySelectorAll('header button[role="combobox"]')).map(b => b.textContent.trim());
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next ›'));
      const prevBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('‹ Prev'));
      const iframe = document.querySelector('iframe');
      return {
        desktopSelects: selects,
        hasNextBtn: Boolean(nextBtn),
        hasPrevBtn: Boolean(prevBtn),
        iframeSrc: iframe ? iframe.src : ''
      };
    })()`,
    returnByValue: true,
  });
  console.log('Desktop Player HUD Info:', desktopPlayerInfo.result?.value);

  // Click Next Episode button
  console.log('Testing Next Episode button click...');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next ›'));
      if (nextBtn) nextBtn.click();
    })()`,
  });
  await sleep(1500);

  const afterNextInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      const badge = document.querySelector('span[class*="text-amber"]');
      return {
        badgeText: badge ? badge.textContent.trim() : '',
        iframeSrc: iframe ? iframe.src : ''
      };
    })()`,
    returnByValue: true,
  });
  console.log('After Next Episode click:', afterNextInfo.result?.value);

  const snap5 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'vault_desktop_player_episodes.png'), Buffer.from(snap5.data, 'base64'));
  console.log('Saved vault_desktop_player_episodes.png');

  cdp.close();
  try {
    chromeProcess.kill();
  } catch {}
  console.log('\nVerification completed successfully!');
}

run().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
