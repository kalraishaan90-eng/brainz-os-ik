const fs = require('fs');
const path = require('path');

// 1. Update serve.js
const servePath = path.join(__dirname, 'serve.js');
let serveContent = fs.readFileSync(servePath, 'utf8');

if (!serveContent.includes('student_accounts_disabled')) {
  serveContent = serveContent.replace(
    /if \(email\) \{\s*const rawAllowed = \(DB\.app_config\?\.find/,
    `if ((email && /^(student|pupil|[a-z]{2}\\d+)/i.test(email.split('@')[0] || '')) || ['student', 'record'].includes(String(roleFromToken || '').toLowerCase())) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'student_accounts_disabled',
          error_description: 'Student accounts are not part of this platform. Contact your school office.',
          message: 'Student accounts are not part of this platform. Contact your school office.'
        }));
        return;
      }

      if (email) {
        const rawAllowed = (DB.app_config?.find`
  );
  fs.writeFileSync(servePath, serveContent, 'utf8');
  console.log('Updated serve.js with student check');
}

// 2. Update Eduvia.html
const htmlPath = path.join(__dirname, '..', 'Eduvia.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Ensure BRAND_DEFAULTS has allowed_domains
htmlContent = htmlContent.replace(
  /email_domain:\s*['"]brainzeduworld\.com['"],/,
  `email_domain: 'brainzeduworld.com',\n  allowed_domains: ['brainzeduworld.com', 'brainz.edu'],`
);

// Ensure handleEmailInput flags student-pattern
if (!htmlContent.includes("showLoginError('Student accounts are not part of this platform.")) {
  htmlContent = htmlContent.replace(
    /const domain = cleanEmail\.split\('@'\)\[1\] \|\| '';/,
    `const domain = cleanEmail.split('@')[1] || '';
  const localPart = cleanEmail.split('@')[0] || '';
  if (/^[a-z]{2}[0-9]+$/.test(localPart) || /^(student|pupil)([._-]|$)/i.test(localPart)) {
    showLoginError('Student accounts are not part of this platform. Contact your school office.');
    if (detector) detector.style.display = 'none';
    validateFormInputs();
    return;
  }`
  );

  htmlContent = htmlContent.replace(
    /if \(!emailDomainAllowed\(emailVal\)\) \{[\s\S]*?return;\s*\}/,
    `if (!emailDomainAllowed(emailVal)) {
    showLoginError(\`This email domain is not allowed. Allowed domain(s): \${configuredAllowedDomains().join(', ')}\`);
    return;
  }
  const local = emailVal.split('@')[0] || '';
  if (/^[a-z]{2}[0-9]+$/.test(local) || /^(student|pupil)([._-]|$)/i.test(local)) {
    showLoginError('Student accounts are not part of this platform. Contact your school office.');
    return;
  }`
  );
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Updated Eduvia.html and BRAND_DEFAULTS');
