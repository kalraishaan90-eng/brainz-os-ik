const { test, expect } = require('@playwright/test');

const ACCOUNTS = {
  teacher: { email: 'teacher@brainzeduworld.com', password: 'Password123!', roleLabel: 'Faculty' },
  director: { email: 'tarini@brainzeduworld.com', password: 'Password123!', roleLabel: 'Executive' }
};

test.describe('Eduvia Auth Smoke Test', () => {
  for (const [role, creds] of Object.entries(ACCOUNTS)) {
    test(`Login as ${role}`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('/Eduvia.html');
      await expect(page.locator('#login-viewport')).toBeVisible();

      await page.fill('#school-email', creds.email);
      await page.fill('#school-password', creds.password);
      await page.click('#continue-btn');

      // Expect transition to app-viewport
      await expect(page.locator('#app-viewport')).toHaveClass(/active-view/, { timeout: 10000 });

      // Verify role indicator or topbar
      const roleText = await page.locator('#topbar-user-role').textContent();
      expect(roleText).toContain(creds.roleLabel);

      // Verify page destination: tarini to Executive Board, teacher to Teacher's Portal
      if (role === 'director') {
        await expect(page.locator('#page-director-analytics')).toHaveClass(/active-page/);
      } else {
        await expect(page.locator('#page-teacher-overview')).toHaveClass(/active-page/);
      }

      // Verify no console errors
      expect(consoleErrors).toEqual([]);
    });
  }

  test('Non-brainzeduworld.com domain at login is cleanly blocked', async ({ page }) => {
    await page.goto('/Eduvia.html');
    await expect(page.locator('#login-viewport')).toBeVisible();

    await page.fill('#school-email', 'outsider@gmail.com');
    await page.fill('#school-password', 'Password123!');
    await page.click('#continue-btn');

    // App viewport must NOT be activated
    await expect(page.locator('#app-viewport')).not.toHaveClass(/active-view/);

    const errorText = await page.locator('#login-email-error-text').textContent();
    expect(errorText).toContain('@brainzeduworld.com');
  });

  test('Student-pattern email at login is cleanly blocked without session', async ({ page }) => {
    await page.goto('/Eduvia.html');
    await expect(page.locator('#login-viewport')).toBeVisible();

    await page.fill('#school-email', 'student@brainzeduworld.com');
    await page.fill('#school-password', 'Password123!');
    await page.click('#continue-btn');

    // App viewport must NOT be activated
    await expect(page.locator('#app-viewport')).not.toHaveClass(/active-view/);

    // Clean institutional message is displayed
    const errorText = await page.locator('#login-email-error-text').textContent();
    expect(errorText).toContain('Student accounts are not part of this platform. Contact your school office.');
  });
});
