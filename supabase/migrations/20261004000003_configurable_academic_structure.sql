-- =============================================================================
-- Migration: 20261004000001_configurable_academic_structure.sql
-- Description:
--   Fully configurable academic structure for Eduvia:
--   1. academic_settings (board type, label, year dates, working days, period timings)
--   2. terminology (custom label overrides across whole UI: grade, section, stream, etc.)
--   3. grade_levels, sections, streams
--   4. subjects, subject_grade_levels, subject_streams
--   5. terms (semesters, trimesters, quarters, custom)
--   6. assessment_types, assessment_type_subjects
--   7. grading_scheme (percentage, letter, gpa, points 1-7, bands JSONB)
--   8. promotion_rules (pass criteria, compulsory subjects, grace marks)
--   10. Refactor existing tables (timetable_entries, attendance_records, grades,
--       assignments, lecture_plan, test_schedule, profiles) to reference new IDs
--   11. Data migration preserving current records (XI-B, Commerce, Quiz/Case Study/Pres)
-- Stack: Supabase PostgreSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TERMINOLOGY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.terminology (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    default_label TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.terminology ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "terminology_select_authenticated" ON public.terminology;
CREATE POLICY "terminology_select_authenticated" ON public.terminology FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "terminology_modify_director" ON public.terminology;
CREATE POLICY "terminology_modify_director" ON public.terminology FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 2. ACADEMIC SETTINGS (Single Institutional Configuration Row)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL DEFAULT 'Brainz Edu World',
    school_code TEXT DEFAULT 'SCH-2026',
    tagline TEXT DEFAULT 'Institutional Operating System',
    crest_symbol TEXT DEFAULT 'B',
    academic_year_start DATE NOT NULL,
    academic_year_end DATE NOT NULL,
    week_days JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    periods_per_day INTEGER NOT NULL DEFAULT 8,
    period_timings JSONB NOT NULL DEFAULT '[]'::jsonb,
    wizard_completed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_settings_select_authenticated" ON public.academic_settings;
CREATE POLICY "academic_settings_select_authenticated" ON public.academic_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "academic_settings_modify_director" ON public.academic_settings;
CREATE POLICY "academic_settings_modify_director" ON public.academic_settings FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 3. GRADE LEVELS (Classes / Years / Grades)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grade_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                      -- e.g. "Class I", "Grade 11", "Year 12"
    code TEXT NOT NULL,                      -- e.g. "1", "XI", "12"
    order_index INTEGER NOT NULL DEFAULT 1,
    stage TEXT NOT NULL CHECK (stage IN ('primary', 'middle', 'secondary', 'senior', 'custom')),
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_grade_levels_order ON public.grade_levels(order_index);
CREATE INDEX IF NOT EXISTS idx_grade_levels_archived ON public.grade_levels(archived);

ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grade_levels_select_authenticated" ON public.grade_levels;
CREATE POLICY "grade_levels_select_authenticated" ON public.grade_levels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "grade_levels_modify_director" ON public.grade_levels;
CREATE POLICY "grade_levels_modify_director" ON public.grade_levels FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 4. SECTIONS (Cohorts / Divisions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level_id UUID NOT NULL REFERENCES public.grade_levels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                      -- e.g. "A", "B", "C"
    class_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    capacity INTEGER NOT NULL DEFAULT 35,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_grade_section_name UNIQUE (grade_level_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sections_grade_level ON public.sections(grade_level_id);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sections_select_authenticated" ON public.sections;
CREATE POLICY "sections_select_authenticated" ON public.sections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sections_modify_director" ON public.sections;
CREATE POLICY "sections_modify_director" ON public.sections FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 5. STREAMS (Tracks / Disciplines)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,               -- e.g. "Science", "Commerce", "Humanities"
    code TEXT,
    description TEXT,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "streams_select_authenticated" ON public.streams;
CREATE POLICY "streams_select_authenticated" ON public.streams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "streams_modify_director" ON public.streams;
CREATE POLICY "streams_modify_director" ON public.streams FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 6. SUBJECTS & JOIN TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                      -- e.g. "Political Science", "Physics"
    code TEXT NOT NULL UNIQUE,               -- e.g. "POL-101", "PHY-101"
    category TEXT NOT NULL CHECK (category IN ('core', 'elective', 'language', 'co-curricular')),
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subject_grade_levels (
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    grade_level_id UUID NOT NULL REFERENCES public.grade_levels(id) ON DELETE CASCADE,
    PRIMARY KEY (subject_id, grade_level_id)
);

CREATE TABLE IF NOT EXISTS public.subject_streams (
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    PRIMARY KEY (subject_id, stream_id)
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subjects_select_authenticated" ON public.subjects;
CREATE POLICY "subjects_select_authenticated" ON public.subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects_modify_director" ON public.subjects;
CREATE POLICY "subjects_modify_director" ON public.subjects FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

DROP POLICY IF EXISTS "sub_gl_select_authenticated" ON public.subject_grade_levels;
CREATE POLICY "sub_gl_select_authenticated" ON public.subject_grade_levels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sub_gl_modify_director" ON public.subject_grade_levels;
CREATE POLICY "sub_gl_modify_director" ON public.subject_grade_levels FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

DROP POLICY IF EXISTS "sub_st_select_authenticated" ON public.subject_streams;
CREATE POLICY "sub_st_select_authenticated" ON public.subject_streams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sub_st_modify_director" ON public.subject_streams;
CREATE POLICY "sub_st_modify_director" ON public.subject_streams FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 7. TERMS (Semesters / Trimesters / Quarters)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                      -- e.g. "Term 1", "Semester 1", "Quarter 1"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weightage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    order_index INTEGER NOT NULL DEFAULT 1,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "terms_select_authenticated" ON public.terms;
CREATE POLICY "terms_select_authenticated" ON public.terms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "terms_modify_director" ON public.terms;
CREATE POLICY "terms_modify_director" ON public.terms FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 8. ASSESSMENT TYPES (Replaces hardcoded Quiz/Case Study/Presentation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                      -- e.g. "Unit Test", "Half-Yearly", "Project", "Practical"
    code TEXT,
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00,
    weightage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    applies_to_all_subjects BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 1,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.assessment_type_subjects (
    assessment_type_id UUID NOT NULL REFERENCES public.assessment_types(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (assessment_type_id, subject_id)
);

ALTER TABLE public.assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_type_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_types_select_authenticated" ON public.assessment_types;
CREATE POLICY "assessment_types_select_authenticated" ON public.assessment_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "assessment_types_modify_director" ON public.assessment_types;
CREATE POLICY "assessment_types_modify_director" ON public.assessment_types FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

DROP POLICY IF EXISTS "ats_select_authenticated" ON public.assessment_type_subjects;
CREATE POLICY "ats_select_authenticated" ON public.assessment_type_subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ats_modify_director" ON public.assessment_type_subjects;
CREATE POLICY "ats_modify_director" ON public.assessment_type_subjects FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

-- -----------------------------------------------------------------------------
-- 9. GRADING SCHEME & PROMOTION RULES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grading_scheme (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'letter', 'gpa', 'points_1_7', 'custom')),
    bands JSONB NOT NULL,                    -- array of { min, max, grade, remark, gpa_point }
    pass_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 40.00,
    rounding_rule TEXT NOT NULL DEFAULT 'round' CHECK (rounding_rule IN ('round', 'floor', 'ceil')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.promotion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Institutional Promotion Criteria',
    pass_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 40.00,
    assessment_weights JSONB NOT NULL DEFAULT '[]'::jsonb,
    compulsory_subject_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    grace_marks_max NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.grading_scheme ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grading_scheme_select_authenticated" ON public.grading_scheme;
CREATE POLICY "grading_scheme_select_authenticated" ON public.grading_scheme FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "grading_scheme_modify_director" ON public.grading_scheme;
CREATE POLICY "grading_scheme_modify_director" ON public.grading_scheme FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());

DROP POLICY IF EXISTS "promotion_rules_select_authenticated" ON public.promotion_rules;
CREATE POLICY "promotion_rules_select_authenticated" ON public.promotion_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "promotion_rules_modify_director" ON public.promotion_rules;
CREATE POLICY "promotion_rules_modify_director" ON public.promotion_rules FOR ALL TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());


-- -----------------------------------------------------------------------------
-- 11. REFACTOR EXISTING TABLES TO REFERENCE NEW ACADEMIC ENTITIES
-- -----------------------------------------------------------------------------

-- 11.1 profiles: Add academic relational columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade_level_id UUID REFERENCES public.grade_levels(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL;

-- 11.2 timetable_entries: Add section_id & subject_id
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- 11.3 attendance_records: Add section_id
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- 11.4 assignments: Add section_id & subject_id
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- 11.5 lecture_plan: Add section_id & subject_id
ALTER TABLE public.lecture_plan ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.lecture_plan ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- 11.6 test_schedule: Add section_id, subject_id, & assessment_type_id
ALTER TABLE public.test_schedule ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.test_schedule ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.test_schedule ADD COLUMN IF NOT EXISTS assessment_type_id UUID REFERENCES public.assessment_types(id) ON DELETE SET NULL;

-- 11.7 grades: Loosen category to text, add assessment_type_id, subject_id, term_id
DO $$
BEGIN
    ALTER TABLE public.grades ALTER COLUMN category TYPE TEXT USING category::TEXT;
    ALTER TABLE public.grades ALTER COLUMN category DROP NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS assessment_type_id UUID REFERENCES public.assessment_types(id) ON DELETE SET NULL;
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL;

-- 11.8 INDEXES ON LOOKUP COLUMNS
CREATE INDEX IF NOT EXISTS idx_sections_class_teacher ON public.sections(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_sections_archived ON public.sections(archived);
CREATE INDEX IF NOT EXISTS idx_grade_levels_stage ON public.grade_levels(stage);
CREATE INDEX IF NOT EXISTS idx_streams_archived ON public.streams(archived);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_category ON public.subjects(category);
CREATE INDEX IF NOT EXISTS idx_subjects_archived ON public.subjects(archived);
CREATE INDEX IF NOT EXISTS idx_subject_grade_levels_grade_level ON public.subject_grade_levels(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_subject_streams_stream ON public.subject_streams(stream_id);
CREATE INDEX IF NOT EXISTS idx_terms_archived ON public.terms(archived);
CREATE INDEX IF NOT EXISTS idx_terms_dates ON public.terms(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assessment_types_term ON public.assessment_types(term_id);
CREATE INDEX IF NOT EXISTS idx_assessment_types_archived ON public.assessment_types(archived);
CREATE INDEX IF NOT EXISTS idx_assessment_type_subjects_subject ON public.assessment_type_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_grading_scheme_active ON public.grading_scheme(is_active);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_active ON public.promotion_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_grade_level ON public.profiles(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_profiles_section ON public.profiles(section_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stream ON public.profiles(stream_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_section ON public.timetable_entries(section_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_subject ON public.timetable_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_section ON public.attendance_records(section_id);
CREATE INDEX IF NOT EXISTS idx_assignments_section ON public.assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_lecture_plan_section ON public.lecture_plan(section_id);
CREATE INDEX IF NOT EXISTS idx_lecture_plan_subject ON public.lecture_plan(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_schedule_section ON public.test_schedule(section_id);
CREATE INDEX IF NOT EXISTS idx_test_schedule_subject ON public.test_schedule(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_schedule_assessment_type ON public.test_schedule(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment_type ON public.grades(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON public.grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_term ON public.grades(term_id);

-- -----------------------------------------------------------------------------
-- 12. SEED DEFAULT TERMINOLOGY & PRESETS
-- -----------------------------------------------------------------------------
INSERT INTO public.terminology (key, label, default_label, description)
VALUES
    ('grade_level', 'Class', 'Class', 'Label for grade or cohort level (e.g. Class, Grade, Year)'),
    ('section', 'Section', 'Section', 'Label for division or section within a grade (e.g. Section, Division, Set)'),
    ('stream', 'Stream', 'Stream', 'Label for specialized stream or track (e.g. Stream, Track, Pathway)'),
    ('term', 'Term', 'Term', 'Label for evaluation period (e.g. Term, Semester, Trimester, Quarter)'),
    ('subject', 'Subject', 'Subject', 'Label for academic discipline (e.g. Subject, Course, Module)'),
    ('house', 'House', 'House', 'Label for institutional pastoral group (e.g. House, Advisory, Pod)'),
    ('teacher', 'Teacher', 'Teacher', 'Label for teaching faculty (e.g. Teacher, Faculty, Instructor, Tutor)'),
    ('director', 'Director', 'Director', 'Label for executive school head (e.g. Director, Principal, Headmaster)')
ON CONFLICT (key) DO NOTHING;

-- Seed Default Academic Settings (CBSE baseline)
INSERT INTO public.academic_settings (
    school_name, school_code, tagline, crest_symbol,
    academic_year_start, academic_year_end, week_days, periods_per_day, period_timings, wizard_completed
)
VALUES (
    'Brainz Edu World',
    'SCH-2026',
    'Institutional Operating System',
    'B',
    '2026-04-01',
    '2027-03-31',
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    8,
    '[
        {"period": 1, "start_time": "08:30", "end_time": "09:15", "label": "Period 1"},
        {"period": 2, "start_time": "09:15", "end_time": "10:00", "label": "Period 2"},
        {"period": 3, "start_time": "10:00", "end_time": "10:45", "label": "Period 3"},
        {"period": 4, "start_time": "11:00", "end_time": "11:45", "label": "Period 4 (Post-Recess)"},
        {"period": 5, "start_time": "11:45", "end_time": "12:30", "label": "Period 5"},
        {"period": 6, "start_time": "12:30", "end_time": "13:15", "label": "Period 6"},
        {"period": 7, "start_time": "13:45", "end_time": "14:30", "label": "Period 7"},
        {"period": 8, "start_time": "14:30", "end_time": "15:15", "label": "Period 8"}
    ]'::jsonb,
    true
)
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- 14. DATA MIGRATION: SEED ACTIVE BASELINE & BACKFILL EXISTING TABLES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_gl_id UUID;
    v_sec_id UUID;
    v_str_id UUID;
    v_sub_id UUID;
    v_term1_id UUID;
    v_term2_id UUID;
    v_quiz_id UUID;
    v_case_id UUID;
    v_pres_id UUID;
    g INT;
    s TEXT;
    sections_arr TEXT[] := ARRAY['A', 'B', 'C', 'D'];
    romans TEXT[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
    -- 14.1 Seed Grade Levels 1 to 12
    FOR g IN 1..12 LOOP
        INSERT INTO public.grade_levels (name, code, order_index, stage)
        VALUES (
            'Class ' || romans[g],
            romans[g],
            g,
            CASE
                WHEN g <= 5 THEN 'primary'
                WHEN g <= 8 THEN 'middle'
                WHEN g <= 10 THEN 'secondary'
                ELSE 'senior'
            END
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- 14.2 Seed Sections A-D for each Grade Level
    FOR g IN 1..12 LOOP
        SELECT id INTO v_gl_id FROM public.grade_levels WHERE order_index = g LIMIT 1;
        IF v_gl_id IS NOT NULL THEN
            FOREACH s IN ARRAY sections_arr LOOP
                INSERT INTO public.sections (grade_level_id, name, capacity)
                VALUES (v_gl_id, s, 35)
                ON CONFLICT (grade_level_id, name) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;

    -- 14.3 Seed Streams (Science, Commerce, Humanities)
    INSERT INTO public.streams (name, code, description)
    VALUES
        ('Science', 'SCI', 'Physics, Chemistry, Mathematics, Biology stream'),
        ('Commerce', 'COMM', 'Accountancy, Business Studies, Economics stream'),
        ('Humanities', 'HUM', 'Political Science, History, Economics stream')
    ON CONFLICT (name) DO NOTHING;

    -- 14.4 Seed Core Subjects
    INSERT INTO public.subjects (name, code, category)
    VALUES
        ('Political Science', 'POL-101', 'core'),
        ('Economics', 'ECO-101', 'core'),
        ('Business Studies', 'BST-101', 'core'),
        ('Accountancy', 'ACC-101', 'core'),
        ('Mathematics', 'MTH-101', 'core'),
        ('English Core', 'ENG-101', 'language'),
        ('Physics', 'PHY-101', 'core'),
        ('Chemistry', 'CHE-101', 'core'),
        ('Biology', 'BIO-101', 'core'),
        ('Computer Science', 'CS-101', 'elective'),
        ('Physical Education', 'PE-101', 'co-curricular')
    ON CONFLICT (code) DO NOTHING;

    -- Associate senior subjects with Commerce/Humanities streams and XI/XII grade levels
    FOR v_gl_id IN SELECT id FROM public.grade_levels WHERE order_index IN (11, 12) LOOP
        FOR v_sub_id IN SELECT id FROM public.subjects LOOP
            INSERT INTO public.subject_grade_levels (subject_id, grade_level_id)
            VALUES (v_sub_id, v_gl_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    SELECT id INTO v_str_id FROM public.streams WHERE name = 'Commerce' LIMIT 1;
    IF v_str_id IS NOT NULL THEN
        FOR v_sub_id IN SELECT id FROM public.subjects WHERE code IN ('POL-101', 'ECO-101', 'BST-101', 'ACC-101', 'MTH-101', 'ENG-101') LOOP
            INSERT INTO public.subject_streams (subject_id, stream_id)
            VALUES (v_sub_id, v_str_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- 14.5 Seed Terms
    INSERT INTO public.terms (name, start_date, end_date, weightage, order_index)
    VALUES ('Term 1', '2026-04-01', '2026-09-30', 50.00, 1)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_term1_id FROM public.terms WHERE name = 'Term 1' LIMIT 1;

    INSERT INTO public.terms (name, start_date, end_date, weightage, order_index)
    VALUES ('Term 2', '2026-10-01', '2027-03-31', 50.00, 2)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_term2_id FROM public.terms WHERE name = 'Term 2' LIMIT 1;

    -- 14.6 Seed Assessment Types (Mapping Quiz, Case Study, Presentation + Periodic Tests)
    INSERT INTO public.assessment_types (name, code, max_marks, weightage, term_id, applies_to_all_subjects, order_index)
    VALUES
        ('Quiz', 'quiz', 20.00, 10.00, v_term1_id, true, 1),
        ('Case Study', 'case_study', 40.00, 20.00, v_term1_id, true, 2),
        ('Presentation', 'presentation', 40.00, 20.00, v_term1_id, true, 3),
        ('Periodic Test 1', 'pt1', 20.00, 10.00, v_term1_id, true, 4),
        ('Half-Yearly Examination', 'hy', 80.00, 40.00, v_term1_id, true, 5),
        ('Annual Examination', 'ae', 80.00, 40.00, v_term2_id, true, 6)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_quiz_id FROM public.assessment_types WHERE code = 'quiz' LIMIT 1;
    SELECT id INTO v_case_id FROM public.assessment_types WHERE code = 'case_study' LIMIT 1;
    SELECT id INTO v_pres_id FROM public.assessment_types WHERE code = 'presentation' LIMIT 1;

    -- 14.7 Seed Grading Scheme
    INSERT INTO public.grading_scheme (name, type, bands, pass_threshold_percent, rounding_rule, is_active)
    VALUES (
        'Standard 9-Point Grading Scheme',
        'percentage',
        '[
            {"min": 91, "max": 100, "grade": "A1", "remark": "Outstanding", "gpa_point": 10},
            {"min": 81, "max": 90, "grade": "A2", "remark": "Excellent", "gpa_point": 9},
            {"min": 71, "max": 80, "grade": "B1", "remark": "Very Good", "gpa_point": 8},
            {"min": 61, "max": 70, "grade": "B2", "remark": "Good", "gpa_point": 7},
            {"min": 51, "max": 60, "grade": "C1", "remark": "Fair", "gpa_point": 6},
            {"min": 41, "max": 50, "grade": "C2", "remark": "Average", "gpa_point": 5},
            {"min": 33, "max": 40, "grade": "D", "remark": "Pass", "gpa_point": 4},
            {"min": 21, "max": 32, "grade": "E1", "remark": "Essential Repeat", "gpa_point": 0},
            {"min": 0, "max": 20, "grade": "E2", "remark": "Fail", "gpa_point": 0}
        ]'::jsonb,
        33.00,
        'round',
        true
    )
    ON CONFLICT DO NOTHING;

    -- 14.8 Seed Promotion Rules
    INSERT INTO public.promotion_rules (name, pass_threshold_percent, assessment_weights, compulsory_subject_ids, grace_marks_max, is_active)
    VALUES (
        'Institutional Year-End Promotion Policy',
        33.00,
        '[{"code": "quiz", "weight": 10}, {"code": "case_study", "weight": 20}, {"code": "presentation", "weight": 20}, {"code": "hy", "weight": 25}, {"code": "ae", "weight": 25}]'::jsonb,
        '[]'::jsonb,
        5.00,
        true
    )
    ON CONFLICT DO NOTHING;

    -- 14.9 Backfill Section IDs and Stream IDs on Profiles
    -- Look up XI-B, XII-B, XI-A, XII-A etc.
    FOR g IN 1..12 LOOP
        SELECT id INTO v_gl_id FROM public.grade_levels WHERE order_index = g LIMIT 1;
        FOREACH s IN ARRAY sections_arr LOOP
            SELECT id INTO v_sec_id FROM public.sections WHERE grade_level_id = v_gl_id AND name = s LIMIT 1;
            IF v_sec_id IS NOT NULL THEN
                -- Match format "XI-B", "Class XI-B", "11-B", "3-A"
                UPDATE public.profiles
                SET grade_level_id = v_gl_id,
                    section_id = v_sec_id
                WHERE section_id IS NULL
                  AND (
                      class_section ILIKE ('%' || romans[g] || '-' || s || '%')
                      OR class_section ILIKE ('%' || g::TEXT || '-' || s || '%')
                  );

                -- Backfill timetable_entries
                UPDATE public.timetable_entries
                SET section_id = v_sec_id
                WHERE section_id IS NULL
                  AND (
                      class_section ILIKE ('%' || romans[g] || '-' || s || '%')
                      OR class_section ILIKE ('%' || g::TEXT || '-' || s || '%')
                  );

                -- Backfill attendance_records
                UPDATE public.attendance_records ar
                SET section_id = v_sec_id
                FROM public.profiles p
                WHERE ar.student_id = p.id
                  AND ar.section_id IS NULL
                  AND (
                      p.class_section ILIKE ('%' || romans[g] || '-' || s || '%')
                      OR p.class_section ILIKE ('%' || g::TEXT || '-' || s || '%')
                  );

                -- Backfill assignments
                UPDATE public.assignments
                SET section_id = v_sec_id
                WHERE section_id IS NULL
                  AND (
                      class_section ILIKE ('%' || romans[g] || '-' || s || '%')
                      OR class_section ILIKE ('%' || g::TEXT || '-' || s || '%')
                  );

                -- Backfill lecture_plan
                UPDATE public.lecture_plan
                SET section_id = v_sec_id
                WHERE section_id IS NULL
                  AND (
                      class_section ILIKE ('%' || romans[g] || '-' || s || '%')
                      OR class_section ILIKE ('%' || g::TEXT || '-' || s || '%')
                  );

                -- Backfill test_schedule
                UPDATE public.test_schedule
                SET section_id = v_sec_id
                WHERE section_id IS NULL
                  AND (
                      class_section ILIKE ('%' || romans[g] || '-' || s || '%')
                      OR class_section ILIKE ('%' || g::TEXT || '-' || s || '%')
                  );
            END IF;
        END LOOP;
    END LOOP;

    -- Backfill streams on profiles
    SELECT id INTO v_str_id FROM public.streams WHERE name = 'Commerce' LIMIT 1;
    IF v_str_id IS NOT NULL THEN
        UPDATE public.profiles SET stream_id = v_str_id
        WHERE stream_id IS NULL AND (class_section ILIKE '%Commerce%' OR class_section IN ('XI-B', 'XII-B', 'XI-A', 'XII-A'));
    END IF;

    -- 14.10 Backfill Subject IDs
    FOR v_sub_id IN SELECT id FROM public.subjects LOOP
        SELECT name INTO s FROM public.subjects WHERE id = v_sub_id;
        UPDATE public.timetable_entries SET subject_id = v_sub_id WHERE subject_id IS NULL AND subject ILIKE ('%' || s || '%');
        UPDATE public.assignments SET subject_id = v_sub_id WHERE subject_id IS NULL AND subject ILIKE ('%' || s || '%');
        UPDATE public.lecture_plan SET subject_id = v_sub_id WHERE subject_id IS NULL AND subject ILIKE ('%' || s || '%');
        UPDATE public.test_schedule SET subject_id = v_sub_id WHERE subject_id IS NULL AND subject ILIKE ('%' || s || '%');
        UPDATE public.grades SET subject_id = v_sub_id WHERE subject_id IS NULL;
    END LOOP;

    -- 14.11 Backfill Assessment Types on Grades
    IF v_quiz_id IS NOT NULL THEN
        UPDATE public.grades SET assessment_type_id = v_quiz_id, term_id = v_term1_id
        WHERE assessment_type_id IS NULL AND (category = 'quiz' OR category ILIKE '%quiz%');
    END IF;
    IF v_case_id IS NOT NULL THEN
        UPDATE public.grades SET assessment_type_id = v_case_id, term_id = v_term1_id
        WHERE assessment_type_id IS NULL AND (category = 'case_study' OR category ILIKE '%case%');
    END IF;
    IF v_pres_id IS NOT NULL THEN
        UPDATE public.grades SET assessment_type_id = v_pres_id, term_id = v_term1_id
        WHERE assessment_type_id IS NULL AND (category = 'presentation' OR category ILIKE '%pres%');
    END IF;

    -- Any remaining grades default to Quiz
    IF v_quiz_id IS NOT NULL THEN
        UPDATE public.grades SET assessment_type_id = v_quiz_id, term_id = v_term1_id WHERE assessment_type_id IS NULL;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 15. REALTIME PUBLICATION
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_settings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.terminology;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_levels;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.terms;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_types;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.grading_scheme;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.promotion_rules;
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;
