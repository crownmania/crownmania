// Interactive probe: opens a visible browser; USER performs Google login
// while we capture console/network/errors from the page AND all popups.
// Logs stream to /tmp/interactive-probe.log
const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'https://www.crownmania.com/mintNFT?id=e2213dae55354d3284e773f639f86d8e&type=1';
const LOG = '/tmp/interactive-probe.log';
const DURATION_MS = 4 * 60 * 1000; // 4 minutes for user to complete login

fs.writeFileSync(LOG, `--- probe started ${new Date().toISOString()} ---\n`);
const log = (line) => {
  const entry = `[${new Date().toISOString().slice(11, 19)}] ${line}\n`;
  fs.appendFileSync(LOG, entry);
};

const SKIP = ['mm-sdk-analytics', 'demo-project', 'React Router', 'hcaptcha.com/logo'];
const skip = (t) => SKIP.some((s) => String(t).includes(s));

function wirePage(page, label) {
  page.on('console', (msg) => { if (!skip(msg.text())) log(`${label} console.${msg.type()}: ${msg.text().slice(0, 500)}`); });
  page.on('pageerror', (err) => log(`${label} PAGEERROR: ${String(err).slice(0, 600)}`));
  page.on('requestfailed', (req) => { if (!skip(req.url())) log(`${label} REQFAIL: ${req.url().slice(0, 180)} :: ${req.failure()?.errorText}`); });
  page.on('response', (res) => { if (res.status() >= 400 && !skip(res.url())) log(`${label} HTTP ${res.status()}: ${res.url().slice(0, 220)}`); });
  page.on('framenavigated', (fr) => { if (fr === page.mainFrame()) log(`${label} NAVIGATED: ${fr.url().slice(0, 180)}`); });
  page.on('close', () => log(`${label} CLOSED`));
}

(async () => {
  const browser = await chromium.launch({ headless: false, channel: undefined });
  const context = await browser.newContext();
  const page = await context.newPage();
  wirePage(page, '[MAIN]');

  context.on('page', (popup) => {
    log(`POPUP OPENED: ${popup.url().slice(0, 180)}`);
    wirePage(popup, '[POPUP]');
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  log('Page loaded. USER: please click Unlock -> Google and sign in now.');
  console.log('\n>>> Browser window is open. Complete the Google login there.');
  console.log(`>>> Recording everything to ${LOG} for ${DURATION_MS / 60000} minutes...\n`);

  const start = Date.now();
  while (Date.now() - start < DURATION_MS) {
    await new Promise((r) => setTimeout(r, 5000));
    if (page.isClosed()) { log('Main page closed by user; stopping.'); break; }
    // Periodic state snapshot
    try {
      const state = await page.evaluate(() => ({
        modal: !!document.querySelector('[class*="w3a"]'),
        bodySnippet: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
      }));
      log(`STATE: modal=${state.modal} text="${state.bodySnippet}"`);
    } catch { /* page busy/navigating */ }
  }

  try { await page.screenshot({ path: '/tmp/interactive-probe-final.png' }); } catch {}
  log('--- probe finished ---');
  await browser.close();
})().catch((e) => { log(`PROBE CRASH: ${e.message}`); process.exit(1); });
