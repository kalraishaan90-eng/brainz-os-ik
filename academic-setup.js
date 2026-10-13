(function () {
  'use strict';

  const TABLES = {
    grade_levels: {
      title: 'Grade Levels',
      singular: 'Grade Level',
      fields: [
        ['name', 'Name (e.g. Class XI, Grade 11, Year 12)', 'text'],
        ['code', 'Code / Short Identifier (e.g. XI, 11, Y12)', 'text'],
        ['order_index', 'Sequence Order (1-12)', 'number'],
        ['stage', 'Academic Stage', 'select', ['primary', 'middle', 'secondary', 'senior', 'custom']]
      ],
      columns: ['name', 'code', 'stage', 'order_index']
    },
    sections: {
      title: 'Sections & Divisions',
      singular: 'Section',
      fields: [
        ['grade_level_id', 'Grade Level', 'ref', 'grade_levels'],
        ['name', 'Section Identifier (e.g. A, B, Set 1)', 'text'],
        ['capacity', 'Maximum Student Capacity', 'number']
      ],
      columns: ['name', 'grade_level_id', 'capacity']
    },
    streams: {
      title: 'Academic Streams',
      singular: 'Stream',
      fields: [
        ['name', 'Stream Name (e.g. Science, Commerce, Humanities)', 'text'],
        ['code', 'Code / Abbreviation (e.g. SCI, COMM, HUM)', 'text'],
        ['description', 'Curriculum Description', 'text']
      ],
      columns: ['name', 'code', 'description']
    },
    subjects: {
      title: 'Subject Catalog',
      singular: 'Subject',
      fields: [
        ['name', 'Subject Name', 'text'],
        ['code', 'Subject Code (e.g. POL-101, PHY-101)', 'text'],
        ['category', 'Category', 'select', ['core', 'elective', 'language', 'co-curricular']]
      ],
      columns: ['name', 'code', 'category']
    },
    terms: {
      title: 'Evaluation Terms & Semesters',
      singular: 'Term',
      fields: [
        ['name', 'Term Name (e.g. Term 1, Semester 1, Fall Quarter)', 'text'],
        ['start_date', 'Start Date', 'date'],
        ['end_date', 'End Date', 'date'],
        ['weightage', 'Annual Assessment Weightage %', 'number'],
        ['order_index', 'Chronological Order', 'number']
      ],
      columns: ['name', 'start_date', 'end_date', 'weightage', 'order_index']
    },
    assessment_types: {
      title: 'Assessment Types',
      singular: 'Assessment Type',
      fields: [
        ['name', 'Assessment Name (e.g. Unit Test, Half-Yearly, Project)', 'text'],
        ['code', 'Identifier Code (e.g. pt1, hy, quiz)', 'text'],
        ['max_marks', 'Maximum Marks', 'number'],
        ['weightage', 'Weightage % in Term', 'number'],
        ['term_id', 'Evaluation Term', 'ref', 'terms']
      ],
      columns: ['name', 'code', 'max_marks', 'weightage', 'term_id']
    },
    grading_scheme: {
      title: 'Grading Schemes',
      singular: 'Grading Scheme',
      fields: [
        ['name', 'Scheme Name', 'text'],
        ['type', 'Grading Type', 'select', ['percentage', 'letter', 'gpa', 'points_1_7', 'custom']],
        ['pass_threshold_percent', 'Pass Threshold %', 'number'],
        ['rounding_rule', 'Rounding Rule', 'select', ['round', 'floor', 'ceil']],
        ['bands', 'Grading Bands (JSON Array of {min, max, grade, remark, gpa_point})', 'textarea']
      ],
      columns: ['name', 'type', 'pass_threshold_percent', 'is_active']
    },
    promotion_rules: {
      title: 'Year-End Promotion Rules',
      singular: 'Promotion Rule',
      fields: [
        ['name', 'Rule Title', 'text'],
        ['pass_threshold_percent', 'Minimum Qualifying Aggregate %', 'number'],
        ['grace_marks_max', 'Maximum Grace Marks Permitted', 'number']
      ],
      columns: ['name', 'pass_threshold_percent', 'grace_marks_max', 'is_active']
    }
  };

  const CONFIG_PAGES = [
    { key: 'grade_levels', pageId: 'page-director-academic-grade-levels', navId: 'director-academic-grade-levels', label: 'Grade Levels', icon: 'layers' },
    { key: 'sections', pageId: 'page-director-academic-sections', navId: 'director-academic-sections', label: 'Sections', icon: 'grid' },
    { key: 'streams', pageId: 'page-director-academic-streams', navId: 'director-academic-streams', label: 'Streams', icon: 'git-fork' },
    { key: 'subjects', pageId: 'page-director-academic-subjects', navId: 'director-academic-subjects', label: 'Subjects', icon: 'book' },
    { key: 'terms', pageId: 'page-director-academic-terms', navId: 'director-academic-terms', label: 'Terms & Semesters', icon: 'calendar' },
    { key: 'assessment_types', pageId: 'page-director-academic-assessment-types', navId: 'director-academic-assessment-types', label: 'Assessment Types', icon: 'award' },
    { key: 'grading_scheme', pageId: 'page-director-academic-grading-scheme', navId: 'director-academic-grading-scheme', label: 'Grading Schemes', icon: 'percent' },
    { key: 'promotion_rules', pageId: 'page-director-academic-promotion-rules', navId: 'director-academic-promotion-rules', label: 'Promotion Rules', icon: 'graduation-cap' },
    { key: 'terminology', pageId: 'page-director-academic-terminology', navId: 'director-academic-terminology', label: 'Terminology Dictionary', icon: 'type' },
    { key: 'academic_settings', pageId: 'page-director-academic-settings', navId: 'director-academic-settings', label: 'Calendar & Timings', icon: 'clock' }
  ];

  const ORDER = ['grade_levels', 'sections', 'streams', 'subjects', 'terms', 'assessment_types', 'grading_scheme', 'promotion_rules', 'terminology', 'academic_settings'];
  const DEPENDENCY_TABLES = ['profiles', 'grades', 'assignments', 'timetable_entries', 'attendance_records', 'lecture_plan', 'test_schedule', 'subject_grade_levels', 'subject_streams', 'assessment_type_subjects'];

  let data = {};
  let selected = 'grade_levels';
  let editing = null;
  let wizardStep = 0;
  const defaultLabels = { grade_level: 'Class', section: 'Section', stream: 'Stream', term: 'Term', subject: 'Subject', house: 'House', teacher: 'Teacher', director: 'Director' };

  const $ = id => document.getElementById(id);
  const esc = value => typeof escapeHtml === 'function' ? escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const client = () => typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.STATE?.supabase || null);

  function labelFor(key) {
    return (data.terminology || []).find(row => row.key === key)?.label || defaultLabels[key] || key;
  }

  function configTabs() {
    return [
      ['grade_levels', labelFor('grade_level') + ' Levels'],
      ['sections', labelFor('section') + 's'],
      ['streams', labelFor('stream') + 's'],
      ['subjects', labelFor('subject') + 's'],
      ['terms', labelFor('term') + 's'],
      ['assessment_types', 'Assessment Types'],
      ['grading_scheme', 'Grading Schemes'],
      ['promotion_rules', 'Promotion Rules'],
      ['terminology', 'Terminology'],
      ['academic_settings', 'Calendar & Periods']
    ];
  }

  function installSubPages() {
    const canvas = $('content-canvas');
    if (!canvas) return;

    // 1. Overview Page
    if (!$('page-director-academic-setup')) {
      const overview = document.createElement('section');
      overview.className = 'os-page';
      overview.id = 'page-director-academic-setup';
      overview.innerHTML = buildPageHtml('Academic Setup', 'Configure the institutional framework, evaluation model, and academic calendar.', true);
      canvas.appendChild(overview);
    }

    // 2. Dedicated Sub-pages for each config
    CONFIG_PAGES.forEach(cfg => {
      if (!$(cfg.pageId)) {
        const sec = document.createElement('section');
        sec.className = 'os-page';
        sec.id = cfg.pageId;
        sec.innerHTML = buildPageHtml(cfg.label, `Configure institutional ${cfg.label.toLowerCase()} across all cohorts and records.`, false, cfg.key);
        canvas.appendChild(sec);
      }
    });

    // 3. Modals
    if (!$('academic-editor-modal')) {
      const editorModal = document.createElement('div');
      editorModal.id = 'academic-editor-modal';
      editorModal.className = 'modal-overlay';
      editorModal.style.display = 'none';
      editorModal.style.zIndex = '1000';
      editorModal.setAttribute('role', 'dialog');
      editorModal.setAttribute('aria-modal', 'true');
      editorModal.innerHTML = `
        <div class="modal-content" style="max-width:640px;width:calc(100% - 32px)">
          <div class="modal-header">
            <h2 id="academic-editor-title">Academic Item</h2>
            <button class="modal-close" onclick="academicCloseEditor()" aria-label="Close">&times;</button>
          </div>
          <form id="academic-editor-form" onsubmit="academicSaveEditor(event)">
            <div id="academic-editor-fields"></div>
            <div class="modal-actions" style="margin-top:20px;">
              <button type="button" class="btn-secondary" onclick="academicCloseEditor()">Cancel</button>
              <button type="submit" class="btn-primary">Save Changes</button>
            </div>
          </form>
        </div>`;
      document.body.appendChild(editorModal);
    }

    if (!$('academic-wizard-modal')) {
      const wizardModal = document.createElement('div');
      wizardModal.id = 'academic-wizard-modal';
      wizardModal.className = 'modal-overlay';
      wizardModal.style.display = 'none';
      wizardModal.style.zIndex = '1001';
      wizardModal.setAttribute('role', 'dialog');
      wizardModal.setAttribute('aria-modal', 'true');
      wizardModal.innerHTML = `
        <div class="modal-content" style="max-width:780px;width:calc(100% - 32px)">
          <div class="modal-header">
            <div>
              <h2 id="academic-wizard-title">Institutional Setup Wizard</h2>
              <p class="subtext" id="academic-wizard-progress" style="margin:4px 0 0"></p>
            </div>
            <button class="modal-close" onclick="academicCloseWizard()" aria-label="Close">&times;</button>
          </div>
          <div id="academic-wizard-fields"></div>
          <div class="modal-actions" style="margin-top:20px;">
            <button class="btn-secondary" type="button" id="academic-wizard-back" onclick="academicWizardMove(-1)">Back</button>
            <button class="btn-secondary" type="button" onclick="academicSaveWizardDraft()">Save & Resume Later</button>
            <button class="btn-primary" type="button" id="academic-wizard-next" onclick="academicWizardMove(1)">Next Step</button>
          </div>
        </div>`;
      document.body.appendChild(wizardModal);
    }
  }

  function buildPageHtml(title, desc, isOverview, configKey) {
    const keyAttr = configKey ? `data-config-page="${configKey}"` : '';
    return `
      <div class="page-header">
        <div>
          <h1 class="page-header-title">${esc(title)}</h1>
          <p class="page-header-desc">${esc(desc)}</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn-secondary" onclick="academicStartWizard()"><i data-lucide="wand-sparkles"></i> Setup Wizard</button>
          <button class="btn-primary academic-add-btn" onclick="academicOpenEditor()"><i data-lucide="plus"></i> Add Item</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:18px"><div style="display:flex;gap:10px;flex-wrap:wrap" class="academic-config-tabs"></div></div>
      <div class="academic-config-summary card" style="margin-bottom:18px"></div>
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:20px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <h2 class="academic-table-title" style="margin:0;font-family:var(--font-heading);font-size:1.25rem"></h2>
            <p class="academic-table-note subtext" style="margin:5px 0 0"></p>
          </div>
        </div>
        <div class="table-container">
          <table style="width:100%;min-width:680px">
            <thead class="academic-table-head"></thead>
            <tbody class="academic-table-body"></tbody>
          </table>
        </div>
      </div>`;
  }

  function installNavigation() {
    // Academic Setup sidebar tabs have been retired to simplify the OS interface.
  }

  async function loadAcademicData() {
    const sb = client();
    if (!sb || !window.STATE?.currentUser) {
      if (window.ACADEMIC_STATE) {
        data = { ...window.ACADEMIC_STATE };
        renderConfig();
      }
      return;
    }

    try {
      const results = await Promise.all([...ORDER, ...DEPENDENCY_TABLES].map(table => sb.from(table).select('*')));
      for (let i = 0; i < ORDER.length; i++) {
        if (!results[i].error) {
          data[ORDER[i]] = results[i].data || [];
        }
      }
      DEPENDENCY_TABLES.forEach((table, index) => {
        if (!results[ORDER.length + index].error) {
          data[table] = results[ORDER.length + index].data || [];
        }
      });

      // Global synchronization
      window.ACADEMIC_STATE = { ...window.ACADEMIC_STATE, ...data };

      // Synchronize branding if academic_settings present
      if (data.academic_settings?.[0] && window.SCHOOL_SETTINGS) {
        const as = data.academic_settings[0];
        if (as.school_name) window.SCHOOL_SETTINGS.school_name = as.school_name;
        if (typeof applySchoolBranding === 'function') applySchoolBranding();
      }

      // Propagate terminology & dynamic dropdowns
      if (typeof applyTerminologyToDOM === 'function') applyTerminologyToDOM();
      if (typeof populateAllClassDropdowns === 'function') populateAllClassDropdowns();
      if (typeof populateAllSubjectDropdowns === 'function') populateAllSubjectDropdowns();
      if (typeof renderGradebookTable === 'function') renderGradebookTable();

      renderConfig();
    } catch (err) {
      console.warn('Academic data load error:', err);
    }
  }

  function renderConfig() {
    const activePage = document.querySelector('.os-page.active') || $('page-director-academic-setup');
    if (!activePage) return;

    // Render tab buttons
    document.querySelectorAll('.academic-config-tabs').forEach(tabs => {
      tabs.innerHTML = configTabs().map(([key, label]) =>
        `<button class="filter-btn ${selected === key ? 'active' : ''}" onclick="academicSelectConfig('${key}')">${esc(label)}</button>`
      ).join('');
    });

    const setting = (data.academic_settings || [])[0];
    const summaryHtml = `
      <div style="display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div>
          <div class="eyebrow">Institutional Architecture</div>
          <strong style="font-size:1.05rem;">${esc(setting?.school_name || 'Institutional Academic Framework')}</strong>
          <span class="subtext"> · Academic Year: ${esc(setting?.academic_year_start || '2026-04-01')} to ${esc(setting?.academic_year_end || '2027-03-31')}</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <span class="badge ${setting?.wizard_completed === false ? 'badge-amber' : 'badge-sage'}">
            ${setting?.wizard_completed === false ? 'Setup In Progress' : 'Active Institutional Framework'}
          </span>
          <button class="btn-secondary" style="padding:6px 12px;font-size:var(--text-xs);" onclick="academicStartWizard()">Run Setup Wizard</button>
        </div>
      </div>`;
    document.querySelectorAll('.academic-config-summary').forEach(el => { el.innerHTML = summaryHtml; });

    const meta = TABLES[selected];
    const titleText = selected === 'terminology' ? 'Terminology Dictionary' : (selected === 'academic_settings' ? 'Institutional Calendar & Periods' : meta?.title || selected);
    const noteText = selected === 'terminology'
      ? 'Define institutional labels used throughout the entire application shell.'
      : selected === 'academic_settings'
        ? 'Configure institutional session dates, operating days, and daily period timings.'
        : 'Active institutional configurations. Items referenced by scholar or academic records can be archived to preserve history.';

    document.querySelectorAll('.academic-table-title').forEach(el => { el.textContent = titleText; });
    document.querySelectorAll('.academic-table-note').forEach(el => { el.textContent = noteText; });

    document.querySelectorAll('.academic-add-btn').forEach(btn => {
      btn.style.display = ['academic_settings'].includes(selected) ? 'none' : 'inline-flex';
    });

    if (selected === 'academic_settings') {
      renderSettings();
      return;
    }

    if (selected === 'terminology') {
      renderTerminologyTable();
      return;
    }

    renderStandardTable();
  }

  function renderStandardTable() {
    const meta = TABLES[selected];
    if (!meta) return;
    const cols = meta.columns;
    const rows = data[selected] || [];

    const headHtml = `<tr>${cols.map(c => `<th>${esc(fieldLabel(meta, c))}</th>`).join('')}<th style="text-align:right">Actions</th></tr>`;
    document.querySelectorAll('.academic-table-head').forEach(el => { el.innerHTML = headHtml; });

    const bodyHtml = rows.map(row => `
      <tr style="${row.archived ? 'opacity:0.6;' : ''}">
        ${cols.map(c => `<td>${displayValue(selected, c, row[c])}</td>`).join('')}
        <td style="text-align:right;white-space:nowrap">
          <button class="btn-secondary" style="padding:5px 9px" onclick="academicOpenEditor('${esc(row.id)}')">Edit</button>
          <button class="btn-secondary" style="padding:5px 9px;margin-left:6px" onclick="academicArchive('${esc(row.id)}')">${row.archived ? 'Restore' : 'Archive'}</button>
          <button class="btn-secondary" style="padding:5px 9px;margin-left:6px;color:#9B3A3A" onclick="academicDelete('${esc(row.id)}')">Delete</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="${cols.length + 1}" class="subtext" style="padding:24px;text-align:center">No records configured yet. Click "+ Add Item" above to create one.</td></tr>`;

    document.querySelectorAll('.academic-table-body').forEach(el => { el.innerHTML = bodyHtml; });
  }

  function renderTerminologyTable() {
    const headHtml = '<tr><th>Term Key</th><th>Default Label</th><th>Custom Override</th><th style="text-align:right">Actions</th></tr>';
    document.querySelectorAll('.academic-table-head').forEach(el => { el.innerHTML = headHtml; });

    const rows = data.terminology || [];
    const bodyHtml = rows.map(row => `
      <tr>
        <td><code>${esc(row.key)}</code><div class="subtext">${esc(row.description || '')}</div></td>
        <td>${esc(row.default_label || row.key)}</td>
        <td><strong style="color:var(--color-blue);">${esc(row.label || row.default_label)}</strong></td>
        <td style="text-align:right">
          <button class="btn-secondary" style="padding:5px 9px" onclick="academicOpenEditor('${esc(row.key)}')">Edit Label</button>
        </td>
      </tr>
    `).join('');
    document.querySelectorAll('.academic-table-body').forEach(el => { el.innerHTML = bodyHtml; });
  }

  function renderSettings() {
    const s = data.academic_settings?.[0] || {};
    const headHtml = '<tr><th>Institutional Setting</th><th>Configured Value</th><th style="text-align:right">Actions</th></tr>';
    document.querySelectorAll('.academic-table-head').forEach(el => { el.innerHTML = headHtml; });

    const rows = [
      ['Academic Session', `${s.academic_year_start || '2026-04-01'} to ${s.academic_year_end || '2027-03-31'}`],
      ['Operating Days', (s.week_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).join(', ')],
      ['Periods per Day', `${s.periods_per_day || 8} periods`],
      ['Period Timings Schedule', `${(s.period_timings || []).length} period timings configured`]
    ];

    const bodyHtml = rows.map(([k, v], idx) => `
      <tr>
        <td><strong>${esc(k)}</strong></td>
        <td>${esc(v)}</td>
        <td style="text-align:right">
          ${idx === 0 ? '<button class="btn-primary" style="padding:5px 12px" onclick="academicOpenSettingsEditor()">Edit Calendar & Timings</button>' : ''}
        </td>
      </tr>
    `).join('');
    document.querySelectorAll('.academic-table-body').forEach(el => { el.innerHTML = bodyHtml; });
  }

  function fieldLabel(meta, key) {
    return meta?.fields.find(f => f[0] === key)?.[1] || key;
  }

  function displayValue(table, key, value) {
    if (key === 'grade_level_id') {
      const gl = (data.grade_levels || []).find(r => r.id === value);
      return gl ? `<span class="badge badge-blue">${esc(gl.name)}</span>` : '—';
    }
    if (key === 'term_id') {
      const tm = (data.terms || []).find(r => r.id === value);
      return tm ? `<span class="badge badge-beige">${esc(tm.name)}</span>` : '—';
    }
    if (key === 'is_active') {
      return value ? '<span class="badge badge-sage">Active</span>' : '<span class="badge badge-beige">Inactive</span>';
    }
    if (key === 'category') {
      const cClass = value === 'core' ? 'badge-blue' : (value === 'elective' ? 'badge-amber' : 'badge-sage');
      return `<span class="badge ${cClass}">${esc(value)}</span>`;
    }
    if (key === 'stage') {
      return `<span class="badge badge-beige">${esc(value)}</span>`;
    }
    return esc(value ?? '—');
  }

  function editorFields(row = {}) {
    const container = $('academic-editor-fields');
    if (!container) return;

    if (selected === 'terminology') {
      const entry = (data.terminology || []).find(item => item.key === (row.key || row.id)) || {};
      container.innerHTML = `
        <input type="hidden" name="key" value="${esc(entry.key || '')}">
        <div class="form-group">
          <label class="form-label">Term Key</label>
          <input class="composer-input" value="${esc(entry.key || '')}" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Default System Label</label>
          <input class="composer-input" value="${esc(entry.default_label || entry.key || '')}" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Institutional Override Label</label>
          <input name="label" class="composer-input" required value="${esc(entry.label || entry.default_label || '')}">
          <div class="subtext" style="margin-top:4px;">Every occurrence in the navigation tabs, page titles, and forms will adopt this word.</div>
        </div>`;
      return;
    }

    const meta = TABLES[selected];
    if (!meta) return;

    container.innerHTML = meta.fields.map(([k, label, type, options]) => {
      const val = row[k] ?? (k === 'capacity' ? 35 : (k === 'stage' ? 'secondary' : (k === 'category' ? 'core' : (k === 'order_index' ? (data[selected]?.length || 0) + 1 : ''))));

      if (type === 'ref') {
        const refs = data[options] || [];
        return `
          <div class="form-group">
            <label class="form-label">${esc(label)}</label>
            <select class="composer-select" name="${k}" required>
              <option value="">Select ${esc(label)}</option>
              ${refs.filter(item => !item.archived).map(item => `
                <option value="${esc(item.id)}" ${val === item.id ? 'selected' : ''}>${esc(item.name)}</option>
              `).join('')}
            </select>
          </div>`;
      }

      if (type === 'select') {
        return `
          <div class="form-group">
            <label class="form-label">${esc(label)}</label>
            <select class="composer-select" name="${k}" required>
              ${options.map(opt => `
                <option value="${esc(opt)}" ${String(val) === opt ? 'selected' : ''}>${esc(opt)}</option>
              `).join('')}
            </select>
          </div>`;
      }

      if (type === 'textarea') {
        return `
          <div class="form-group">
            <label class="form-label">${esc(label)}</label>
            <textarea class="composer-textarea" name="${k}" rows="5" required>${esc(typeof val === 'object' ? JSON.stringify(val, null, 2) : (val || '[]'))}</textarea>
          </div>`;
      }

      return `
        <div class="form-group">
          <label class="form-label">${esc(label)}</label>
          <input class="composer-input" name="${k}" type="${type}" ${type === 'number' ? 'step="any"' : ''} ${['name', 'code'].includes(k) ? 'required' : ''} value="${esc(val)}">
        </div>`;
    }).join('');
  }

  function openEditor(id) {
    editing = id ? (data[selected] || []).find(row => row.id === id || row.key === id) : null;
    const titleEl = $('academic-editor-title');
    if (titleEl) {
      titleEl.textContent = `${editing ? 'Edit' : 'Add'} ${selected === 'terminology' ? 'Terminology Label' : (TABLES[selected]?.singular || selected)}`;
    }
    editorFields(editing || {});
    const modal = $('academic-editor-modal');
    if (modal) modal.style.display = 'flex';
  }

  function closeEditor() {
    const modal = $('academic-editor-modal');
    if (modal) modal.style.display = 'none';
  }

  async function saveEditor(event) {
    event.preventDefault();
    const sb = client();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    if (selected === 'grading_scheme' && payload.bands) {
      try {
        payload.bands = JSON.parse(payload.bands);
      } catch (_) {
        showToast('Invalid JSON', 'Grading bands must be a valid JSON array.', 'alert-circle');
        return;
      }
    }

    Object.keys(payload).forEach(k => {
      if (['order_index', 'capacity', 'max_marks', 'weightage', 'pass_threshold_percent', 'grace_marks_max'].includes(k)) {
        payload[k] = Number(payload[k]);
      }
    });

    payload.updated_at = new Date().toISOString();

    let result;
    if (editing) {
      result = await sb.from(selected).update(payload).eq(selected === 'terminology' ? 'key' : 'id', editing.id || editing.key);
    } else {
      result = await sb.from(selected).insert(payload);
    }

    if (result.error) {
      showToast('Save Failed', result.error.message, 'alert-circle');
      return;
    }

    closeEditor();
    await loadAcademicData();
    showToast('Saved', 'Configuration successfully updated.', 'check');
  }

  function getDependentRecords(table, row) {
    const details = [];
    const id = row.id;
    if (!id) return details;

    if (table === 'grade_levels') {
      const secCount = (data.sections || []).filter(s => s.grade_level_id === id).length;
      if (secCount) details.push(`${secCount} Section(s)`);
      const profCount = (data.profiles || []).filter(p => p.grade_level_id === id).length;
      if (profCount) details.push(`${profCount} Scholar Profile(s)`);
      const subCount = (data.subject_grade_levels || []).filter(sg => sg.grade_level_id === id).length;
      if (subCount) details.push(`${subCount} Linked Subject(s)`);
    } else if (table === 'sections') {
      const profCount = (data.profiles || []).filter(p => p.section_id === id).length;
      if (profCount) details.push(`${profCount} Scholar Profile(s)`);
      const asgCount = (data.assignments || []).filter(a => a.section_id === id).length;
      if (asgCount) details.push(`${asgCount} Assignment(s)`);
      const ttCount = (data.timetable_entries || []).filter(t => t.section_id === id).length;
      if (ttCount) details.push(`${ttCount} Timetable Entry/Entries`);
      const attCount = (data.attendance_records || []).filter(ar => ar.section_id === id).length;
      if (attCount) details.push(`${attCount} Attendance Record(s)`);
      const tsCount = (data.test_schedule || []).filter(ts => ts.section_id === id).length;
      if (tsCount) details.push(`${tsCount} Test Schedule Item(s)`);
      const lpCount = (data.lecture_plan || []).filter(lp => lp.section_id === id).length;
      if (lpCount) details.push(`${lpCount} Lecture Plan(s)`);
    } else if (table === 'streams') {
      const profCount = (data.profiles || []).filter(p => p.stream_id === id).length;
      if (profCount) details.push(`${profCount} Scholar Profile(s)`);
      const ssCount = (data.subject_streams || []).filter(ss => ss.stream_id === id).length;
      if (ssCount) details.push(`${ssCount} Stream-Subject Mapping(s)`);
    } else if (table === 'subjects') {
      const grCount = (data.grades || []).filter(g => g.subject_id === id).length;
      if (grCount) details.push(`${grCount} Grade Entry/Entries`);
      const asgCount = (data.assignments || []).filter(a => a.subject_id === id).length;
      if (asgCount) details.push(`${asgCount} Assignment(s)`);
      const ttCount = (data.timetable_entries || []).filter(t => t.subject_id === id).length;
      if (ttCount) details.push(`${ttCount} Timetable Entry/Entries`);
      const tsCount = (data.test_schedule || []).filter(ts => ts.subject_id === id).length;
      if (tsCount) details.push(`${tsCount} Scheduled Test(s)`);
      const lpCount = (data.lecture_plan || []).filter(lp => lp.subject_id === id).length;
      if (lpCount) details.push(`${lpCount} Lecture Plan(s)`);
    } else if (table === 'terms') {
      const atCount = (data.assessment_types || []).filter(at => at.term_id === id).length;
      if (atCount) details.push(`${atCount} Assessment Type(s)`);
      const grCount = (data.grades || []).filter(g => g.term_id === id).length;
      if (grCount) details.push(`${grCount} Grade Record(s)`);
    } else if (table === 'assessment_types') {
      const grCount = (data.grades || []).filter(g => g.assessment_type_id === id).length;
      if (grCount) details.push(`${grCount} Grade Entry/Entries`);
      const tsCount = (data.test_schedule || []).filter(ts => ts.assessment_type_id === id).length;
      if (tsCount) details.push(`${tsCount} Test Schedule Item(s)`);
    } else if (table === 'grading_scheme') {
      if (row.is_active) details.push('Currently Active Institutional Scheme');
    } else if (table === 'promotion_rules') {
      if (row.is_active) details.push('Currently Active Promotion Policy');
    }

    return details;
  }

  async function deleteAcademicItem(id) {
    const row = (data[selected] || []).find(item => item.id === id);
    if (!row) return;

    const dependents = getDependentRecords(selected, row);
    if (dependents.length > 0) {
      // BLOCK DELETION OF IN-USE ITEMS
      const msg = `Cannot delete "${row.name || row.code || id}":\n\nThis item is currently referenced by:\n• ${dependents.join('\n• ')}\n\nDeleting records in use is blocked to preserve data integrity and academic history.\n\nWould you like to ARCHIVE this item instead?`;
      const doArchive = window.confirm(msg);
      if (doArchive && !row.archived) {
        await archiveAcademicItem(id);
      }
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${row.name || row.code || id}"?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    const sb = client();
    const result = await sb.from(selected).delete().eq('id', id);
    if (result.error) {
      showToast('Delete Failed', result.error.message, 'alert-circle');
      return;
    }

    showToast('Deleted', `"${row.name || row.code || id}" has been permanently removed.`, 'check');
    await loadAcademicData();
  }

  async function archiveAcademicItem(id) {
    const row = (data[selected] || []).find(item => item.id === id);
    if (!row) return;
    const action = row.archived ? 'restore' : 'archive';
    const confirmed = window.confirm(`Are you sure you want to ${action} "${row.name || row.code || id}"?`);
    if (!confirmed) return;

    const sb = client();
    const result = await sb.from(selected).update({ archived: !row.archived, updated_at: new Date().toISOString() }).eq('id', id);
    if (result.error) {
      showToast('Action Failed', result.error.message, 'alert-circle');
      return;
    }

    showToast('Updated', `"${row.name || row.code || id}" was ${action}d.`, 'check');
    await loadAcademicData();
  }

  function openSettingsEditor() {
    const settings = data.academic_settings?.[0] || {};
    const titleEl = $('academic-editor-title');
    if (titleEl) titleEl.textContent = 'Institutional Calendar & Period Timings';
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const container = $('academic-editor-fields');
    if (!container) return;

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Academic Session Start</label>
          <input id="academic-year-start" type="date" class="composer-input" required value="${esc(settings.academic_year_start || '2026-04-01')}">
        </div>
        <div class="form-group">
          <label class="form-label">Academic Session End</label>
          <input id="academic-year-end" type="date" class="composer-input" required value="${esc(settings.academic_year_end || '2027-03-31')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Operating Days</label>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${days.map(d => `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" name="academic-week-day" value="${d}" ${(settings.week_days || ['Monday','Tuesday','Wednesday','Thursday','Friday']).includes(d) ? 'checked' : ''}>
              <span>${d}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Periods Per Day</label>
        <input id="academic-periods-per-day" type="number" min="1" max="14" class="composer-input" required value="${esc(settings.periods_per_day || 8)}">
      </div>
      <div class="form-group">
        <label class="form-label">Daily Period Timings Schedule (JSON)</label>
        <textarea id="academic-period-timings" class="composer-textarea" rows="6">${esc(JSON.stringify(settings.period_timings || [], null, 2))}</textarea>
      </div>`;

    const modal = $('academic-editor-modal');
    if (modal) modal.style.display = 'flex';
  }

  async function saveSettings(event) {
    if (event) event.preventDefault();
    const sb = client();
    const cur = data.academic_settings?.[0] || {};
    const payload = {
      academic_year_start: $('academic-year-start')?.value || '2026-04-01',
      academic_year_end: $('academic-year-end')?.value || '2027-03-31',
      week_days: Array.from(document.querySelectorAll('[name="academic-week-day"]:checked')).map(i => i.value),
      periods_per_day: Number($('academic-periods-per-day')?.value || 8),
      updated_at: new Date().toISOString()
    };

    try {
      payload.period_timings = JSON.parse($('academic-period-timings')?.value || '[]');
    } catch (_) {
      showToast('Invalid JSON', 'Period timings must be a valid JSON array.', 'alert-circle');
      return;
    }

    let result;
    if (cur.id) {
      result = await sb.from('academic_settings').update(payload).eq('id', cur.id);
    } else {
      result = await sb.from('academic_settings').insert(payload);
    }

    if (result.error) {
      showToast('Save Failed', result.error.message, 'alert-circle');
      return;
    }

    closeEditor();
    await loadAcademicData();
    showToast('Calendar Saved', 'Institutional academic calendar updated.', 'check');
  }

  /* -------------------------------------------------------------------------
     FIRST-RUN SETUP WIZARD (6 STEPS)
     ------------------------------------------------------------------------- */
  const WIZARD_STEPS = [
    'School Identity & Branding',
    'Grade Levels & Cohort Sections',
    'Subject Catalog & Streams',
    'Evaluation Terms & Grading Scheme',
    'Operating Days & Period Timings',
    'Faculty Provisioning'
  ];

  const DEFAULT_ACADEMIC_STRUCTURE = {
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

  function startWizard() {
    wizardStep = Number(localStorage.getItem('academic_setup_wizard_step') || 0);
    renderWizardStep();
    const modal = $('academic-wizard-modal');
    if (modal) modal.style.display = 'flex';
  }

  function closeWizard() {
    const modal = $('academic-wizard-modal');
    if (modal) modal.style.display = 'none';
    localStorage.setItem('academic_setup_wizard', 'dismissed');
  }

  function wizardDraft() {
    try {
      return JSON.parse(localStorage.getItem('academic_setup_wizard_draft') || '{}');
    } catch (_) {
      return {};
    }
  }

  function wizardAcademicData(draft = wizardDraft()) {
    return {
      ...DEFAULT_ACADEMIC_STRUCTURE,
      ...Object.fromEntries(
        ['grade_levels', 'default_sections', 'subjects', 'streams', 'terms', 'grading_scheme', 'academic_settings', 'terminology']
          .filter(k => draft[k] !== undefined)
          .map(k => [k, draft[k]])
      )
    };
  }

  function renderWizardStep() {
    const draft = wizardDraft();
    const progressEl = $('academic-wizard-progress');
    if (progressEl) {
      progressEl.textContent = `Step ${wizardStep + 1} of ${WIZARD_STEPS.length} · ${WIZARD_STEPS[wizardStep]}`;
    }

    const backBtn = $('academic-wizard-back');
    if (backBtn) backBtn.disabled = wizardStep === 0;

    const nextBtn = $('academic-wizard-next');
    if (nextBtn) {
      nextBtn.textContent = wizardStep === WIZARD_STEPS.length - 1 ? 'Complete Setup' : 'Next Step';
    }

    let html = '';

    // Step 1: School Identity
    if (wizardStep === 0) {
      const schName = draft.school_name || data.academic_settings?.[0]?.school_name || window.SCHOOL_SETTINGS?.school_name || 'Brainz Edu World';
      const schCode = draft.school_code || data.academic_settings?.[0]?.school_code || 'SCH-2026';
      const schTag = draft.tagline || data.academic_settings?.[0]?.tagline || window.SCHOOL_SETTINGS?.tagline || 'Institutional Operating System';
      const schDomains = draft.allowed_domains || (window.SCHOOL_SETTINGS?.allowed_domains || ['brainz.edu']).join(', ');

      html = `
        <div class="form-group">
          <label class="form-label">School / Institution Name</label>
          <input id="wizard-school-name" class="composer-input" value="${esc(schName)}" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Institutional Code</label>
            <input id="wizard-school-code" class="composer-input" value="${esc(schCode)}">
          </div>
          <div class="form-group">
            <label class="form-label">Institutional Tagline</label>
            <input id="wizard-school-tagline" class="composer-input" value="${esc(schTag)}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Authorized Faculty Email Domain(s)</label>
          <input id="wizard-allowed-domains" class="composer-input" value="${esc(schDomains)}" required>
          <div class="subtext" style="margin-top:4px;">Comma-separated authorized domains (e.g. school.edu, brainz.edu).</div>
        </div>`;
    }

    const academicData = wizardAcademicData(draft);

    // Step 2: Grade Levels & Sections
    if (wizardStep === 1) {
      const gls = academicData.grade_levels || [];
      const secs = (academicData.default_sections || ['A', 'B', 'C', 'D']).join(', ');
      html = `
        <div style="margin-bottom:14px;padding:12px;background:var(--color-bg-base);border-radius:var(--radius-sm);border:1px solid var(--color-border);">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);margin-bottom:8px;">Configured Grade Levels Preview (${gls.length} stages)</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${gls.map(g => `<span class="badge" style="background:var(--color-bg-card);border:1px solid var(--color-border);font-size:12px;padding:4px 8px;"><strong style="color:var(--color-sage);">${esc(g.code || g.name)}</strong>: ${esc(g.name)} <span style="opacity:0.6;font-size:10px;">(${esc(g.stage || 'standard')})</span></span>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Cohort Section Names</label>
          <input id="wizard-section-names" class="composer-input" value="${esc(secs)}" placeholder="e.g. A, B, C, D">
          <div class="subtext" style="margin-top:4px;">Sections created for each grade level.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Grade Levels (JSON Specification)</label>
          <textarea id="wizard-grade-levels" class="composer-textarea" rows="7">${esc(JSON.stringify(gls, null, 2))}</textarea>
        </div>`;
    }

    // Step 3: Subjects & Streams
    if (wizardStep === 2) {
      const subs = academicData.subjects || [];
      const strs = academicData.streams || [];
      html = `
        <div style="margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="padding:12px;background:var(--color-bg-base);border-radius:var(--radius-sm);border:1px solid var(--color-border);">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);margin-bottom:6px;">Core & Elective Subjects (${subs.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;max-height:80px;overflow-y:auto;">
              ${subs.map(s => `<span class="badge" style="background:var(--color-bg-card);font-size:11px;padding:2px 6px;">${esc(s.name)}</span>`).join('')}
            </div>
          </div>
          <div style="padding:12px;background:var(--color-bg-base);border-radius:var(--radius-sm);border:1px solid var(--color-border);">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);margin-bottom:6px;">Streams / Tracks (${strs.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${strs.length ? strs.map(st => `<span class="badge" style="background:var(--color-bg-card);border:1px solid var(--color-sage);color:var(--color-sage);font-size:11px;padding:2px 6px;">${esc(st.name)}</span>`).join('') : '<span class="subtext">None (Unified General Curriculum)</span>'}
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Subjects Catalog (JSON Specification)</label>
          <textarea id="wizard-subjects" class="composer-textarea" rows="6">${esc(JSON.stringify(subs, null, 2))}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Academic Streams / Tracks (JSON Specification)</label>
          <textarea id="wizard-streams" class="composer-textarea" rows="3">${esc(JSON.stringify(strs, null, 2))}</textarea>
        </div>`;
    }

    // Step 4: Terms + Grading + Pass %
    if (wizardStep === 3) {
      const terms = academicData.terms || [];
      const gs = academicData.grading_scheme || {};
      const pr = academicData.promotion_rules || {};
      const bands = gs.bands || [];
      html = `
        <div style="margin-bottom:14px;padding:12px;background:var(--color-bg-base);border-radius:var(--radius-sm);border:1px solid var(--color-border);">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);margin-bottom:6px;">Grading System: ${esc(gs.name || 'Standard Scale')} (${esc(gs.type || 'percentage')})</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${bands.slice(0, 6).map(b => `<span class="badge" style="background:var(--color-bg-card);font-size:11px;padding:3px 6px;">${esc(b.grade || b.label)}: ${b.min}%-${b.max}%</span>`).join('')}
            ${bands.length > 6 ? `<span class="subtext" style="align-self:center;">+${bands.length - 6} more bands</span>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Pass Qualifying Threshold %</label>
            <input id="wizard-pass-threshold" type="number" step="any" class="composer-input" value="${esc(gs.pass_threshold_percent || 33)}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Max Grace Marks</label>
            <input id="wizard-grace-marks" type="number" step="any" class="composer-input" value="${esc(pr.grace_marks_max || 5)}" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Evaluation Terms & Semesters (JSON Array)</label>
          <textarea id="wizard-terms" class="composer-textarea" rows="4">${esc(JSON.stringify(terms, null, 2))}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Grading Scheme Bands & Formula (JSON Object)</label>
          <textarea id="wizard-grading" class="composer-textarea" rows="5">${esc(JSON.stringify(gs, null, 2))}</textarea>
        </div>`;
    }

    // Step 5: Operating Days + Period Timings
    if (wizardStep === 4) {
      const cal = academicData.academic_settings || {};
      const days = cal.week_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const timings = cal.period_timings || [];
      html = `
        <div style="margin-bottom:14px;padding:12px;background:var(--color-bg-base);border-radius:var(--radius-sm);border:1px solid var(--color-border);">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);margin-bottom:6px;">Operating Schedule Overview</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
            ${days.map(d => `<span class="badge" style="background:rgba(145, 159, 144, 0.22);color:var(--color-sage);font-size:11px;padding:3px 7px;">${esc(d)}</span>`).join('')}
          </div>
          <div class="subtext">${cal.periods_per_day || timings.length || 8} periods scheduled per school day</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Year Start Date</label>
            <input id="wizard-year-start" type="date" class="composer-input" value="${esc(cal.academic_year_start || '2026-04-01')}">
          </div>
          <div class="form-group">
            <label class="form-label">Year End Date</label>
            <input id="wizard-year-end" type="date" class="composer-input" value="${esc(cal.academic_year_end || '2027-03-31')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Operating Days & Period Timings (JSON Object)</label>
          <textarea id="wizard-calendar" class="composer-textarea" rows="7">${esc(JSON.stringify(cal, null, 2))}</textarea>
        </div>`;
    }

    // Step 6: Invite Teachers
    if (wizardStep === 5) {
      html = `
        <div style="text-align:center;padding:20px 10px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(145, 159, 144, 0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:var(--color-sage);">
            <i data-lucide="check-circle" style="width:28px;height:28px;"></i>
          </div>
          <h3 style="font-family:var(--font-heading);margin-bottom:6px;">Academic Architecture Configured</h3>
          <p class="subtext" style="max-width:480px;margin:0 auto 20px;">
            The school framework, terms, subjects, and grading schemes are ready. You can invite your teaching faculty now or complete setup and invite them anytime from Faculty Management.
          </p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button type="button" class="btn-secondary" onclick="academicCloseWizard();if(typeof navigateTo==='function')navigateTo('page-director-teachers');">
              <i data-lucide="user-plus"></i> Open Faculty Provisioning
            </button>
          </div>
        </div>`;
    }

    const container = $('academic-wizard-fields');
    if (container) {
      container.innerHTML = `
        <div class="card" style="margin:16px 0 10px;">${html}</div>
        <div style="height:6px;background:var(--color-border);border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${((wizardStep + 1) / WIZARD_STEPS.length) * 100}%;background:var(--color-blue);transition:width 0.25s ease;"></div>
        </div>`;
      if (window.lucide?.createIcons) window.lucide.createIcons();
    }
  }

  function persistWizardInputs() {
    const draft = wizardDraft();

    if (wizardStep === 0) {
      draft.school_name = $('wizard-school-name')?.value.trim() || '';
      draft.school_code = $('wizard-school-code')?.value.trim() || '';
      draft.tagline = $('wizard-school-tagline')?.value.trim() || '';
      draft.allowed_domains = $('wizard-allowed-domains')?.value.trim() || '';
    }

    if (wizardStep === 1) {
      try {
        draft.grade_levels = JSON.parse($('wizard-grade-levels')?.value || '[]');
        const secStr = $('wizard-section-names')?.value || 'A, B';
        draft.default_sections = secStr.split(',').map(s => s.trim()).filter(Boolean);
      } catch (_) {
        showToast('JSON Parse Error', 'Grade levels must be valid JSON.', 'alert-circle');
        return null;
      }
    }

    if (wizardStep === 2) {
      try {
        draft.subjects = JSON.parse($('wizard-subjects')?.value || '[]');
        draft.streams = JSON.parse($('wizard-streams')?.value || '[]');
      } catch (_) {
        showToast('JSON Parse Error', 'Subjects and streams must be valid JSON.', 'alert-circle');
        return null;
      }
    }

    if (wizardStep === 3) {
      try {
        draft.terms = JSON.parse($('wizard-terms')?.value || '[]');
        draft.grading_scheme = JSON.parse($('wizard-grading')?.value || '{}');
        draft.grading_scheme.pass_threshold_percent = Number($('wizard-pass-threshold')?.value || 33);
        draft.promotion_rules = {
          pass_threshold_percent: Number($('wizard-pass-threshold')?.value || 33),
          grace_marks_max: Number($('wizard-grace-marks')?.value || 5)
        };
      } catch (_) {
        showToast('JSON Parse Error', 'Terms and grading must be valid JSON.', 'alert-circle');
        return null;
      }
    }

    if (wizardStep === 4) {
      try {
        draft.academic_settings = JSON.parse($('wizard-calendar')?.value || '{}');
        if ($('wizard-year-start')?.value) draft.academic_settings.academic_year_start = $('wizard-year-start').value;
        if ($('wizard-year-end')?.value) draft.academic_settings.academic_year_end = $('wizard-year-end').value;
      } catch (_) {
        showToast('JSON Parse Error', 'Calendar settings must be valid JSON.', 'alert-circle');
        return null;
      }
    }

    localStorage.setItem('academic_setup_wizard_draft', JSON.stringify(draft));
    return draft;
  }

  function saveWizardDraft() {
    persistWizardInputs();
    localStorage.setItem('academic_setup_wizard_step', String(wizardStep));
    closeWizard();
    showToast('Progress Saved', 'Setup wizard progress saved on this device.', 'check');
  }

  async function applyAcademicSetupToDatabase(p) {
    const sb = client();
    if (!sb) throw new Error('Database connection unavailable.');
    const draft = wizardDraft();

    // 1. Grade Levels
    let savedGrades = [];
    if (Array.isArray(p.grade_levels) && p.grade_levels.length) {
      const glRows = p.grade_levels.map(({ id, ...row }, idx) => ({
        ...row,
        order_index: row.order_index || (idx + 1)
      }));
      const insGl = await sb.from('grade_levels').insert(glRows).select();
      if (!insGl.error) savedGrades = insGl.data || [];
    }

    // 2. Sections
    const secNames = Array.isArray(p.default_sections) && p.default_sections.length ? p.default_sections : ['A', 'B'];
    if (savedGrades.length) {
      const secRows = savedGrades.flatMap(g => secNames.map(s => ({
        grade_level_id: g.id,
        name: s,
        capacity: 35
      })));
      await sb.from('sections').insert(secRows);
    }

    // 3. Streams
    let savedStreams = [];
    if (Array.isArray(p.streams) && p.streams.length) {
      const insStr = await sb.from('streams').insert(p.streams.map(({ id, ...row }) => row)).select();
      if (!insStr.error) savedStreams = insStr.data || [];
    }

    // 4. Subjects
    let savedSubjects = [];
    if (Array.isArray(p.subjects) && p.subjects.length) {
      const insSub = await sb.from('subjects').insert(p.subjects.map(({ id, ...row }) => row)).select();
      if (!insSub.error) savedSubjects = insSub.data || [];
    }

    // 5. Terms
    let savedTerms = [];
    if (Array.isArray(p.terms) && p.terms.length) {
      const insTerms = await sb.from('terms').insert(p.terms.map(({ id, ...row }) => row)).select();
      if (!insTerms.error) savedTerms = insTerms.data || [];
    }

    // 6. Assessment Types
    if (Array.isArray(p.assessment_types) && p.assessment_types.length && savedTerms.length) {
      const atRows = p.assessment_types.map(({ id, term_id, ...row }) => ({
        ...row,
        term_id: savedTerms[0].id
      }));
      await sb.from('assessment_types').insert(atRows);
    }

    // 7. Grading Scheme
    if (p.grading_scheme) {
      const scheme = { ...p.grading_scheme, is_active: true };
      delete scheme.id;
      await sb.from('grading_scheme').insert(scheme);
    }

    // 8. Promotion Rules
    if (p.promotion_rules) {
      const rules = { ...p.promotion_rules, is_active: true };
      delete rules.id;
      await sb.from('promotion_rules').insert(rules);
    }

    // 9. Academic Settings
    const cal = p.academic_settings || {};
    const settingsPayload = {
      school_name: draft.school_name || cal.school_name || 'Brainz Edu World',
      school_code: draft.school_code || cal.school_code || 'SCH-2026',
      tagline: draft.tagline || cal.tagline || 'Institutional Operating System',
      academic_year_start: cal.academic_year_start || '2026-04-01',
      academic_year_end: cal.academic_year_end || '2027-03-31',
      week_days: cal.week_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periods_per_day: cal.periods_per_day || 8,
      period_timings: cal.period_timings || [],
      wizard_completed: true,
      updated_at: new Date().toISOString()
    };

    const curSettings = data.academic_settings?.[0];
    if (curSettings?.id) {
      await sb.from('academic_settings').update(settingsPayload).eq('id', curSettings.id);
    } else {
      await sb.from('academic_settings').insert(settingsPayload);
    }

    // 10. Terminology
    for (const [k, v] of Object.entries(p.terminology || {})) {
      await sb.from('terminology').upsert({
        key: k,
        label: v,
        default_label: defaultLabels[k] || v
      }, { onConflict: 'key' });
    }

    // 11. Sync branding if domain provided
    if (draft.allowed_domains && window.saveSchoolSettings) {
      try {
        const domInput = $('allowed-domains-input');
        if (domInput) domInput.value = draft.allowed_domains;
        const nameInput = $('school-name-input');
        if (nameInput) nameInput.value = draft.school_name;
        await saveSchoolSettings();
      } catch (_) {}
    }
  }

  async function wizardMove(direction) {
    const draft = persistWizardInputs();
    if (!draft) return;

    if (direction > 0 && wizardStep === 0 && !draft.school_name) {
      showToast('Required Information', 'School name is required.', 'alert-circle');
      return;
    }

    if (direction > 0 && wizardStep === WIZARD_STEPS.length - 1) {
      // Completion step
      try {
        const mergedData = wizardAcademicData(draft);
        await applyAcademicSetupToDatabase(mergedData);

        localStorage.removeItem('academic_setup_wizard_draft');
        localStorage.removeItem('academic_setup_wizard_step');
        localStorage.setItem('academic_setup_wizard', 'dismissed');

        closeWizard();
        await loadAcademicData();
        showToast('Setup Completed', 'Institutional academic architecture successfully initialized.', 'check');
      } catch (err) {
        showToast('Setup Error', err.message || 'Could not complete setup.', 'alert-circle');
      }
      return;
    }

    wizardStep = Math.max(0, Math.min(WIZARD_STEPS.length - 1, wizardStep + direction));
    localStorage.setItem('academic_setup_wizard_step', String(wizardStep));
    renderWizardStep();
  }

  window.academicSelectConfig = function (key) {
    selected = key;
    renderConfig();
  };

  window.academicOpenEditor = openEditor;
  window.academicCloseEditor = closeEditor;
  window.academicSaveEditor = saveEditor;
  window.academicDelete = deleteAcademicItem;
  window.academicArchive = archiveAcademicItem;
  window.academicOpenSettingsEditor = openSettingsEditor;
  window.academicSaveSettings = saveSettings;
  window.academicStartWizard = startWizard;
  window.academicCloseWizard = closeWizard;
  window.academicWizardMove = wizardMove;
  window.academicSaveWizardDraft = saveWizardDraft;
  window.loadAcademicSetupData = loadAcademicData;

  window.addEventListener('DOMContentLoaded', () => {
    installSubPages();
    installNavigation();
    if (window.STATE?.currentUser?.role === 'director') {
      loadAcademicData();
    }
  });

  // Navigation interceptor to synchronize views
  const originalNavigateTo = window.navigateTo;
  if (typeof originalNavigateTo === 'function') {
    window.navigateTo = function (pageId, ...args) {
      const matchConfig = CONFIG_PAGES.find(c => c.pageId === pageId);
      if (matchConfig) {
        selected = matchConfig.key;
      } else if (pageId === 'page-director-academic-setup') {
        selected = 'grade_levels';
      }
      const res = originalNavigateTo.call(this, pageId, ...args);
      if (pageId.startsWith('page-director-academic')) {
        loadAcademicData();
        renderConfig();
      }
      return res;
    };
  }

  const originalTransition = window.executePageTransition;
  if (typeof originalTransition === 'function') {
    window.executePageTransition = function (pageId, ...args) {
      const matchConfig = CONFIG_PAGES.find(c => c.pageId === pageId);
      if (matchConfig) {
        selected = matchConfig.key;
      }
      const res = originalTransition.call(this, pageId, ...args);
      if (pageId.startsWith('page-director-academic')) {
        loadAcademicData();
        renderConfig();
      }
      return res;
    };
  }

})();
