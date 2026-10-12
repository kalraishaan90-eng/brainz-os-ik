const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://127.0.0.1:8080/Eduvia.html');
  await page.waitForSelector('#login-viewport');

  await page.fill('#school-email', 'teacher@brainz.edu');
  await page.fill('#school-password', 'Password123!');
  
  console.log('Filled credentials. Checking button state...');
  const isBtnDisabled = await page.locator('#continue-btn').isDisabled();
  console.log('Button disabled?', isBtnDisabled);

  await page.click('#continue-btn');
  console.log('Clicked #continue-btn');

  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    const errText = await page.locator('#login-email-error-text').textContent().catch(() => '');
    const isErrVisible = await page.locator('#login-email-error').isVisible().catch(() => false);
    const appClass = await page.locator('#app-viewport').getAttribute('class').catch(() => '');
    console.log(`[t=${i+1}s] app-viewport class: "${appClass}", errorVisible: ${isErrVisible}, errorText: "${errText}"`);
  }

  await browser.close();
  process.exit(0);
})();
