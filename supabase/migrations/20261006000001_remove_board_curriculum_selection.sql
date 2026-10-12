-- =============================================================================
-- Migration: 20261006000001_remove_board_curriculum_selection.sql
-- Description:
--   Removes curriculum / board selection (CBSE, ICSE, and foreign board options)
--   and reverts database structure to a single generalized, board-agnostic format.
-- =============================================================================

-- 1. Drop academic_presets table
DROP TABLE IF EXISTS public.academic_presets CASCADE;

-- 2. Drop board-specific configuration columns from academic_settings
ALTER TABLE public.academic_settings
    DROP COLUMN IF EXISTS board_type,
    DROP COLUMN IF EXISTS board_label;

-- 3. Drop board_label from school_settings
ALTER TABLE public.school_settings
    DROP COLUMN IF EXISTS board_label;
