const { test, expect, chromium } = require('@playwright/test');

test('Cross-tab test schedule rollup and audience-separated broadcasts', async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Create Teacher Context
  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  await teacherPage.goto('http://127.0.0.1:8080/Eduvia.html');
  await teacherPage.fill('#school-email', 'teacher@brainzeduworld.com');
  await teacherPage.fill('#school-password', 'Password123!');
  await teacherPage.click('#continue-btn');
  await expect(teacherPage.locator('#app-viewport')).toHaveClass(/active-view/, { timeout: 10000 });
  await teacherPage.click('#nav-teacher-test-schedule');
  await expect(teacherPage.locator('#page-teacher-test-schedule')).toHaveClass(/active-page/);

  // 2. Create Director Context
  const directorContext = await browser.newContext();
  const directorPage = await directorContext.newPage();
  await directorPage.goto('http://127.0.0.1:8080/Eduvia.html');
  await directorPage.fill('#school-email', 'tarini@brainzeduworld.com');
  await directorPage.fill('#school-password', 'Password123!');
  await directorPage.click('#continue-btn');
  await expect(directorPage.locator('#app-viewport')).toHaveClass(/active-view/, { timeout: 10000 });
  await directorPage.click('#nav-director-planner');
  await expect(directorPage.locator('#page-director-planner')).toHaveClass(/active-page/);

  // 3. Attempt Student Context (Verify cleanly blocked)
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await studentPage.goto('http://127.0.0.1:8080/Eduvia.html');
  await studentPage.fill('#school-email', 'student@brainzeduworld.com');
  await studentPage.fill('#school-password', 'Password123!');
  await studentPage.click('#continue-btn');
  await expect(studentPage.locator('#app-viewport')).not.toHaveClass(/active-view/);
  await expect(studentPage.locator('#login-email-error-text')).toContainText('Student accounts are not part of this platform. Contact your school office.');
  console.log('✓ Student login cleanly blocked');

  console.log('--- Step 1: Teacher schedules an upcoming test ---');
  await teacherPage.fill('#teacher-page-test-topic', 'Judicial Review & Federal Structure');
  await teacherPage.fill('#teacher-page-test-date', '2026-10-18');
  await teacherPage.click('#teacher-test-submit-btn');

  // Verify test appears in Teacher test schedule page
  await expect(teacherPage.locator('#teacher-test-schedule-page-tbody')).toContainText('Judicial Review & Federal Structure', { timeout: 10000 });
  console.log('✓ Teacher view confirmed test added');

  console.log('--- Step 2: Director Curriculum & Test Rollup receives the test in real time ---');
  await expect(directorPage.locator('#director-planner-tests-tbody')).toContainText('Judicial Review & Federal Structure', { timeout: 10000 });
  console.log('✓ Director Planner confirmed test received');

  console.log('--- Step 3: Director publishes "Teachers Only" announcement ---');
  await directorPage.click('#nav-director-feed');
  await expect(directorPage.locator('#page-director-feed')).toHaveClass(/active-page/);
  await directorPage.evaluate(() => {
    openNewNoticeModal();
    document.getElementById('notice-audience').value = 'Teachers Only';
    document.getElementById('notice-headline').value = 'Staff Moderation Submission Deadline';
    document.getElementById('notice-body').value = 'Please submit all internal marks spreadsheets by Thursday noon.';
    submitNewNotice();
  });

  // Verify Teacher Broadcasts receives notice
  await teacherPage.click('#nav-teacher-broadcasts');
  await expect(teacherPage.locator('#page-teacher-broadcasts')).toHaveClass(/active-page/);
  await expect(teacherPage.locator('#announcements-feed-container')).toContainText('Staff Moderation Submission Deadline', { timeout: 10000 });
  console.log('✓ Teacher Broadcasts received Teachers Only announcement');

  console.log('--- Step 4: Director publishes "Whole School" announcement ---');
  await directorPage.evaluate(() => {
    openNewNoticeModal();
    document.getElementById('notice-audience').value = 'Whole School';
    document.getElementById('notice-headline').value = 'Annual Sports Day Date Finalized';
    document.getElementById('notice-body').value = 'Track and field events scheduled for next Saturday.';
    submitNewNotice();
  });

  // Teacher should receive Whole School notice
  await expect(teacherPage.locator('#announcements-feed-container')).toContainText('Annual Sports Day Date Finalized', { timeout: 10000 });
  console.log('✓ Teacher received Whole School announcement');

  console.log('ALL CROSS-TAB & FULL-STACK CONNECTIVITY CHECKS PASSED!');
  await browser.close();
});
