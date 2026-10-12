const cp = require('child_process');
try {
  const res = cp.execSync('npx playwright test tests/smoke.spec.js -g "Login as teacher"', { encoding: 'utf8' });
  console.log('SUCCESS:', res);
} catch (e) {
  console.log('OUTPUT:', e.stdout);
  console.error('STDERR:', e.stderr);
}
