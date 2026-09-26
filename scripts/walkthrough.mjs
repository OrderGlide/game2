// Automated test: starts the game in a headless browser and plays every level with its generated solution,
// checking that each room can be escaped and that all hint steps get completed along the way.
// Run: npm test            (all 100 levels; needs Chromium: `npx playwright install chromium` or set CHROME_PATH)
//      LEVELS=1-10 npm test (a range)
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import fs from 'node:fs';

const candidates = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
let executablePath;
for (const c of candidates) {
  if (!fs.existsSync(c)) continue;
  if (fs.statSync(c).isDirectory()) {
    const found = fs.readdirSync(c).map((d) => `${c}/${d}/chrome-linux/chrome`).find((p) => fs.existsSync(p));
    if (found) { executablePath = found; break; }
  } else { executablePath = c; break; }
}

const server = await createServer({ server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:5199/?test');
await page.waitForFunction(() => 'walkthrough' in window);
const count = await page.evaluate(() => window.game.levels);
const [from, to] = (process.env.LEVELS ?? `1-${count}`).split('-').map(Number);
let failed = false;
let ok = 0;
for (let n = from; n <= (to || from); n++) {
  try {
    const id = await page.evaluate((k) => window.walkthrough(k), n);
    ok++;
    console.log(`✔ ${id}`);
  } catch (e) {
    failed = true;
    console.log(`✘ level ${n}: ${e.message.split('\n')[0]}`);
  }
  await page.evaluate(() => { for (let k = 0; k < 10 && document.querySelector('.modal-bg'); k++) window.game.hud.closeTop(); });
}
console.log(`${ok}/${(to || from) - from + 1} levels escaped`);
if (errors.length) { failed = true; console.log('Browser errors:\n' + errors.join('\n')); }
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
