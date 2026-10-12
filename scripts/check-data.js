const fs = require('fs');
const content = fs.readFileSync('Eduvia.html', 'utf8');

const lsMatches = content.match(/localStorage\.[a-zA-Z]+\(['"][^'"]+['"]/g) || [];
console.log('localStorage calls:', [...new Set(lsMatches)]);

// Check for remaining mock data structures
console.log('\n--- Checking Mock Arrays & Objects ---');
const mocks = [
  'MOCK_REGISTER_STUDENTS',
  'MOCK_INITIAL_STUDENT_NOTES',
  'CURRENT_APPROVALS',
  'DEMO_PROFILES',
  'AUDIT_LOGS_DATA',
  'BROADCASTS_DATA',
  'CLASS_ATTENDANCE',
  'GRADEBOOK_DATA',
  'TIMETABLE_DATA',
  'DOCUMENTS_STORE',
  'VENTURES_DATA',
  'FACULTY_DIRECTORY',
  'STUDENTS_ROSTER_DATA',
  'mockDates',
  'mockGrades',
  'mockAssignments'
];

mocks.forEach(m => {
  const count = (content.match(new RegExp(m, 'g')) || []).length;
  console.log(`${m}: ${count}`);
});
