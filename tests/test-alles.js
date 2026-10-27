/*
 * Automatische test: speelt elk level met de voorbeeldoplossing in een headless browser.
 *
 * Gebruik (Node.js + Playwright nodig):
 *   npm install playwright      (eenmalig, + npx playwright install chromium)
 *   node tests/test-alles.js            -> test alle levels
 *   node tests/test-alles.js --shots    -> maakt ook screenshots in tests/screenshots/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.argv.includes('--shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (SHOTS) fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, 'screenshots', name + '.png') }); };
  let fails = 0;

  // ---------- Deel 1: Grot ----------
  const cave = require('./oplossingen-grot.js');
  await page.goto(base + 'grot.html');
  await page.evaluate(() => { localStorage.clear(); document.getElementById('speed').value = 5; });
  for (const id of await page.evaluate(() => caveTest.levels)) {
    await page.evaluate(i => caveTest.open(i), id);
    await page.evaluate(c => caveTest.setCode(c), cave[id]);
    const r = await page.evaluate(() => caveTest.run());
    const ok = /success/.test(r.message) && /Bonus ook gehaald/.test(r.text);
    if (!ok) fails++;
    console.log((ok ? 'OK   ' : 'FOUT ') + 'grot ' + id + '  ' + r.text.replace(/\s+/g, ' ').slice(0, 100));
    await page.evaluate(() => UI.closeModal());
    await shot('grot-' + id);
  }

  // ---------- Deel 2: micro:bit ----------
  const mb = require('./oplossingen-microbit.js');
  await page.goto(base + 'microbit.html');
  await page.evaluate(() => localStorage.clear());
  for (const id of await page.evaluate(() => mbTest.levels)) {
    if (!mb[id]) continue;
    await page.evaluate(i => mbTest.open(i), id);
    await page.evaluate(c => mbTest.setCode(c), mb[id]);
    const r = await page.evaluate(() => mbTest.check());
    const ok = /success/.test(r.cls);
    if (!ok) fails++;
    console.log((ok ? 'OK   ' : 'FOUT ') + 'microbit ' + id + '  ' + r.text.replace(/\s+/g, ' ').slice(0, 100));
    await page.evaluate(() => UI.closeModal());
    await shot('microbit-' + id);
  }

  // .hex-bestand maken
  const dl = page.waitForEvent('download');
  await page.evaluate(() => mbTest.hex());
  const file = await dl;
  const hexOk = /\.hex$/.test(file.suggestedFilename());
  console.log((hexOk ? 'OK   ' : 'FOUT ') + 'hex-download ' + file.suggestedFilename());
  if (!hexOk) fails++;

  if (errors.length) { fails++; console.log('Pagina-fouten:', errors); }
  await browser.close();
  srv.close();
  console.log(fails ? '\n' + fails + ' test(s) mislukt' : '\nAlle tests geslaagd ✔');
  process.exit(fails ? 1 : 0);
})();
