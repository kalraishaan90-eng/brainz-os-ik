const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add student to DEMO_PROFILES
const oldDemo = `const DEMO_PROFILES = {
  teacher: {`;

const newDemo = `const DEMO_PROFILES = {
  student: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Student Scholar',
    email: \`student@\${SCHOOL_SETTINGS.email_domain}\`,
    role: 'student',
    role_confirmed: true,
    status: 'active',
    roleLabel: 'Class XII-B Scholar',
    initials: 'SS',
    class_section: 'XII-B',
    grade: 'Grade 12'
  },
  teacher: {`;

content = content.replace(oldDemo, newDemo);

// 2. Fix suggestRoleFromEmail
content = content.replace(
  /if \(\/\^\[a-z\]\{2\}\[0-9\]\+\$\/\.test\(localPart\) \|\| \/\^\(student\|pupil\)\(\[\._-\]\|\$\)\/i\.test\(localPart\)\) return 'student-pattern';/,
  "if (/^[a-z]{2}[0-9]+$/.test(localPart) || /^(student|pupil)([._-]|$)/i.test(localPart)) return 'student';"
);

// 3. Remove student-pattern blocks from handleEmailInput
content = content.replace(
  /if \(suggestRoleFromEmail\(cleanEmail\) === 'student-pattern'\) \{[\s\S]*?return;\s*\}/,
  ''
);

// 4. In handleEmailInput, handle 'student' in live role detector
content = content.replace(
  /\} else if \(suggested === 'teacher'\) \{/,
  `} else if (suggested === 'student') {
      detector.style.borderColor = 'rgba(106, 142, 174, 0.4)';
      detector.style.background = 'rgba(106, 142, 174, 0.08)';
      if (detectorIcon) { detectorIcon.style.color = 'var(--color-blue)'; detectorIcon.setAttribute('data-lucide', 'graduation-cap'); }
      detectorText.innerHTML = '<strong style="color: var(--color-blue);">Detected Role:</strong> Student Scholar';
    } else if (suggested === 'teacher') {`
);

// 5. Remove student-pattern checks from handleLoginSubmit and handleOfflineFallbackLogin
content = content.replace(
  /if \(suggestRoleFromEmail\(emailVal\) === 'student-pattern'\) \{[\s\S]*?return;\s*\}/,
  ''
);

content = content.replace(
  /if \(suggestRoleFromEmail\(cleanEmail\) === 'student-pattern'\) \{[\s\S]*?return;\s*\}/,
  ''
);

content = content.replace(
  /const suggested = suggestRoleFromEmail\(cleanEmail\);\s*role = suggested === 'director' \? 'director' : 'teacher';/,
  `const suggested = suggestRoleFromEmail(cleanEmail);
    role = suggested || 'teacher';`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully restored student authentication in Eduvia.html');
