import 'dotenv/config';
import { chromium } from 'playwright';

export async function runAutomation() {
  const startTime = Date.now();
  const logs = [];

  const user = process.env.ALMARE_USER;
  const pass = process.env.ALMARE_PASS;

  if (!user || !pass) {
    throw new Error('Missing ALMARE_USER or ALMARE_PASS');
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors' // 🔥 KEY FIX
    ]
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true // 🔥 KEY FIX
  });

  const page = await context.newPage();

  try {
    /* =========================
       1. CONNECTIVITY CHECK
    ========================== */
    logs.push('Checking base site connectivity (TLS relaxed)');

    await page.goto('https://www.almarellc.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    logs.push('Base site reachable');

    /* =========================
       2. LOGIN PAGE
    ========================== */
    logs.push('Navigating to login page');

    await page.goto('https://www.almarellc.com/web/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    logs.push('Login page loaded');

    /* =========================
       3. FRAME DISCOVERY
    ========================== */
    logs.push('Scanning frames for login form');

    let loginFrame = null;
    const frames = page.frames();

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      logs.push(`Checking frame ${i}: ${frame.url()}`);

      let inputs = [];
      try {
        inputs = await frame.$$(
          'input[type="text"], input[type="email"], input[type="password"]'
        );
      } catch {
        logs.push(`Frame ${i} inaccessible`);
        continue;
      }

      if (Array.isArray(inputs) && inputs.length >= 2) {
        loginFrame = frame;
        logs.push(`Login frame detected at index ${i}`);
        break;
      }
    }

    if (!loginFrame) {
      throw new Error('Login frame not found');
    }

    logs.push('Login frame detected successfully');
    logs.push('Stopping here for controlled test');

    return {
      success: true,
      durationMs: Date.now() - startTime,
      logs
    };

  } catch (error) {
    logs.push(`ERROR: ${error.message}`);
    error.logs = logs;
    await browser.close();
    throw error;
  }
}
