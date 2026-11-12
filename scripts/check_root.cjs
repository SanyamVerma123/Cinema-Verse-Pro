async function checkRoot() {
  const r = await fetch('http://127.0.0.1:3000/');
  const t = await r.text();
  const m = t.match(/<title>(.*?)<\/title>/);
  console.log('Root HTML title:', m ? m[1] : 'none');
  console.log('Root contains CinePulse or CinemaVerse:', t.includes('CinePulse') || t.includes('CinemaVerse'));
  console.log('Root contains id="root" (Vite app):', t.includes('id="root"'));
  console.log('Root contains Frame logo:', t.includes('Frame'));
}
checkRoot();
