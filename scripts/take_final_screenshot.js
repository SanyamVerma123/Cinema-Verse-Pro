const cp = require('child_process');
const fs = require('fs');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9666;
  const userDataDir = 'C:\\Users\\Hermes\\AppData\\Local\\Temp\\chrome_verifier_' + Date.now();
  
  console.log('Launching headless Chrome on port', port);
  const chromeProc = cp.spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    'about:blank'
  ]);

  let wsUrl = '';
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const pages = await res.json();
        const target = pages.find(p => p.type === 'page') || pages[0];
        if (target && target.webSocketDebuggerUrl) {
          wsUrl = target.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome debugging port');
  }

  console.log('Connecting to WebSocket:', wsUrl);
  const ws = new globalThis.WebSocket(wsUrl);
  let id = 1;
  const callbacks = new Map();
  const consoleMessages = [];

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data.result);
      callbacks.delete(data.id);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const msg = data.params.args.map(a => a.value || a.description).join(' ');
      consoleMessages.push(`[${data.params.type}] ${msg}`);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
    }
  };

  const send = (method, params = {}) => new Promise((resolve) => {
    const msgId = id++;
    callbacks.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await new Promise((resolve) => {
    if (ws.readyState === 1) resolve();
    else ws.onopen = resolve;
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  console.log('Navigating to http://localhost:3000/vault?vault_key=cinema2026 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/vault?vault_key=cinema2026' });

  // Wait 7 seconds for React hydration, TMDb proxy fetch, backdrop and posters loading
  console.log('Waiting 7 seconds for DOM and media elements to render...');
  await new Promise(r => setTimeout(r, 7000));

  // Inspect DOM elements
  const evalResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const topNums = document.querySelectorAll('.top-num');
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src.slice(0, 80),
        complete: img.complete,
        naturalWidth: img.naturalWidth
      }));
      const hero = document.querySelector('header') || document.querySelector('section');
      const h1 = document.querySelector('h1')?.innerText;

      return {
        title: document.title,
        h1: h1,
        topNumCount: topNums.length,
        topNumValues: Array.from(topNums).map(t => t.innerText),
        buttonsPreview: buttons.slice(0, 10),
        imagesCount: images.length,
        loadedImagesCount: images.filter(i => i.naturalWidth > 0).length,
        bodyLength: document.body.innerHTML.length
      };
    })()`,
    returnByValue: true
  });

  console.log('\n--- DOM Inspection Result ---');
  console.log(JSON.stringify(evalResult.result.value, null, 2));

  // Capture screenshot
  console.log('\nCapturing screenshot to vault_final_screenshot.png ...');
  const screenshotData = await send('Page.captureScreenshot', { format: 'png', quality: 90 });
  const buffer = Buffer.from(screenshotData.data, 'base64');
  const outPath = 'd:\\apps\\FMR\\vault_final_screenshot.png';
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved final screenshot to ${outPath} (${buffer.length} bytes)`);

  ws.close();
  chromeProc.kill();
  console.log('Finished visual verification successfully.');
}

main().catch((err) => {
  console.error('Visual verification failed:', err);
  process.exit(1);
});
