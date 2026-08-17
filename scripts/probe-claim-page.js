// Headless probe: load claim page, click Unlock, capture console/network/errors
const { chromium } = require('playwright');

const URL = 'https://www.crownmania.com/mintNFT?id=e2213dae55354d3284e773f639f86d8e&type=1';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];

  page.on('console', (msg) => {
    const t = msg.text();
    // Skip noisy repeats
    if (t.includes('demo-project') || t.includes('mm-sdk-analytics') || t.includes('React Router')) return;
    logs.push(`[console.${msg.type()}] ${t.slice(0, 400)}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${String(err).slice(0, 400)}`));
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (u.includes('mm-sdk-analytics') || u.includes('demo-project')) return;
    logs.push(`[reqfail] ${u.slice(0, 160)} :: ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('demo-project')) {
      logs.push(`[http ${res.status()}] ${res.url().slice(0, 200)}`);
    }
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Find and click the Unlock button
  const unlockBtn = page.locator('button', { hasText: /unlock/i }).first();
  if (await unlockBtn.count()) {
    logs.push('--- CLICKING UNLOCK ---');
    await unlockBtn.click();
    await page.waitForTimeout(8000);
    // Describe what's visible now (modal state)
    const modalText = await page.evaluate(() => {
      const w3a = document.querySelector('[class*="w3a"]');
      return w3a ? w3a.innerText.slice(0, 500) : '(no w3a modal element found)';
    });
    logs.push(`--- MODAL STATE ---\n${modalText}`);
  } else {
    logs.push('--- NO UNLOCK BUTTON FOUND ---');
    logs.push(await page.evaluate(() => document.body.innerText.slice(0, 800)));
  }

  await page.screenshot({ path: '/tmp/claim-probe.png', fullPage: false });
  console.log(logs.join('\n'));
  await browser.close();
})().catch((e) => { console.error('PROBE ERROR:', e.message); process.exit(1); });
