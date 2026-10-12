const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Live class cards in teacher overview
content = content.replace('<!-- Live Class 1: XI-B Commerce · Political Science -->', '<!-- Live Class Session 1 -->');
content = content.replace('<h3 class="live-class-title">XI-B Commerce · Political Science</h3>', '<h3 class="live-class-title" id="live-class-1-title">Active Teaching Session</h3>');
content = content.replace('<!-- Live Class 2: XI-A Commerce · Economics -->', '<!-- Live Class Session 2 -->');
content = content.replace('<h3 class="live-class-title">XI-A Commerce · Economics</h3>', '<h3 class="live-class-title" id="live-class-2-title">Upcoming Cohort Session</h3>');
content = content.replace('<span>XI-B &amp; XI-A cohorts</span>', '<span id="overview-asg-cohorts">Assigned Cohorts</span>');

// 2. Attendance page header and labels
content = content.replace('<p class="page-header-desc">Class XI-B Commerce · Political Science. Tap any status pill to cycle states live.</p>', '<p class="page-header-desc" id="teacher-att-header-desc">Active Cohort Attendance Roll. Tap any status pill to cycle states live.</p>');
content = content.replace('<span>Showing 9 of 36 students enrolled in XI-B Political Science</span>', '<span id="teacher-att-roster-count">Enrolled Scholars Roster</span>');
content = content.replace('<span class="badge badge-blue">XI-B Commerce</span>', '<span class="badge badge-blue" id="teacher-att-cohort-badge">Active Cohort</span>');
content = content.replace('<span class="badge badge-sage">Political Science · Term 1 Continuous Assessment</span>', '<span class="badge badge-sage" id="teacher-att-eval-badge">Continuous Evaluation</span>');

// 3. Placeholders, branding and demo records
content = content.replace('placeholder="e.g., Political Science Quiz Review Guidelines"', 'placeholder="e.g., Continuous Assessment Review Guidelines"');
content = content.replace('placeholder="e.g. CBSE Senior Secondary"', 'placeholder="e.g. Accredited Curriculum Board"');
content = content.replace('placeholder="e.g. CBSE Term I Moderation Schedule Confirmed"', 'placeholder="e.g. Term Assessment Moderation Schedule Confirmed"');
content = content.replace('placeholder="e.g. Political Science: Constitutional Amendments Review"', 'placeholder="e.g. Course Chapter Review"');
content = content.replace('<strong id="support-academic-node" style="color: var(--color-ink); font-size: var(--text-sm);">CBSE Academic Node 04</strong>', '<strong id="support-academic-node" style="color: var(--color-ink); font-size: var(--text-sm);">Institutional Academic Node</strong>');
content = content.replace("reason: 'CBSE Moderation Workshop'", "reason: 'Curriculum Moderation Workshop'");
content = content.replace('CBSE Regional Commerce Olympiad', 'Regional Academic Olympiad');
content = content.replace('// Protection Act (DPDP), CBSE bylaws, and minor safeguarding standards.', '// Protection Act (DPDP), institutional bylaws, and minor safeguarding standards.');

// 4. Static badges and card meta
content = content.replace('<strong id="td-classes" style="color: var(--color-ink);">XI-B, XI-A</strong>', '<strong id="td-classes" style="color: var(--color-ink);"></strong>');
content = content.replace('<div class="stat-card-meta"><span>XI-B Commerce</span></div>', '<div class="stat-card-meta"><span id="tr-stat-cohort"></span></div>');
content = content.replace('<span class="badge badge-sage" id="ms-classes-badge">Classes: XI-B</span>', '<span class="badge badge-sage" id="ms-classes-badge"></span>');
content = content.replace('<span class="badge badge-sage" id="tr-class-badge">Class XI-B (Commerce)</span>', '<span class="badge badge-sage" id="tr-class-badge"></span>');
content = content.replace('<p id="sd-cohort-meta" class="subtext" style="margin-top: 4px; font-size: var(--text-sm);">Class XI-B · Stream Commerce · Nalanda House</p>', '<p id="sd-cohort-meta" class="subtext" style="margin-top: 4px; font-size: var(--text-sm);"></p>');
content = content.replace('<span class="badge badge-blue" id="srec-badge-class">Class XI-B</span>', '<span class="badge badge-blue" id="srec-badge-class"></span>');
content = content.replace('id="edit-student-locked-class"><i data-lucide="lock" style="width: 10px; height: 10px;"></i> XI-B (Locked)</span>', 'id="edit-student-locked-class"><i data-lucide="lock" style="width: 10px; height: 10px;"></i> (Locked)</span>');

// 5. Replace hardcoded select options
content = content.replace('<option value="XI-B Commerce">XI-B Commerce Only</option>', '<option value="">— Select Cohort —</option>');
content = content.replaceAll('<option value="XI-B">Class XI-B (Commerce)</option>', '<option value="">— Select Cohort —</option>');
content = content.replaceAll('<option value="XI-B">Class XI-B</option>', '<option value="">— Select Cohort —</option>');
content = content.replaceAll('<option value="XI-A">Class XI-A (Commerce)</option>', '');
content = content.replaceAll('<option value="XII-A">Class XII-A (Commerce)</option>', '');
content = content.replaceAll('<option value="XII-B">Class XII-B (Humanities)</option>', '');
content = content.replaceAll('<option value="XI-B Commerce">XI-B Commerce</option>', '');
content = content.replaceAll('<option value="XI-A Commerce">XI-A Commerce</option>', '');
content = content.replaceAll('<option value="XII-A Commerce">XII-A Commerce</option>', '');

content = content.replaceAll('<option value="Political Science">Political Science</option>', '<option value="">— Select Subject —</option>');
content = content.replaceAll('<option value="Business Studies">Business Studies</option>', '');
content = content.replaceAll('<option value="Accountancy">Accountancy</option>', '');

// 6. Teacher assignment filter bar
content = content.replace(
  '<button class="btn-secondary asg-filter-pill" id="teacher-asg-filter-xib" onclick="filterTeacherAssignments(\'XI-B\', this)">XI-B Commerce (<span id="t-asg-count-xib">0</span>)</button>\n<button class="btn-secondary asg-filter-pill" id="teacher-asg-filter-xia" onclick="filterTeacherAssignments(\'XI-A\', this)">XI-A Commerce (<span id="t-asg-count-xia">0</span>)</button>',
  '<!-- Dynamic cohort filter pills rendered via renderTeacherAssignmentFilters() -->'
);

// 7. Update helper functions at top
const helperPatch = `
function getDefaultSectionCode() {
  if (typeof STATE !== 'undefined' && STATE && STATE.currentUser && STATE.currentUser.class_section) {
    return STATE.currentUser.class_section.split(',')[0].trim();
  }
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.sections) && window.ACADEMIC_STATE.sections.length > 0) {
    const sec = window.ACADEMIC_STATE.sections.find(s => !s.archived);
    if (sec) {
      const gl = (window.ACADEMIC_STATE.grade_levels || []).find(g => g.id === sec.grade_level_id);
      return gl ? (gl.code + '-' + sec.name) : sec.name;
    }
  }
  if (typeof CLASS_SECTIONS_CACHE !== 'undefined' && Array.isArray(CLASS_SECTIONS_CACHE) && CLASS_SECTIONS_CACHE.length > 0) {
    const cs = CLASS_SECTIONS_CACHE.find(c => c.active !== false) || CLASS_SECTIONS_CACHE[0];
    return typeof getClassSectionCode === 'function' ? getClassSectionCode(cs) : (cs.section || 'A');
  }
  return 'A';
}
window.getDefaultSectionCode = getDefaultSectionCode;

function getDefaultStreamName() {
  if (typeof STATE !== 'undefined' && STATE && STATE.currentUser && STATE.currentUser.stream) return STATE.currentUser.stream;
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.streams) && window.ACADEMIC_STATE.streams.length > 0) {
    const str = window.ACADEMIC_STATE.streams.find(s => !s.archived);
    if (str) return str.name;
  }
  return 'General';
}
window.getDefaultStreamName = getDefaultStreamName;

function getDefaultSubjectName() {
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.subjects) && window.ACADEMIC_STATE.subjects.length > 0) {
    const sub = window.ACADEMIC_STATE.subjects.find(s => !s.archived);
    if (sub) return sub.name;
  }
  return 'Core Subject';
}
window.getDefaultSubjectName = getDefaultSubjectName;

function getActiveSubjectsList() {
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.subjects) && window.ACADEMIC_STATE.subjects.length > 0) {
    return window.ACADEMIC_STATE.subjects.filter(s => !s.archived).map(s => s.name);
  }
  return ['Core Curriculum', 'Language', 'Mathematics', 'Sciences', 'Social Studies'];
}
window.getActiveSubjectsList = getActiveSubjectsList;
`;

// Replace older getDefaultSectionCode and getDefaultStreamName block
content = content.replace(/function getDefaultSectionCode\(\) \{[\s\S]*?window\.getDefaultStreamName = getDefaultStreamName;/, helperPatch.trim());

// 8. Dynamic render of teacher live classes & dynamic cohort badges
const dynamicLiveClassFn = `
function updateTeacherLiveClassesUI() {
  const t = STATE.currentUser;
  const sections = (t && t.class_section) ? t.class_section.split(',').map(s => s.trim()).filter(Boolean) : [getDefaultSectionCode()];
  const gl = getTerminology('grade_level', 'Class');
  const sub = getDefaultSubjectName();
  const title1 = document.getElementById('live-class-1-title');
  if (title1) title1.textContent = \`\${gl} \${sections[0] || 'A'} · \${sub}\`;
  const title2 = document.getElementById('live-class-2-title');
  if (title2) title2.textContent = \`\${gl} \${sections[1] || sections[0] || 'B'} · \${sub}\`;
  const ovCohort = document.getElementById('overview-asg-cohorts');
  if (ovCohort) ovCohort.textContent = sections.map(s => \`\${gl} \${s}\`).join(' & ');
  const attCohort = document.getElementById('teacher-att-cohort-badge');
  if (attCohort) attCohort.textContent = \`\${gl} \${sections[0] || 'A'}\`;
  const attDesc = document.getElementById('teacher-att-header-desc');
  if (attDesc) attDesc.textContent = \`\${gl} \${sections[0] || 'A'} · \${sub}. Tap any status pill to cycle states live.\`;
  const tdClasses = document.getElementById('td-classes');
  if (tdClasses) tdClasses.textContent = sections.join(', ');
  const msBadge = document.getElementById('ms-classes-badge');
  if (msBadge) msBadge.textContent = \`\${getTerminology('section', 'Cohort')}s: \${sections.join(', ')}\`;
  const trBadge = document.getElementById('tr-class-badge');
  if (trBadge) trBadge.textContent = \`\${gl} \${sections[0] || 'A'}\`;
}
window.updateTeacherLiveClassesUI = updateTeacherLiveClassesUI;
`;

if (!content.includes('function updateTeacherLiveClassesUI()')) {
  content = content.replace('function renderSidebarNav() {', dynamicLiveClassFn + '\nfunction renderSidebarNav() {');
}

// 9. Update renderAssignmentsList and filterTeacherAssignments
const dynamicAssignmentFilterFn = `
function renderTeacherAssignmentFilters() {
  const bar = document.getElementById('teacher-asg-filter-bar');
  if (!bar) return;
  const cohorts = Array.from(new Set(TEACHER_ASSIGNMENTS_DATA.map(a => a.cohort).filter(Boolean)));
  const countAll = TEACHER_ASSIGNMENTS_DATA.length;
  const countPending = TEACHER_ASSIGNMENTS_DATA.filter(a => (a.progress || 0) < 100).length;
  const activeFilter = STATE.teacherAssignmentFilter || 'all';

  let html = \`<button class="btn-secondary asg-filter-pill \${activeFilter === 'all' ? 'active' : ''}" onclick="filterTeacherAssignments('all', this)" style="\${activeFilter === 'all' ? 'background: rgba(106, 142, 174, 0.14); border-color: var(--color-blue); font-weight: 600;' : ''}">All Cohorts (\${countAll})</button>\`;

  cohorts.forEach(c => {
    const count = TEACHER_ASSIGNMENTS_DATA.filter(a => a.cohort === c).length;
    const isActive = activeFilter === c;
    html += \`<button class="btn-secondary asg-filter-pill \${isActive ? 'active' : ''}" onclick="filterTeacherAssignments('\${escapeHtml(c)}', this)" style="\${isActive ? 'background: rgba(106, 142, 174, 0.14); border-color: var(--color-blue); font-weight: 600;' : ''}">\${escapeHtml(c)} (\${count})</button>\`;
  });

  html += \`<button class="btn-secondary asg-filter-pill \${activeFilter === 'pending' ? 'active' : ''}" onclick="filterTeacherAssignments('pending', this)" style="\${activeFilter === 'pending' ? 'background: rgba(106, 142, 174, 0.14); border-color: var(--color-blue); font-weight: 600;' : ''}">Grading Pending (\${countPending})</button>\`;

  bar.innerHTML = html;
}
window.renderTeacherAssignmentFilters = renderTeacherAssignmentFilters;
`;

if (!content.includes('function renderTeacherAssignmentFilters()')) {
  content = content.replace('function renderAssignmentsList() {', dynamicAssignmentFilterFn + '\nfunction renderAssignmentsList() {');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('clean-frontend-hardcoded.js finished.');
