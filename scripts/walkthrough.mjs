// Automated test: starts the game in a headless browser and plays every room with its scripted solution,
// checking that each room can be escaped and that all hint steps get completed along the way.
// Run: npm test   (needs Chromium: `npx playwright install chromium` or set CHROME_PATH)
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
const count = await page.evaluate(() => window.game.rooms.length);
let failed = false;
for (let i = 0; i < count; i++) {
  try {
    const id = await page.evaluate((n) => window.walkthrough(n), i);
    console.log(`✔ room ${i + 1}: ${id}`);
  } catch (e) {
    failed = true;
    console.log(`✘ room ${i + 1}: ${e.message.split('\n')[0]}`);
  }
  await page.evaluate(() => { for (let k = 0; k < 10 && document.querySelector('.modal-bg'); k++) window.game.hud.closeTop(); });
}
if (errors.length) { failed = true; console.log('Browser errors:\n' + errors.join('\n')); }
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
