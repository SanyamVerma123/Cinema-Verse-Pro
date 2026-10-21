const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\temp\\chrome-cdp-profile',
    '--window-size=1366,768',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  try {
    // Wait for Chrome CDP to be available
    let versionData = null;
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch('http://localhost:9222/json/list');
        const list = await res.json();
        if (list && list.length > 0) {
          versionData = list[0];
          break;
        }
      } catch (e) {}
      await sleep(500);
    }

    if (!versionData) {
      console.error('Could not connect to Chrome CDP');
      return;
    }

    const wsUrl = versionData.webSocketDebuggerUrl;
    console.log('Connected to WS:', wsUrl);

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };

    await new Promise(r => ws.onopen = r);

    function sendCommand(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve) => {
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Wait for page to finish initial load
    await sleep(2500);

    // Trigger openPlayer for Stranger Things or catalog item
    const openRes = await sendCommand('Runtime.evaluate', {
      expression: `(function() {
        const item = currentCatalog.find(x => x.title.toLowerCase().includes('stranger')) || currentCatalog[0];
        openPlayer(item, 1, 1);
        return item.title;
      })()`,
      returnByValue: true
    });
    console.log('Opened player for:', openRes.result?.value);

    // Wait for player overlay to render
    await sleep(2000);

    // Capture screenshot
    const shot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.result.data, 'base64');
    
    const outPath = 'C:\\temp\\player_zero_overlap.png';
    fs.writeFileSync(outPath, buf);
    console.log('Screenshot saved to:', outPath);

    // Also copy to artifacts
    const artPath = 'C:\\Users\\Hermes\\.gemini\\antigravity\\brain\\a1e9e2ea-04c0-4a36-8410-1fce29063be6\\player_zero_overlap.png';
    fs.writeFileSync(artPath, buf);
    console.log('Artifact saved to:', artPath);

    ws.close();
  } finally {
    chrome.kill();
  }
}

capture().then(() => console.log('Done')).catch(console.error);
