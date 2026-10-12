-- =============================================================================
-- Migration Down: 20261004000003_configurable_academic_structure_down.sql
-- Description:
--   Reversible-safe rollback for configurable academic structure.
--   Safely drops relational columns, lookup indexes, and new academic tables.
-- =============================================================================

-- 1. Remove publication tables
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.promotion_rules;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.grading_scheme;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.assessment_types;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.terms;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.subjects;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.streams;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.sections;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.grade_levels;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.terminology;
        ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.academic_settings;
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;

-- 2. Drop Lookup Indexes
DROP INDEX IF EXISTS public.idx_grades_term;
DROP INDEX IF EXISTS public.idx_grades_subject;
DROP INDEX IF EXISTS public.idx_grades_assessment_type;
DROP INDEX IF EXISTS public.idx_test_schedule_assessment_type;
DROP INDEX IF EXISTS public.idx_test_schedule_subject;
DROP INDEX IF EXISTS public.idx_test_schedule_section;
DROP INDEX IF EXISTS public.idx_lecture_plan_subject;
DROP INDEX IF EXISTS public.idx_lecture_plan_section;
DROP INDEX IF EXISTS public.idx_assignments_subject;
DROP INDEX IF EXISTS public.idx_assignments_section;
DROP INDEX IF EXISTS public.idx_attendance_records_section;
DROP INDEX IF EXISTS public.idx_timetable_entries_subject;
DROP INDEX IF EXISTS public.idx_timetable_entries_section;
DROP INDEX IF EXISTS public.idx_profiles_stream;
DROP INDEX IF EXISTS public.idx_profiles_section;
DROP INDEX IF EXISTS public.idx_profiles_grade_level;
DROP INDEX IF EXISTS public.idx_promotion_rules_active;
DROP INDEX IF EXISTS public.idx_grading_scheme_active;
DROP INDEX IF EXISTS public.idx_assessment_type_subjects_subject;
DROP INDEX IF EXISTS public.idx_assessment_types_archived;
DROP INDEX IF EXISTS public.idx_assessment_types_term;
DROP INDEX IF EXISTS public.idx_terms_dates;
DROP INDEX IF EXISTS public.idx_terms_archived;
DROP INDEX IF EXISTS public.idx_subject_streams_stream;
DROP INDEX IF EXISTS public.idx_subject_grade_levels_grade_level;
DROP INDEX IF EXISTS public.idx_subjects_archived;
DROP INDEX IF EXISTS public.idx_subjects_category;
DROP INDEX IF EXISTS public.idx_subjects_code;
DROP INDEX IF EXISTS public.idx_streams_archived;
DROP INDEX IF EXISTS public.idx_grade_levels_stage;
DROP INDEX IF EXISTS public.idx_sections_archived;
DROP INDEX IF EXISTS public.idx_sections_class_teacher;
DROP INDEX IF EXISTS public.idx_sections_grade_level;
DROP INDEX IF EXISTS public.idx_grade_levels_archived;
DROP INDEX IF EXISTS public.idx_grade_levels_order;

-- 3. Remove Foreign Key Columns Added to Existing Tables
ALTER TABLE public.grades DROP COLUMN IF EXISTS term_id;
ALTER TABLE public.grades DROP COLUMN IF EXISTS subject_id;
ALTER TABLE public.grades DROP COLUMN IF EXISTS assessment_type_id;

ALTER TABLE public.test_schedule DROP COLUMN IF EXISTS assessment_type_id;
ALTER TABLE public.test_schedule DROP COLUMN IF EXISTS subject_id;
ALTER TABLE public.test_schedule DROP COLUMN IF EXISTS section_id;

ALTER TABLE public.lecture_plan DROP COLUMN IF EXISTS subject_id;
ALTER TABLE public.lecture_plan DROP COLUMN IF EXISTS section_id;

ALTER TABLE public.assignments DROP COLUMN IF EXISTS subject_id;
ALTER TABLE public.assignments DROP COLUMN IF EXISTS section_id;

ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS section_id;

ALTER TABLE public.timetable_entries DROP COLUMN IF EXISTS subject_id;
ALTER TABLE public.timetable_entries DROP COLUMN IF EXISTS section_id;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS stream_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS section_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS grade_level_id;

-- 4. Drop Join and Dependent Tables
DROP TABLE IF EXISTS public.assessment_type_subjects CASCADE;
DROP TABLE IF EXISTS public.subject_streams CASCADE;
DROP TABLE IF EXISTS public.subject_grade_levels CASCADE;

-- 5. Drop Core Academic Architecture Tables
DROP TABLE IF EXISTS public.promotion_rules CASCADE;
DROP TABLE IF EXISTS public.grading_scheme CASCADE;
DROP TABLE IF EXISTS public.assessment_types CASCADE;
DROP TABLE IF EXISTS public.terms CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.streams CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.grade_levels CASCADE;
DROP TABLE IF EXISTS public.academic_presets CASCADE;
DROP TABLE IF EXISTS public.academic_settings CASCADE;
DROP TABLE IF EXISTS public.terminology CASCADE;
