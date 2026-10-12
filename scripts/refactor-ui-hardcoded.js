const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. In renderAssignmentsList: replace hardcoded count/filtering with dynamic filter call
const oldAssignFilter = `  // Update dynamic count badges
  const countAll = TEACHER_ASSIGNMENTS_DATA.length;
  const countXIB = TEACHER_ASSIGNMENTS_DATA.filter(a => (a.cohort || '').includes('XI-B')).length;
  const countXIA = TEACHER_ASSIGNMENTS_DATA.filter(a => (a.cohort || '').includes('XI-A')).length;
  const countPending = TEACHER_ASSIGNMENTS_DATA.filter(a => (a.progress || 0) < 100).length;

  const elAll = document.getElementById('t-asg-count-all');
  if (elAll) elAll.textContent = countAll;
  const elXIB = document.getElementById('t-asg-count-xib');
  if (elXIB) elXIB.textContent = countXIB;
  const elXIA = document.getElementById('t-asg-count-xia');
  if (elXIA) elXIA.textContent = countXIA;
  const elPending = document.getElementById('t-asg-count-pending');
  if (elPending) elPending.textContent = countPending;

  // Filter according to active selection
  let filtered = TEACHER_ASSIGNMENTS_DATA;
  if (STATE.teacherAssignmentFilter === 'XI-B') {
    filtered = filtered.filter(a => (a.cohort || '').includes('XI-B'));
  } else if (STATE.teacherAssignmentFilter === 'XI-A') {
    filtered = filtered.filter(a => (a.cohort || '').includes('XI-A'));
  } else if (STATE.teacherAssignmentFilter === 'pending') {
    filtered = filtered.filter(a => (a.progress || 0) < 100);
  }`;

const newAssignFilter = `  renderTeacherAssignmentFilters();

  // Filter according to active selection
  let filtered = TEACHER_ASSIGNMENTS_DATA;
  if (STATE.teacherAssignmentFilter === 'pending') {
    filtered = filtered.filter(a => (a.progress || 0) < 100);
  } else if (STATE.teacherAssignmentFilter && STATE.teacherAssignmentFilter !== 'all') {
    filtered = filtered.filter(a => (a.cohort || '').includes(STATE.teacherAssignmentFilter));
  }`;

content = content.replace(oldAssignFilter, newAssignFilter);

// 2. Replace fallbacks and string literals
content = content.replaceAll("'XI-B'", "getDefaultSectionCode()");
content = content.replaceAll('"XI-B"', "getDefaultSectionCode()");
content = content.replaceAll("'XI-A'", "getDefaultSectionCode()");
content = content.replaceAll('"XI-A"', "getDefaultSectionCode()");
content = content.replaceAll("'XII-A'", "getDefaultSectionCode()");
content = content.replaceAll('"XII-A"', "getDefaultSectionCode()");
content = content.replaceAll("'XII-B'", "getDefaultSectionCode()");
content = content.replaceAll('"XII-B"', "getDefaultSectionCode()");
content = content.replaceAll("'3-A'", "getDefaultSectionCode()");
content = content.replaceAll("'8-A'", "getDefaultSectionCode()");

content = content.replaceAll("'Political Science'", "getDefaultSubjectName()");
content = content.replaceAll('"Political Science"', "getDefaultSubjectName()");
content = content.replaceAll("'Business Studies'", "getDefaultSubjectName()");
content = content.replaceAll('"Business Studies"', "getDefaultSubjectName()");
content = content.replaceAll("'Accountancy'", "getDefaultSubjectName()");
content = content.replaceAll('"Accountancy"', "getDefaultSubjectName()");

content = content.replaceAll("'CBSE 9-Point Grading Scheme'", "getActiveGradingScheme().name");

// Replace hardcoded subject list in results/promotion
content = content.replaceAll("['English Core', 'Accountancy', 'Business Studies', 'Economics', 'Applied Mathematics']", "getActiveSubjectsList()");

// Hook live class updates on teacher login and page transitions
if (!content.includes('updateTeacherLiveClassesUI();')) {
  content = content.replace('function renderTeacherDashboard() {', 'function renderTeacherDashboard() {\n  updateTeacherLiveClassesUI();\n  applyTerminologyToDOM();');
}

// Hook terminology update on navigation
content = content.replace('renderSidebarNav();', 'renderSidebarNav();\n  applyTerminologyToDOM();');

fs.writeFileSync(filePath, content, 'utf8');
console.log('UI hardcoded strings replaced successfully.');
