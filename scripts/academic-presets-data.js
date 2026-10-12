/**
 * Eduvia Academic Baseline Generator
 * Generalized, curriculum-agnostic institutional academic structure.
 * Single unified framework without board-specific branching or presets.
 */

const DEFAULT_ACADEMIC_DATA = {
  terminology: {
    grade_level: 'Class',
    section: 'Section',
    stream: 'Stream',
    term: 'Term',
    subject: 'Subject',
    house: 'House',
    teacher: 'Teacher',
    director: 'Director'
  },
  academic_settings: {
    school_name: 'Brainz Edu World',
    school_code: 'SCH-2026',
    tagline: 'Institutional Operating System',
    crest_symbol: 'B',
    academic_year_start: '2026-04-01',
    academic_year_end: '2027-03-31',
    week_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods_per_day: 8,
    period_timings: [
      { period: 1, start_time: '08:30', end_time: '09:15', label: 'Period 1' },
      { period: 2, start_time: '09:15', end_time: '10:00', label: 'Period 2' },
      { period: 3, start_time: '10:00', end_time: '10:45', label: 'Period 3' },
      { period: 4, start_time: '11:00', end_time: '11:45', label: 'Period 4 (Post-Recess)' },
      { period: 5, start_time: '11:45', end_time: '12:30', label: 'Period 5' },
      { period: 6, start_time: '12:30', end_time: '13:15', label: 'Period 6' },
      { period: 7, start_time: '13:45', end_time: '14:30', label: 'Period 7' },
      { period: 8, start_time: '14:30', end_time: '15:15', label: 'Period 8' }
    ]
  },
  grade_levels: [
    { id: 'gl-01', name: 'Class I', code: 'I', order_index: 1, stage: 'primary' },
    { id: 'gl-02', name: 'Class II', code: 'II', order_index: 2, stage: 'primary' },
    { id: 'gl-03', name: 'Class III', code: 'III', order_index: 3, stage: 'primary' },
    { id: 'gl-04', name: 'Class IV', code: 'IV', order_index: 4, stage: 'primary' },
    { id: 'gl-05', name: 'Class V', code: 'V', order_index: 5, stage: 'primary' },
    { id: 'gl-06', name: 'Class VI', code: 'VI', order_index: 6, stage: 'middle' },
    { id: 'gl-07', name: 'Class VII', code: 'VII', order_index: 7, stage: 'middle' },
    { id: 'gl-08', name: 'Class VIII', code: 'VIII', order_index: 8, stage: 'middle' },
    { id: 'gl-09', name: 'Class IX', code: 'IX', order_index: 9, stage: 'secondary' },
    { id: 'gl-10', name: 'Class X', code: 'X', order_index: 10, stage: 'secondary' },
    { id: 'gl-11', name: 'Class XI', code: 'XI', order_index: 11, stage: 'senior' },
    { id: 'gl-12', name: 'Class XII', code: 'XII', order_index: 12, stage: 'senior' }
  ],
  default_sections: ['A', 'B', 'C', 'D'],
  streams: [
    { id: 'str-sci', name: 'Science', code: 'SCI' },
    { id: 'str-comm', name: 'Commerce', code: 'COMM' },
    { id: 'str-hum', name: 'Humanities', code: 'HUM' }
  ],
  subjects: [
    { id: 'sub-pol', name: 'Political Science', code: 'POL-101', category: 'core' },
    { id: 'sub-eco', name: 'Economics', code: 'ECO-101', category: 'core' },
    { id: 'sub-bst', name: 'Business Studies', code: 'BST-101', category: 'core' },
    { id: 'sub-acc', name: 'Accountancy', code: 'ACC-101', category: 'core' },
    { id: 'sub-mth', name: 'Mathematics', code: 'MTH-101', category: 'core' },
    { id: 'sub-eng', name: 'English Core', code: 'ENG-101', category: 'language' },
    { id: 'sub-phy', name: 'Physics', code: 'PHY-101', category: 'core' },
    { id: 'sub-che', name: 'Chemistry', code: 'CHE-101', category: 'core' },
    { id: 'sub-bio', name: 'Biology', code: 'BIO-101', category: 'core' },
    { id: 'sub-cs', name: 'Computer Science', code: 'CS-101', category: 'elective' },
    { id: 'sub-pe', name: 'Physical Education', code: 'PE-101', category: 'co-curricular' }
  ],
  terms: [
    { id: 'term-1', name: 'Term 1', start_date: '2026-04-01', end_date: '2026-09-30', weightage: 50.00, order_index: 1 },
    { id: 'term-2', name: 'Term 2', start_date: '2026-10-01', end_date: '2027-03-31', weightage: 50.00, order_index: 2 }
  ],
  assessment_types: [
    { id: 'at-quiz', name: 'Quiz', code: 'quiz', max_marks: 20, weightage: 10, term_id: 'term-1', applies_to_all_subjects: true, order_index: 1 },
    { id: 'at-case', name: 'Case Study', code: 'case_study', max_marks: 40, weightage: 20, term_id: 'term-1', applies_to_all_subjects: true, order_index: 2 },
    { id: 'at-pres', name: 'Presentation', code: 'presentation', max_marks: 40, weightage: 20, term_id: 'term-1', applies_to_all_subjects: true, order_index: 3 },
    { id: 'at-pt1', name: 'Periodic Test 1', code: 'pt1', max_marks: 20, weightage: 10, term_id: 'term-1', applies_to_all_subjects: true, order_index: 4 },
    { id: 'at-hy', name: 'Half-Yearly Examination', code: 'hy', max_marks: 80, weightage: 40, term_id: 'term-1', applies_to_all_subjects: true, order_index: 5 },
    { id: 'at-ae', name: 'Annual Examination', code: 'ae', max_marks: 80, weightage: 40, term_id: 'term-2', applies_to_all_subjects: true, order_index: 6 }
  ],
  grading_scheme: {
    id: 'gs-standard',
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
    id: 'pr-standard',
    name: 'Standard Promotion Policy',
    pass_threshold_percent: 33.00,
    grace_marks_max: 5.00
  }
};

function generateAcademicSeedData() {
  const base = DEFAULT_ACADEMIC_DATA;
  const terminology = Object.entries(base.terminology).map(([k, v]) => ({
    key: k,
    label: v,
    default_label: v,
    description: `Default system label for ${k}`,
    updated_at: new Date().toISOString()
  }));

  const academic_settings = [{
    id: 'ac-settings-01',
    school_name: base.academic_settings.school_name,
    school_code: base.academic_settings.school_code,
    tagline: base.academic_settings.tagline,
    crest_symbol: base.academic_settings.crest_symbol,
    academic_year_start: base.academic_settings.academic_year_start,
    academic_year_end: base.academic_settings.academic_year_end,
    week_days: base.academic_settings.week_days,
    periods_per_day: base.academic_settings.periods_per_day,
    period_timings: base.academic_settings.period_timings,
    wizard_completed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];

  const grade_levels = base.grade_levels.map(g => ({
    ...g,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const sections = [];
  grade_levels.forEach(g => {
    base.default_sections.forEach(s => {
      sections.push({
        id: `sec-${g.code.toLowerCase()}-${s.toLowerCase()}`,
        grade_level_id: g.id,
        name: s,
        capacity: 35,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  });

  const streams = base.streams.map(s => ({
    ...s,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const subjects = base.subjects.map(s => ({
    ...s,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const subject_grade_levels = [];
  grade_levels.forEach(g => {
    subjects.forEach(sub => {
      subject_grade_levels.push({ grade_level_id: g.id, subject_id: sub.id });
    });
  });

  const subject_streams = [];
  streams.forEach(str => {
    subjects.forEach(sub => {
      subject_streams.push({ stream_id: str.id, subject_id: sub.id });
    });
  });

  const terms = base.terms.map(t => ({
    ...t,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const assessment_types = base.assessment_types.map(at => ({
    ...at,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const assessment_type_subjects = [];
  assessment_types.forEach(at => {
    subjects.forEach(sub => {
      assessment_type_subjects.push({ assessment_type_id: at.id, subject_id: sub.id });
    });
  });

  const grading_scheme = [{
    ...base.grading_scheme,
    is_active: true,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];

  const promotion_rules = [{
    ...base.promotion_rules,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }];

  return {
    terminology,
    academic_settings,
    grade_levels,
    sections,
    streams,
    subjects,
    subject_grade_levels,
    subject_streams,
    terms,
    assessment_types,
    assessment_type_subjects,
    grading_scheme,
    promotion_rules
  };
}

module.exports = {
  DEFAULT_ACADEMIC_DATA,
  generateAcademicSeedData
};
