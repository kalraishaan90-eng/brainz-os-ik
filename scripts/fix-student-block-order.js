const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. In handlePasswordInput, preserve student error
content = content.replace(
  /function handlePasswordInput\(val\) \{\s*clearLoginError\(\);\s*validateFormInputs\(\);\s*\}/,
  `function handlePasswordInput(val) {
  const errText = document.getElementById('login-email-error-text');
  if (!errText || !errText.textContent.includes('Student accounts')) {
    clearLoginError();
  }
  validateFormInputs();
}`
);

// 2. In handleEmailInput, check student pattern at the very beginning
content = content.replace(
  /function handleEmailInput\(val\) \{[\s\S]*?const cleanEmail = email\.toLowerCase\(\);/,
  `function handleEmailInput(val) {
  clearLoginError();
  const email = (val || '').trim();
  const detector = document.getElementById('live-role-detector');
  const detectorText = document.getElementById('live-role-detector-text');
  const detectorIcon = document.getElementById('live-role-detector-icon');

  if (!email || !email.includes('@')) {
    if (detector) detector.style.display = 'none';
    validateFormInputs();
    return;
  }

  const cleanEmail = email.toLowerCase();
  const local = cleanEmail.split('@')[0] || '';
  if (/^[a-z]{2}[0-9]+$/.test(local) || /^(student|pupil|scholar)([._-]|$)/i.test(local) || cleanEmail.startsWith('student')) {
    showLoginError('Student accounts are not part of this platform. Contact your school office.');
    if (detector) detector.style.display = 'none';
    validateFormInputs();
    return;
  }`
);

// 3. In handleLoginSubmit, check student pattern before anything else
content = content.replace(
  /if \(!emailVal\) \{\s*showLoginError\('Please enter your school email address\.'\);\s*return;\s*\}[\s\S]*?if \(!emailDomainAllowed\(emailVal\)\)/,
  `if (!emailVal) {
    showLoginError('Please enter your school email address.');
    return;
  }
  const localSubmit = emailVal.split('@')[0] || '';
  if (/^[a-z]{2}[0-9]+$/.test(localSubmit) || /^(student|pupil|scholar)([._-]|$)/i.test(localSubmit) || emailVal.startsWith('student')) {
    showLoginError('Student accounts are not part of this platform. Contact your school office.');
    return;
  }
  await refreshAllowedSchoolDomains();
  if (!emailDomainAllowed(emailVal))`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated student blocking check in Eduvia.html');
