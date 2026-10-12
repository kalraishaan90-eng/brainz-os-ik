const fs = require('fs');

['Eduvia.html', 'Campusly.html', 'BrainzOS.html'].forEach(fn => {
  if (!fs.existsSync(fn)) return;
  let c = fs.readFileSync(fn, 'utf8');

  // Redact session email PII
  c = c.replace(
    "console.log('Active Supabase session detected for:', session.user.email);",
    "console.log('Active Supabase session detected.');"
  );

  // Clear temporary password on dismiss
  c = c.replace(
    `function dismissTeacherSuccess() {
  const succBox = document.getElementById('add-teacher-success');
  if (succBox) succBox.style.display = 'none';
}`,
    `function dismissTeacherSuccess() {
  const succBox = document.getElementById('add-teacher-success');
  if (succBox) succBox.style.display = 'none';
  const sPwd = document.getElementById('success-teacher-pwd');
  if (sPwd) sPwd.textContent = '';
}`
  );

  fs.writeFileSync(fn, c);
  console.log('Updated ' + fn);
});
