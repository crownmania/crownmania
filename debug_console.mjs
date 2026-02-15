import puppeteer from 'puppeteer';

const SERIAL = '13fd793a2b994525946a4050ae017978';
const URL = 'http://localhost:5173';

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Capture ALL console messages
    const logs = [];
    page.on('console', msg => {
        const type = msg.type().toUpperCase();
        const text = msg.text();
        logs.push(`[${type}] ${text}`);
    });

    // Capture page errors
    page.on('pageerror', err => {
        logs.push(`[PAGE_ERROR] ${err.message}`);
    });

    // Capture failed requests
    page.on('requestfailed', req => {
        logs.push(`[REQ_FAILED] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    });

    console.log(`Navigating to ${URL}...`);
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded. Waiting 3s for initialization...');
    await new Promise(r => setTimeout(r, 3000));

    // Print initial console logs
    console.log('\n========== INITIAL CONSOLE LOGS ==========');
    logs.forEach(l => console.log(l));
    console.log(`========== (${logs.length} entries) ==========\n`);

    // Find the serial input field
    console.log('Looking for serial number input...');

    // Try multiple selectors
    const inputSelectors = [
        'input[placeholder*="serial" i]',
        'input[placeholder*="code" i]',
        'input[placeholder*="verify" i]',
        'input[placeholder*="enter" i]',
        'input[type="text"]',
    ];

    let input = null;
    for (const sel of inputSelectors) {
        const els = await page.$$(sel);
        if (els.length > 0) {
            // Find one that's visible
            for (const el of els) {
                const visible = await el.isIntersectingViewport();
                if (visible) {
                    input = el;
                    console.log(`Found visible input with selector: ${sel}`);
                    break;
                }
            }
            if (!input) {
                input = els[0]; // fallback to first even if not visible
                console.log(`Found input (possibly not visible) with selector: ${sel}`);
            }
            if (input) break;
        }
    }

    if (!input) {
        // Scroll down to find the vault
        console.log('No input found yet, scrolling down...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.7));
        await new Promise(r => setTimeout(r, 2000));

        for (const sel of inputSelectors) {
            input = await page.$(sel);
            if (input) {
                console.log(`Found input after scroll with selector: ${sel}`);
                break;
            }
        }
    }

    if (!input) {
        console.log('ERROR: Could not find serial input field!');
        // Get all inputs on the page for debugging
        const allInputs = await page.$$eval('input', inputs =>
            inputs.map(i => ({ type: i.type, placeholder: i.placeholder, id: i.id, name: i.name, className: i.className }))
        );
        console.log('All inputs on page:', JSON.stringify(allInputs, null, 2));
        await browser.close();
        process.exit(1);
    }

    // Type the serial number
    console.log(`Typing serial: ${SERIAL}`);
    await input.click({ clickCount: 3 }); // select all
    await input.type(SERIAL, { delay: 20 });
    await new Promise(r => setTimeout(r, 500));

    // Find and click the verify button
    console.log('Looking for verify button...');
    const buttonSelectors = [
        'button:has-text("Verify")',
        'button:has-text("Authenticate")',
        'button:has-text("Submit")',
    ];

    let button = null;
    // Use page.evaluate to find buttons by text content
    button = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => {
            const text = b.textContent.toLowerCase();
            return text.includes('verify') || text.includes('authenticate') || text.includes('submit');
        });
    });

    const buttonIsNull = await page.evaluate(b => b === null || b === undefined, button);

    if (buttonIsNull) {
        console.log('ERROR: Could not find verify button!');
        const allButtons = await page.$$eval('button', btns =>
            btns.map(b => ({ text: b.textContent.trim().substring(0, 50), id: b.id, className: b.className }))
        );
        console.log('All buttons on page:', JSON.stringify(allButtons, null, 2));
        await browser.close();
        process.exit(1);
    }

    console.log('Clicking verify button...');
    const preClickLogCount = logs.length;
    await button.asElement().click();

    // Wait for the response
    console.log('Waiting 8s for verification response...');
    await new Promise(r => setTimeout(r, 8000));

    // Print NEW console logs (after click)
    console.log('\n========== POST-VERIFY CONSOLE LOGS ==========');
    logs.slice(preClickLogCount).forEach(l => console.log(l));
    console.log(`========== (${logs.length - preClickLogCount} new entries) ==========\n`);

    // Check for verification result on the page
    const pageText = await page.evaluate(() => document.body.innerText);
    const resultLines = pageText.split('\n').filter(l =>
        l.toLowerCase().includes('verif') ||
        l.toLowerCase().includes('success') ||
        l.toLowerCase().includes('error') ||
        l.toLowerCase().includes('failed') ||
        l.toLowerCase().includes('product')
    );

    console.log('========== VERIFICATION RESULT TEXT ==========');
    resultLines.forEach(l => console.log(l));
    console.log('===============================================\n');

    // Print ALL console logs summary
    console.log('========== ALL ERRORS/WARNINGS ==========');
    logs.filter(l => l.startsWith('[ERROR]') || l.startsWith('[WARNING]') || l.startsWith('[REQ_FAILED]') || l.startsWith('[PAGE_ERROR]'))
        .forEach(l => console.log(l));
    console.log('==========================================');

    await browser.close();
    console.log('\nDone!');
})();
