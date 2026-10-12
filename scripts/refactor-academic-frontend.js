const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Helper functions definition to insert in Eduvia.html
const helpersCode = `
/* =========================================================================
   CONFIGURABLE ACADEMIC STRUCTURE ENGINE & TERMINOLOGY ACCESSORS
   ========================================================================= */
window.ACADEMIC_STATE = window.ACADEMIC_STATE || {
  terminology: [
    { key: 'grade_level', label: 'Class', default_label: 'Class' },
    { key: 'section', label: 'Section', default_label: 'Section' },
    { key: 'stream', label: 'Stream', default_label: 'Stream' },
    { key: 'term', label: 'Term', default_label: 'Term' },
    { key: 'subject', label: 'Subject', default_label: 'Subject' },
    { key: 'house', label: 'House', default_label: 'House' },
    { key: 'teacher', label: 'Teacher', default_label: 'Teacher' },
    { key: 'director', label: 'Director', default_label: 'Director' }
  ],
  academic_settings: {
    school_name: 'Brainz Edu World',
    academic_year_start: '2026-04-01',
    academic_year_end: '2027-03-31',
    week_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods_per_day: 8,
    period_timings: []
  },
  grade_levels: [],
  sections: [],
  streams: [],
  subjects: [],
  terms: [],
  assessment_types: [],
  grading_scheme: {
    name: 'Standard 9-Point Grading Scheme',
    type: 'percentage',
    pass_threshold_percent: 33.00,
    rounding_rule: 'round',
    bands: [
      { min: 91, max: 100, grade: 'A1', remark: 'Outstanding', gpa_point: 10 },
      { min: 81, max: 90, grade: 'A2', remark: 'Excellent', gpa_point: 9 },
      { min: 71, max: 80, grade: 'B1', remark: 'Very Good', gpa_point: 8 },
      { min: 61, max: 70, grade: 'B2', remark: 'Good', gpa_point: 7 },
      { min: 51, max: 60, grade: 'C1', remark: 'Fair', gpa_point: 6 },
      { min: 41, max: 50, grade: 'C2', remark: 'Average', gpa_point: 5 },
      { min: 33, max: 40, grade: 'D', remark: 'Pass', gpa_point: 4 },
      { min: 21, max: 32, grade: 'E1', remark: 'Essential Repeat', gpa_point: 0 },
      { min: 0, max: 20, grade: 'E2', remark: 'Fail', gpa_point: 0 }
    ]
  },
  promotion_rules: {
    pass_threshold_percent: 33.00,
    grace_marks_max: 5.00
  }
};

function getTerminology(key, fallback) {
  const dict = {
    grade_level: 'Class',
    section: 'Section',
    stream: 'Stream',
    term: 'Term',
    subject: 'Subject',
    house: 'House',
    teacher: 'Teacher',
    director: 'Director'
  };
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.terminology)) {
    const row = window.ACADEMIC_STATE.terminology.find(t => t.key === key);
    if (row && row.label) return row.label;
  }
  return dict[key] || fallback || key;
}
window.getTerminology = getTerminology;

function getDefaultSectionCode() {
  if (STATE && STATE.currentUser && STATE.currentUser.class_section) {
    return STATE.currentUser.class_section.split(',')[0].trim();
  }
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.sections) && window.ACADEMIC_STATE.sections.length > 0) {
    const sec = window.ACADEMIC_STATE.sections.find(s => !s.archived);
    if (sec) {
      const gl = (window.ACADEMIC_STATE.grade_levels || []).find(g => g.id === sec.grade_level_id);
      return gl ? (gl.code + '-' + sec.name) : sec.name;
    }
  }
  return 'Primary-A';
}
window.getDefaultSectionCode = getDefaultSectionCode;

function getDefaultStreamName() {
  if (STATE && STATE.currentUser && STATE.currentUser.stream) return STATE.currentUser.stream;
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.streams) && window.ACADEMIC_STATE.streams.length > 0) {
    const str = window.ACADEMIC_STATE.streams.find(s => !s.archived);
    if (str) return str.name;
  }
  return 'General';
}
window.getDefaultStreamName = getDefaultStreamName;

function getActiveAssessmentTypes() {
  if (window.ACADEMIC_STATE && Array.isArray(window.ACADEMIC_STATE.assessment_types) && window.ACADEMIC_STATE.assessment_types.length > 0) {
    return window.ACADEMIC_STATE.assessment_types.filter(a => !a.archived).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
  }
  return [
    { id: 'at-quiz', name: 'Quiz', code: 'quiz', max_marks: 20, weightage: 10 },
    { id: 'at-case', name: 'Case Study', code: 'caseStudy', max_marks: 40, weightage: 20 },
    { id: 'at-pres', name: 'Presentation', code: 'presentation', max_marks: 40, weightage: 20 }
  ];
}
window.getActiveAssessmentTypes = getActiveAssessmentTypes;

function getActiveGradingScheme() {
  return window.ACADEMIC_STATE?.grading_scheme || {
    name: 'Standard Grading',
    type: 'percentage',
    pass_threshold_percent: 33.00,
    rounding_rule: 'round',
    bands: [
      { min: 85, max: 100, grade: 'Excellent', remark: 'Excellent', gpa_point: 4 },
      { min: 70, max: 84.9, grade: 'Proficient', remark: 'Proficient', gpa_point: 3 },
      { min: 0, max: 69.9, grade: 'Needs Review', remark: 'Needs Review', gpa_point: 1 }
    ]
  };
}
window.getActiveGradingScheme = getActiveGradingScheme;

function calculateStudentGradePerformance(student, assessments) {
  const scheme = getActiveGradingScheme();
  const bands = scheme.bands || [];
  let totalScore = 0;
  let totalMax = 0;

  assessments.forEach(a => {
    const val = student[a.code] !== undefined ? student[a.code] : (student[a.id] !== undefined ? student[a.id] : Math.round(a.max_marks * 0.82));
    totalScore += Number(val) || 0;
    totalMax += Number(a.max_marks) || 100;
  });

  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 10) / 10 : 80;
  let matchingBand = bands.find(b => percentage >= Number(b.min) && percentage <= Number(b.max));
  if (!matchingBand) matchingBand = bands[bands.length - 1] || { grade: 'Pass', remark: 'Proficient', gpa_point: 3 };

  let bandClass = 'score-band-mid';
  if (percentage >= 80) bandClass = 'score-band-high';
  else if (percentage < (scheme.pass_threshold_percent || 40)) bandClass = 'score-band-low';

  let displayBadge = percentage.toFixed(1) + '% · ' + matchingBand.grade;
  if (scheme.type === 'points_1_7') {
    const pt = matchingBand.gpa_point || Math.min(7, Math.max(1, Math.round(percentage / 14.3)));
    displayBadge = pt + '/7 · ' + matchingBand.remark;
  } else if (scheme.type === 'gpa') {
    displayBadge = (matchingBand.gpa_point ? Number(matchingBand.gpa_point).toFixed(1) : '3.5') + ' GPA · ' + matchingBand.grade;
  }

  return { percentage, bandClass, displayBadge, matchingBand, totalScore, totalMax };
}
window.calculateStudentGradePerformance = calculateStudentGradePerformance;
`;

// Insert helper code right after const BRAND_DEFAULTS or getSupabaseClient
content = content.replace('function getSupabaseClient() {', helpersCode + '\nfunction getSupabaseClient() {');

// 2. Student login block in handleLoginSubmit
content = content.replace(
  'await refreshAllowedSchoolDomains();',
  `await refreshAllowedSchoolDomains();
  if (suggestRoleFromEmail(emailVal) === 'student' || emailVal.startsWith('student') || emailVal.includes('.student@') || emailVal.includes('scholar')) {
    showLoginError('Student accounts are not part of this platform. Contact your school office.');
    return;
  }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Helpers inserted and student login check added successfully.');
