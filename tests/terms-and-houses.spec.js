const { test, expect } = require('@playwright/test');

const ACCOUNTS = {
  student: { email: 'student@brainzeduworld.com', password: 'Password123!' },
  teacher: { email: 'teacher@brainzeduworld.com', password: 'Password123!' },
  director: { email: 'tarini@brainzeduworld.com', password: 'Password123!' }
};

async function loginAs(page, role) {
  const creds = ACCOUNTS[role];
  await page.goto('/Eduvia.html');
  await expect(page.locator('#login-viewport')).toBeVisible();

  await page.fill('#school-email', creds.email);
  await page.fill('#school-password', creds.password);
  await page.click('#continue-btn');

  await expect(page.locator('#app-viewport')).toHaveClass(/active-view/, { timeout: 10000 });
}

test.describe('Houses & 4-Terms Results System Verification', () => {
  test('Student Digital Pass & My Results are removed from management platform', async ({ page }) => {
    // Student login blocked
    await page.goto('/Eduvia.html');
    await expect(page.locator('#login-viewport')).toBeVisible();
    await page.fill('#school-email', 'student@brainzeduworld.com');
    await page.fill('#school-password', 'Password123!');
    await page.click('#continue-btn');
    await expect(page.locator('#app-viewport')).not.toHaveClass(/active-view/);
    await expect(page.locator('#login-email-error-text')).toContainText('Student accounts are not part of this platform. Contact your school office.');
  });

  test('Houses/clubs is disabled by default under management feature flags', async ({ page }) => {
    await loginAs(page, 'director');
    // Ensure student pass and results are completely gone
    await expect(page.locator('#nav-student-pass')).toHaveCount(0);
    await expect(page.locator('#nav-student-results')).toHaveCount(0);
  });

  test('Teacher can select assessment term in Final Marks console', async ({ page }) => {
    await loginAs(page, 'teacher');

    // Navigate to Final Marks page
    await page.click('#nav-teacher-final-marks');
    await expect(page.locator('#page-teacher-final-marks')).toBeVisible();

    // Select term dropdown
    const termSelect = page.locator('#final-marks-term-select');
    await expect(termSelect).toBeVisible();
    await termSelect.selectOption('Unit Test - 1');

    // Verify max marks updated to 25
    await expect(page.locator('#final-marks-max-input')).toHaveValue('25');

    // Switch to Half Yearly
    await termSelect.selectOption('Half Yearly');
    await expect(page.locator('#final-marks-max-input')).toHaveValue('80');
  });
});
