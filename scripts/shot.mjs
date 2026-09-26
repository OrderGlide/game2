// Screenshots of levels for checking the look: node scripts/shot.mjs <level> <out-dir> [views...]
// e.g. node scripts/shot.mjs 1 /tmp/shots w0 w1 w2 w3
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import fs from 'node:fs';

const [level = '1', out = 'shots', ...views] = process.argv.slice(2);
const dir = '/opt/pw-browsers';
const executablePath = process.env.CHROME_PATH ?? fs.readdirSync(dir).map((d) => `${dir}/${d}/chrome-linux/chrome`).find((p) => fs.existsSync(p));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ server: { port: 5198, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 600 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() !== 'log' && m.type() !== 'debug') console.log(m.type(), m.text()); });
await page.goto('http://127.0.0.1:5198/?test');
await page.waitForFunction(() => 'walkthrough' in window);
await page.evaluate((n) => { window.game.profile.current = null; return window.game.startLevel(n); }, Number(level));
await page.waitForTimeout(1500);
await page.evaluate(() => { for (let k = 0; k < 10 && document.querySelector('.modal-bg'); k++) window.game.hud.closeTop(); });
for (const v of views.length ? views : ['w0', 'w1', 'w2', 'w3']) {
  await page.evaluate((id) => window.game.rt.setView(id, true), v);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/L${level}_${v}.png` });
  console.log(`${out}/L${level}_${v}.png`);
}
await browser.close();
await server.close();
