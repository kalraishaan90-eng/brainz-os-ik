const fs = require('fs');

['Campusly.html', 'BrainzOS.html'].forEach(fn => {
  if (!fs.existsSync(fn)) return;
  let c = fs.readFileSync(fn, 'utf8');

  // CSP & SRI
  const titleTag = '<title>' + fn.replace('.html','') + '</title>';
  const newCsp = titleTag + '\n  <meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' https:; style-src \'self\' \'unsafe-inline\' https:; img-src \'self\' data: https:; font-src \'self\' data: https:; connect-src \'self\' https: wss:; object-src \'none\'; base-uri \'none\'; form-action \'self\';" />\n  <meta name="referrer" content="no-referrer" />';
  c = c.replace(titleTag, newCsp);

  c = c.replace('<script src="vendor/lucide.min.js"></script>', '<script src="vendor/lucide.min.js" integrity="sha384-Hh7C333mXel+qppGoFs4qAOXp7h67eur4XsQVF2bvHAM3MQ4DX4cQI7oRCzb98J4" crossorigin="anonymous"></script>');
  c = c.replace('<script src="vendor/supabase.min.js"></script>', '<script src="vendor/supabase.min.js" integrity="sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF" crossorigin="anonymous"></script>');

  // sanitizeUrl helper
  c = c.replace(
    'function escapeHtml(str) {',
    'function escapeHtml(str) {\n  if (!str) return \'\';\n  return String(str)\n    .replace(/&/g, \'&amp;\')\n    .replace(/</g, \'&lt;\')\n    .replace(/>/g, \'&gt;\')\n    .replace(/"/g, \'&quot;\')\n    .replace(/\'/g, \'&#039;\');\n}\n\nfunction sanitizeUrl(url) {\n  if (!url || typeof url !== \'string\') return \'\';\n  const trimmed = url.trim();\n  if (trimmed.startsWith(\'https://\') || trimmed.startsWith(\'data:image/\') || trimmed.startsWith(\'/\') || trimmed.startsWith(\'./\')) {\n    return escapeHtml(trimmed);\n  }\n  return \'\';\n}\nfunction _oldEscapeHtml(str) {'
  );

  // 8 fixes
  c = c.replace('<option value="${o.code}">${escapeHtml(o.label)}</option>', '<option value="${escapeHtml(o.code)}">${escapeHtml(o.label)}</option>');
  c = c.replace('All Taught Sections (${teacherSections.join(\', \')})', 'All Taught Sections (${escapeHtml(teacherSections.join(\', \'))})');
  c = c.replace('<img src="${escapeHtml(student.avatar_url)}"', '<img src="${sanitizeUrl(student.avatar_url)}"');
  c = c.replace('<span id="sd-avatar-initials">${initials}</span>', '<span id="sd-avatar-initials">${escapeHtml(initials)}</span>');
  c = c.replace('Error loading progression map: ${err.message}', 'Error loading progression map: ${escapeHtml(err.message)}');
  c = c.replace('loading.innerHTML = `<p style="color:#9B3A3A;">Error: ${err.message}</p>`', 'loading.innerHTML = `<p style="color:#9B3A3A;">Error: ${escapeHtml(err.message)}</p>`');
  c = c.replace("final-marks-loading').innerHTML = `<p style=\"color:#9B3A3A;\">Error: ${err.message}</p>`", "final-marks-loading').innerHTML = `<p style=\"color:#9B3A3A;\">Error: ${escapeHtml(err.message)}</p>`");
  c = c.replace('Error loading results: ${err.message}', 'Error loading results: ${escapeHtml(err.message)}');
  c = c.replace('· ${dateStr}`', '· ${escapeHtml(dateStr)}`');

  fs.writeFileSync(fn, c);
  console.log('Successfully patched ' + fn);
});
