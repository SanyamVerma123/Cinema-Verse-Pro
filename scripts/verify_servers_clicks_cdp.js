/**
 * Automated Repeated Click Test Script for Streaming Servers 8, 9, and 10
 * Uses Headless Chrome with native Chrome DevTools Protocol (CDP)
 * Tests Server 8 (VidLink), Server 9 (AnyEmbed), and Server 10 (Nontongo)
 * under both Unsandboxed and Sandboxed iframe configurations.
 */

const http = require('http');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const HARNESS_PORT = 8990;
const CDP_PORT = 9333;
const REAL_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SANDBOX_CONFIG = 'allow-scripts allow-same-origin allow-forms allow-presentation';

// Test matrix
const TEST_SUITE = [
  // Server 8: VidLink Pro
  {
    serverId: 8,
    name: 'Server 8 (VidLink Pro)',
    provider: 'vidlink.pro',
    type: 'Movie (Stree 2)',
    mediaId: '1079091',
    url: 'https://vidlink.pro/movie/1079091?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true'
  },
  {
    serverId: 8,
    name: 'Server 8 (VidLink Pro)',
    provider: 'vidlink.pro',
    type: 'TV (Scam 1992)',
    mediaId: '111188/1/1',
    url: 'https://vidlink.pro/tv/111188/1/1?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true'
  },

  // Server 9: AnyEmbed Prime
  {
    serverId: 9,
    name: 'Server 9 (AnyEmbed Prime)',
    provider: 'anyembed.xyz',
    type: 'Movie (Stree 2)',
    mediaId: '1079091',
    url: 'https://anyembed.xyz/embed/tmdb-movie-1079091'
  },
  {
    serverId: 9,
    name: 'Server 9 (AnyEmbed Prime)',
    provider: 'anyembed.xyz',
    type: 'TV (Scam 1992)',
    mediaId: '111188/1/1',
    url: 'https://anyembed.xyz/embed/tmdb-tv-111188-1-1'
  },

  // Server 10: Nontongo CC
  {
    serverId: 10,
    name: 'Server 10 (Nontongo CC)',
    provider: 'nontongo.win',
    type: 'Movie (Stree 2)',
    mediaId: '1079091',
    url: 'https://www.nontongo.win/embed/movie/1079091'
  },
  {
    serverId: 10,
    name: 'Server 10 (Nontongo CC)',
    provider: 'nontongo.win',
    type: 'TV (Scam 1992)',
    mediaId: '111188/1/1',
    url: 'https://www.nontongo.win/embed/tv/111188/1/1'
  }
];

let activeHarnessState = null;

// Create HTTP server for Parent Harness
const harnessServer = http.createServer((req, res) => {
  if (req.url.startsWith('/harness')) {
    if (!activeHarnessState) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('No active test state configured');
    }

    const { url, sandbox } = activeHarnessState;
    const sandboxAttribute = sandbox ? `sandbox="${SANDBOX_CONFIG}"` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Automated Player Harness</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0a0a0f; overflow: hidden; font-family: monospace; }
    #status-bar {
      position: absolute; top: 0; left: 0; right: 0; height: 32px;
      background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid #334155;
      color: #38bdf8; display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; font-size: 12px; z-index: 999999; pointer-events: none;
    }
    #player-wrap {
      position: absolute; top: 32px; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center; background: #000;
    }
    iframe {
      width: 1280px;
      height: 688px;
      border: 0;
      background: #000;
    }
  </style>
</head>
<body>
  <div id="status-bar">
    <span>TEST HARNESS ACTIVE | Target: ${url.slice(0, 60)}...</span>
    <span>Blur Count: <b id="blur-count">0</b> | Top Nav: <b id="nav-flag">None</b></span>
  </div>
  <div id="player-wrap">
    <iframe
      id="test-iframe"
      src="${url}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      referrerpolicy="no-referrer"
      allowfullscreen="true"
      ${sandboxAttribute}
    ></iframe>
  </div>
  <script>
    window.__harness = {
      blurCount: 0,
      focusLost: false,
      beforeUnloadCount: 0,
      windowOpenCalls: [],
      timestamp: Date.now()
    };
    window.addEventListener('blur', () => {
      window.__harness.blurCount++;
      window.__harness.focusLost = true;
      const el = document.getElementById('blur-count');
      if (el) el.innerText = window.__harness.blurCount;
    });
    window.addEventListener('beforeunload', () => {
      window.__harness.beforeUnloadCount++;
      const el = document.getElementById('nav-flag');
      if (el) el.innerText = 'Triggered beforeunload';
    });
    const origOpen = window.open;
    window.open = function(...args) {
      window.__harness.windowOpenCalls.push({ args, time: Date.now() });
      return origOpen.apply(this, args);
    };
  </script>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  res.writeHead(404);
  res.end('Not found');
});

async function launchChrome() {
  const userDataDir = 'C:\\Users\\Hermes\\AppData\\Local\\Temp\\ch_verifier_' + Date.now();
  console.log(`[Chrome] Launching headless Chrome on port ${CDP_PORT}...`);
  const proc = cp.spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,720',
    `--user-agent=${REAL_USER_AGENT}`,
    '--autoplay-policy=no-user-gesture-required',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    'about:blank'
  ]);

  proc.on('error', err => console.error('[Chrome] Process error:', err));

  // Poll until CDP is accessible
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        const ver = await res.json();
        console.log(`[Chrome] CDP Ready: ${ver.Browser}`);
        return { proc, userDataDir };
      }
    } catch (e) {}
  }
  throw new Error('Chrome failed to bind CDP port within 15 seconds');
}

async function connectCDP() {
  const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page') || pages[0];
  const ws = new globalThis.WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  const listeners = new Set();

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
      return;
    }
    for (const fn of listeners) {
      fn(data);
    }
  };

  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mId = id++;
    pending.set(mId, { resolve, reject });
    ws.send(JSON.stringify({ id: mId, method, params }));
  });

  return {
    send,
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
    close: () => ws.close()
  };
}

async function runClickTestOnTarget({ target, sandbox, cdp }) {
  const { send, addListener, removeListener } = cdp;
  console.log(`\n======================================================================`);
  console.log(`[TEST RUN] ${target.name} | ${target.type}`);
  console.log(`  Target URL: ${target.url}`);
  console.log(`  Sandbox Mode: ${sandbox ? 'ACTIVE (' + SANDBOX_CONFIG + ')' : 'NONE (Unsandboxed)'}`);
  console.log(`======================================================================`);

  activeHarnessState = { url: target.url, sandbox };

  const popupsOpened = [];
  const topNavigations = [];
  const streamRequests = [];
  const securityWarnings = [];
  const consoleMessages = [];
  const executionContexts = [];

  const onEvent = (event) => {
    // 1. Popup / window.open / target="_blank" detection
    if (event.method === 'Target.targetCreated') {
      const info = event.params.targetInfo;
      if (info.type === 'page' && !info.url.includes(`${HARNESS_PORT}/harness`)) {
        console.log(`  [POPUP DETECTED] type=${info.type} id=${info.targetId} url=${info.url}`);
        popupsOpened.push({
          targetId: info.targetId,
          type: info.type,
          url: info.url,
          title: info.title || '',
          timestamp: Date.now()
        });
      }
    }

    if (event.method === 'Target.targetInfoChanged') {
      const info = event.params.targetInfo;
      if (info.type === 'page' && !info.url.includes(`${HARNESS_PORT}/harness`)) {
        const found = popupsOpened.find(p => p.targetId === info.targetId);
        if (found) {
          found.url = info.url;
          found.title = info.title;
        }
      }
    }

    // 2. Top-level navigation
    if (event.method === 'Page.frameNavigated') {
      const frame = event.params.frame;
      if (!frame.parentId) {
        if (!frame.url.includes(`${HARNESS_PORT}/harness`) && frame.url !== 'about:blank') {
          console.log(`  [TOP NAVIGATION EVENT] Parent page navigated to: ${frame.url}`);
          topNavigations.push({
            url: frame.url,
            time: Date.now()
          });
        }
      }
    }

    // 3. Context tracking
    if (event.method === 'Runtime.executionContextCreated') {
      executionContexts.push(event.params.context);
    }

    // 4. Security / Sandbox browser logs
    if (event.method === 'Log.entryAdded') {
      const entry = event.params.entry;
      const text = entry.text || '';
      if (
        text.includes('sandbox') ||
        text.includes('Blocked') ||
        text.includes('window.open') ||
        text.includes('popups') ||
        text.includes('navigation') ||
        text.includes('CORS')
      ) {
        console.log(`  [SECURITY LOG] [${entry.level}] ${text}`);
        securityWarnings.push({
          level: entry.level,
          text: text,
          source: entry.source
        });
      }
    }

    // 5. Console messages
    if (event.method === 'Runtime.consoleAPICalled') {
      const text = event.params.args.map(a => a.value || a.description || '').join(' ');
      consoleMessages.push({ type: event.params.type, text });
      if (text.toLowerCase().includes('sandbox') || text.toLowerCase().includes('blocked') || text.toLowerCase().includes('popup')) {
        securityWarnings.push({ level: 'console', text, source: 'console' });
      }
    }

    // 6. Network stream requests (.m3u8, .ts, .mp4)
    if (event.method === 'Network.requestWillBeSent') {
      const reqUrl = event.params.request.url;
      if (
        reqUrl.includes('.m3u8') ||
        reqUrl.includes('.ts') ||
        reqUrl.includes('.mp4') ||
        reqUrl.includes('/manifest') ||
        reqUrl.includes('/playlist') ||
        reqUrl.includes('segment')
      ) {
        streamRequests.push({
          url: reqUrl,
          method: event.params.request.method,
          status: 'pending',
          timestamp: Date.now()
        });
      }
    }

    if (event.method === 'Network.responseReceived') {
      const res = event.params.response;
      const mime = res.mimeType || '';
      const isMedia = mime.includes('mpegurl') || mime.includes('video') || res.url.includes('.m3u8') || res.url.includes('.ts') || res.url.includes('.mp4');
      if (isMedia) {
        const found = streamRequests.find(s => s.url === res.url);
        if (found) {
          found.status = res.status;
          found.mimeType = mime;
        } else {
          streamRequests.push({
            url: res.url,
            status: res.status,
            mimeType: mime,
            timestamp: Date.now()
          });
        }
      }
    }
  };

  addListener(onEvent);

  // Navigate harness
  const harnessUrl = `http://127.0.0.1:${HARNESS_PORT}/harness?t=${Date.now()}`;
  await send('Page.navigate', { url: harnessUrl });

  // Initial load wait (let iframe HTML, scripts, and player initialize)
  console.log('  Waiting 5.0s for iframe and player initialization...');
  await new Promise(r => setTimeout(r, 5000));

  // Record baseline popups before any user click
  const baselinePopups = popupsOpened.length;
  console.log(`  Baseline (pre-click) popups spawned: ${baselinePopups}`);

  // Helper click dispatcher
  const clickHistory = [];
  async function simulateClick(x, y, description) {
    console.log(`  [CLICK SIMULATION] ${description} at coordinates (${x}, ${y})`);
    clickHistory.push({ x, y, description, time: Date.now() });

    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y
    });
    await new Promise(r => setTimeout(r, 50));

    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
    await new Promise(r => setTimeout(r, 100));

    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
  }

  // Clicks sequence: simulate multiple clicks across the player viewport
  // Viewport is 1280x720, iframe occupies (0, 32) to (1280, 720), player center is ~(640, 376)
  
  // Click 1: Primary Center Play button
  await simulateClick(640, 376, 'Click 1: Center Big Play Button');
  await new Promise(r => setTimeout(r, 2000));

  // Click 2: Second Center click (handles overlay dismissals or play trigger)
  await simulateClick(640, 376, 'Click 2: Center Player / Play-Resume');
  await new Promise(r => setTimeout(r, 2000));

  // Click 3: Top-Right Viewport (common area for ad overlays / invisible redirects)
  await simulateClick(950, 200, 'Click 3: Top-Right Viewport Quadrant');
  await new Promise(r => setTimeout(r, 2000));

  // Click 4: Bottom-Left Viewport (secondary trigger area)
  await simulateClick(350, 480, 'Click 4: Bottom-Left Viewport Quadrant');
  await new Promise(r => setTimeout(r, 2000));

  // Click 5: Player Bottom Control Bar (play/pause bar or audio selector)
  await simulateClick(640, 680, 'Click 5: Bottom Control Bar');
  await new Promise(r => setTimeout(r, 3000));

  // Click 6: Additional Center click
  await simulateClick(640, 376, 'Click 6: Final Center Play Probe');
  await new Promise(r => setTimeout(r, 3000));

  // Capture Screenshot for visual inspection
  const snapFilename = `scratch/snap_${target.serverId}_${target.type.startsWith('Movie') ? 'movie' : 'tv'}_${sandbox ? 'sandboxed' : 'unsandboxed'}.png`;
  try {
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(snapFilename, Buffer.from(snap.data, 'base64'));
    console.log(`  Screenshot captured: ${snapFilename}`);
  } catch (err) {
    console.log(`  Failed to capture screenshot: ${err.message}`);
  }

  // Inspect HTML5 video elements across all execution contexts
  const foundVideos = [];
  for (const ctx of executionContexts) {
    try {
      const res = await send('Runtime.evaluate', {
        contextId: ctx.id,
        expression: `(() => {
          const vids = Array.from(document.querySelectorAll('video'));
          if (vids.length === 0) return null;
          return vids.map(v => ({
            tag: 'VIDEO',
            src: v.src ? v.src.slice(0, 120) : '',
            currentSrc: v.currentSrc ? v.currentSrc.slice(0, 120) : '',
            paused: v.paused,
            currentTime: v.currentTime,
            duration: v.duration,
            readyState: v.readyState,
            videoWidth: v.videoWidth,
            videoHeight: v.videoHeight,
            hasError: !!v.error,
            error: v.error ? { code: v.error.code, message: v.error.message } : null
          }));
        })()`,
        returnByValue: true
      });
      if (res && res.result && res.result.value) {
        foundVideos.push({
          contextOrigin: ctx.origin,
          contextName: ctx.name,
          videos: res.result.value
        });
      }
    } catch (e) {}
  }

  // Inspect harness metrics
  let harnessStats = { blurCount: 0, focusLost: false, beforeUnloadCount: 0, windowOpenCalls: [] };
  try {
    const evalHarness = await send('Runtime.evaluate', {
      expression: 'window.__harness',
      returnByValue: true
    });
    if (evalHarness && evalHarness.result && evalHarness.result.value) {
      harnessStats = evalHarness.result.value;
    }
  } catch (e) {}

  // Cleanup: close any spawned popup targets
  for (const pop of popupsOpened) {
    try {
      await send('Target.closeTarget', { targetId: pop.targetId });
    } catch (e) {}
  }

  removeListener(onEvent);

  const m3u8Requests = streamRequests.filter(s => s.url.includes('.m3u8'));
  const tsRequests = streamRequests.filter(s => s.url.includes('.ts') || s.url.includes('segment'));
  const isVideoPlaying = foundVideos.some(c => c.videos.some(v => (!v.paused && v.currentTime > 0) || v.readyState >= 2));
  const hasStreamNetworkActivity = m3u8Requests.length > 0 || tsRequests.length > 0;

  const summary = {
    serverId: target.serverId,
    name: target.name,
    provider: target.provider,
    type: target.type,
    url: target.url,
    sandboxActive: sandbox,
    clicksTotal: clickHistory.length,
    popups: {
      total: popupsOpened.length,
      baselineBeforeClicks: baselinePopups,
      clicksTriggered: popupsOpened.length - baselinePopups,
      targets: popupsOpened
    },
    popunders: {
      blurEvents: harnessStats.blurCount,
      focusLost: harnessStats.focusLost
    },
    topLevelNavigation: {
      occurred: topNavigations.length > 0,
      attempts: topNavigations
    },
    sandboxViolationsBlocked: {
      count: securityWarnings.length,
      samples: securityWarnings.map(w => w.text).filter((v, i, a) => a.indexOf(v) === i)
    },
    videoPlayback: {
      html5VideoElementFound: foundVideos.length > 0,
      videoPlaying: isVideoPlaying,
      hasStreamActivity: hasStreamNetworkActivity,
      m3u8RequestsCount: m3u8Requests.length,
      tsChunksCount: tsRequests.length,
      m3u8SampleUrls: m3u8Requests.slice(0, 3).map(r => r.url.slice(0, 100)),
      videoElements: foundVideos
    }
  };

  console.log(`\n  --- Summary for ${target.name} (${target.type}) [Sandbox: ${sandbox}] ---`);
  console.log(`  * Popups Spawned: ${summary.popups.total} (Post-click: ${summary.popups.clicksTriggered})`);
  console.log(`  * Blur Popunder Events: ${summary.popunders.blurEvents}`);
  console.log(`  * Top-Level Navigations: ${summary.topLevelNavigation.occurred ? 'YES (' + summary.topLevelNavigation.attempts.length + ')' : 'NO (0)'}`);
  console.log(`  * Sandbox Violations Blocked: ${summary.sandboxViolationsBlocked.count}`);
  console.log(`  * Video Stream Requests: ${summary.videoPlayback.m3u8RequestsCount} m3u8, ${summary.videoPlayback.tsChunksCount} ts`);
  console.log(`  * HTML5 Video Found: ${summary.videoPlayback.html5VideoElementFound}, Playing: ${summary.videoPlayback.videoPlaying}`);

  return summary;
}

async function runAllTests() {
  console.log('Starting Automated Click & Sandbox Verification Test Suite...');
  harnessServer.listen(HARNESS_PORT);
  console.log(`Harness server running at http://127.0.0.1:${HARNESS_PORT}`);

  const { proc, userDataDir } = await launchChrome();
  const cdp = await connectCDP();

  // Enable CDP domains
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');
  await cdp.send('Target.setDiscoverTargets', { discover: true });

  const allResults = [];

  for (const target of TEST_SUITE) {
    // 1. Test WITHOUT sandbox
    try {
      const unSandboxedRes = await runClickTestOnTarget({
        target,
        sandbox: false,
        cdp
      });
      allResults.push(unSandboxedRes);
    } catch (err) {
      console.error(`Error in unsandboxed test for ${target.name}:`, err);
      allResults.push({ target: target.name, type: target.type, sandboxActive: false, error: err.message });
    }

    // Short cool-down
    await new Promise(r => setTimeout(r, 2000));

    // 2. Test WITH sandbox
    try {
      const sandboxedRes = await runClickTestOnTarget({
        target,
        sandbox: true,
        cdp
      });
      allResults.push(sandboxedRes);
    } catch (err) {
      console.error(`Error in sandboxed test for ${target.name}:`, err);
      allResults.push({ target: target.name, type: target.type, sandboxActive: true, error: err.message });
    }

    // Short cool-down
    await new Promise(r => setTimeout(r, 2000));
  }

  // Write full results to json
  const reportPath = 'scratch/verification_servers_8_9_10_results.json';
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n======================================================`);
  console.log(`ALL TESTS COMPLETE! Results saved to ${reportPath}`);
  console.log(`======================================================\n`);

  cdp.close();
  proc.kill();
  harnessServer.close();
}

runAllTests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
