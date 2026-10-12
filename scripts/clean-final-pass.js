const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove remaining static asg filter button
content = content.replace(
  '<button class="btn-secondary asg-filter-pill" id="teacher-asg-filter-xib" onclick="filterTeacherAssignments(getDefaultSectionCode(), this)">XI-B Commerce (<span id="t-asg-count-xib">0</span>)</button>',
  ''
);

// 2. Line 11990 fallback
content = content.replace(
  "const cohort = cohortEl ? cohortEl.value : 'XI-B Commerce';",
  "const cohort = cohortEl ? cohortEl.value : getDefaultSectionCode();"
);

// 3. Comments and badge
content = content.replace(
  '// Pattern matching: e.g. "Class XI-B (Commerce)" -> getDefaultSectionCode(), "Class 3-A" -> "3-A", "XI-B Commerce" -> getDefaultSectionCode()',
  '// Pattern matching: e.g. "Class 11-B" -> "11-B", "3-A" -> "3-A"'
);

content = content.replace(
  '<td><span class="badge badge-blue">Class XI-B</span></td>',
  '<td><span class="badge badge-blue">${escapeHtml(getTerminology("grade_level") + " " + getDefaultSectionCode())}</span></td>'
);

content = content.replace(
  '// Students in other class sections (accessible to Director only; forbidden to Teacher of XI-B)',
  '// Students in other class sections (accessible to Director only; forbidden to other teachers)'
);

// 4. Clean Economics occurrences in select options and mock items
content = content.replaceAll('<option value="Economics">Economics</option>', '');
content = content.replaceAll("'Economics'", "getDefaultSubjectName()");
content = content.replaceAll('"Economics"', "getDefaultSubjectName()");
content = content.replace('Commerce &amp; Economics', 'Instructional Faculty');
content = content.replace('Accountancy &amp; Economics', 'Active Candidates');
content = content.replace('Commerce & Economics,97.2%,14', 'Instructional Department,97.2%,14');
content = content.replace('Accountancy and Economics lab sessions', 'instructional laboratory sessions');
content = content.replace('National Economics Olympiad', 'National Academic Olympiad');
content = content.replaceAll("['English Core', getDefaultSubjectName(), getDefaultSubjectName(), getDefaultSubjectName(), 'Applied Mathematics']", "getActiveSubjectsList()");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final pass clean finished.');
