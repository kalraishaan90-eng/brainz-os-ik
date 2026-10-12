const fs = require('fs');
let html = fs.readFileSync('Eduvia.html', 'utf8');

const targetStr = '<div style="display: flex; gap: 8px; margin-bottom: 22px; overflow-x: auto; padding-bottom: 4px;" id="teacher-asg-filter-bar">';
const pos = html.indexOf(targetStr);
console.log('Pos:', pos);

const endDiv = '</div>\r\n<!-- Cards Grid -->';
const endDivUnix = '</div>\n<!-- Cards Grid -->';

let endPos = html.indexOf(endDiv, pos);
let endLen = endDiv.length;
if (endPos === -1) {
  endPos = html.indexOf(endDivUnix, pos);
  endLen = endDivUnix.length;
}

console.log('endPos:', endPos);

const replacement = `<div style="display: flex; gap: 8px; margin-bottom: 22px; overflow-x: auto; padding-bottom: 4px;" id="teacher-asg-filter-bar">
<button class="btn-secondary asg-filter-pill active" id="teacher-asg-filter-all" onclick="filterTeacherAssignments('all', this)" style="background: rgba(106, 142, 174, 0.14); border-color: var(--color-blue); font-weight: 600;">All Cohorts (<span id="t-asg-count-all">0</span>)</button>
<button class="btn-secondary asg-filter-pill" id="teacher-asg-filter-xib" onclick="filterTeacherAssignments('XI-B', this)"><span id="t-asg-label-xib">XI-B Commerce</span> (<span id="t-asg-count-xib">0</span>)</button>
<button class="btn-secondary asg-filter-pill" id="teacher-asg-filter-xia" onclick="filterTeacherAssignments('XI-A', this)"><span id="t-asg-label-xia">XI-A Commerce</span> (<span id="t-asg-count-xia">0</span>)</button>
<button class="btn-secondary asg-filter-pill" id="teacher-asg-filter-pending" onclick="filterTeacherAssignments('pending', this)">Grading Pending (<span id="t-asg-count-pending">0</span>)</button>
</div>
<!-- Cards Grid -->`;

html = html.substring(0, pos) + replacement + html.substring(endPos + endLen);
fs.writeFileSync('Eduvia.html', html, 'utf8');
console.log('Successfully updated teacher-asg-filter-bar in Eduvia.html');
