require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { chromium } = require('playwright');

(async () => {
  const start = Date.now();
  let status = 'success';
  let error = null;

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      acceptDownloads: true
    });
    const page = await context.newPage();

    //  LOGIN
    await page.goto('https://alliance-management-resources.odoo.com/', { waitUntil: 'networkidle' });

    await page.goto('https://www.almarellc.com/', { waitUntil: 'domcontentloaded' });

// Wait for any input to appear
await page.waitForSelector('input', { timeout: 30000 });

// Find ALL inputs on the page
const inputs = await page.$$('input');

if (inputs.length < 2) {
  throw new Error('Login inputs not found');
}

// Fill first visible text/email input
for (const input of inputs) {
  const type = await input.getAttribute('type');
  if (type === 'text' || type === 'email') {
    await input.fill(process.env.ALMARE_USERNAME);
    break;
  }
}

// Fill password input
for (const input of inputs) {
  const type = await input.getAttribute('type');
  if (type === 'password') {
    await input.fill(process.env.ALMARE_PASSWORD);
    break;
  }
}

// Click submit button
await page.click('button');

// Wait for navigation after login
await page.waitForLoadState('networkidle');

    await page.click('button[type="submit"]');

    a

    console.log(' Logged in');

    //  NAVIGATE TO EXCEL PAGE
  
    await page.goto('https://alliance-management-resources.odoo.com/my', {
      waitUntil: 'networkidle'
    });

    //  DOWNLOAD EXCEL
    const downloadPromise = page.waitForEvent('download');

   
    await page.click('text=Download Excel')

    const download = await downloadPromise;
    const filePath = path.join('downloads', download.suggestedFilename());

    await download.saveAs(filePath);

    console.log(`📥 Excel downloaded: ${filePath}`);

    // READ EXCEL
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    const rows = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      rows.push(row.values.slice(1));
    });

    //  SAVE DATA
    fs.writeFileSync(
      'excel-data.json',
      JSON.stringify(rows, null, 2)
    );

    console.log('📊 Excel parsed and saved');

    await browser.close();
  } catch (err) {
    status = 'failed';
    error = err.message;
    console.error('❌ Error:', err.message);
  }

  // LOG EXECUTION
  const log = {
    timestamp: new Date().toISOString(),
    status,
    duration_ms: Date.now() - start,
    error
  };

  const logs = fs.existsSync('logs.json')
    ? JSON.parse(fs.readFileSync('logs.json'))
    : [];

  logs.push(log);
  fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));
})();
