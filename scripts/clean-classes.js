const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove teacher-asg-filter-xia
content = content.replace(
  '<button class="btn-secondary asg-filter-pill" id="teacher-asg-filter-xia" onclick="filterTeacherAssignments(getDefaultSectionCode(), this)">XI-A Commerce (<span id="t-asg-count-xia">0</span>)</button>',
  ''
);

// 2. Remove options
content = content.replace('<option value="XI-A Commerce">XI-A Commerce Only</option>', '');
content = content.replaceAll('<option value=getDefaultSectionCode()>Class XI-A</option>', '');
content = content.replaceAll('<option value=getDefaultSectionCode()>Class XII-A</option>', '');
content = content.replaceAll('<option value=getDefaultSectionCode()>Class XII-B (Commerce)</option>', '');
content = content.replaceAll('<option value=getDefaultSectionCode()>Class XII-B</option>', '');

// 3. Search placeholder
content = content.replace(
  'placeholder="Search class (e.g. 3, 8, XI, Science, XII-A)..."',
  'placeholder="Search cohort sections..."'
);

// 4. Annual promotion summary text
content = content.replace(
  '<p style="font-weight:700;color:var(--color-ink);margin:0 0 4px;">Annual Promotion Outcome: Qualified &amp; Promoted to <strong>Class XII-B</strong></p>',
  '<p style="font-weight:700;color:var(--color-ink);margin:0 0 4px;" id="annual-promotion-summary">Annual Promotion Outcome: Qualified &amp; Promoted</p>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Cleanup finished.');
