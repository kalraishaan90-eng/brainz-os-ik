-- One cached, school-wide configuration row used by the shell and exports.
CREATE TABLE IF NOT EXISTS public.school_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  product_name TEXT NOT NULL DEFAULT 'Eduvia',
  school_name TEXT NOT NULL DEFAULT 'Brainz Edu World',
  tagline TEXT NOT NULL DEFAULT 'Senior Secondary',
  logo_url TEXT,
  support_email TEXT NOT NULL DEFAULT 'support@brainzeduworld.com',
  email_domain TEXT NOT NULL DEFAULT 'brainzeduworld.com',
  footer_text TEXT NOT NULL DEFAULT 'Protected institutional gateway',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  locale TEXT NOT NULL DEFAULT 'en-IN',
  primary_color TEXT,
  accent_color TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT school_settings_primary_color_hex CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT school_settings_accent_color_hex CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE OR REPLACE FUNCTION public.school_brand_color_contrast(color_hex TEXT)
RETURNS NUMERIC LANGUAGE SQL IMMUTABLE STRICT AS $$
  WITH rgb AS (
    SELECT
      (get_byte(decode(substr(color_hex, 2, 2), 'hex'), 0))::numeric / 255 AS r,
      (get_byte(decode(substr(color_hex, 4, 2), 'hex'), 0))::numeric / 255 AS g,
      (get_byte(decode(substr(color_hex, 6, 2), 'hex'), 0))::numeric / 255 AS b
  ), linear AS (
    SELECT
      CASE WHEN r <= 0.04045 THEN r / 12.92 ELSE power((r + 0.055) / 1.055, 2.4) END AS r,
      CASE WHEN g <= 0.04045 THEN g / 12.92 ELSE power((g + 0.055) / 1.055, 2.4) END AS g,
      CASE WHEN b <= 0.04045 THEN b / 12.92 ELSE power((b + 0.055) / 1.055, 2.4) END AS b
    FROM rgb
  ), lum AS (
    SELECT (0.2126 * r + 0.7152 * g + 0.0722 * b) AS l FROM linear
  )
  SELECT GREATEST(
    1.05 / (l + 0.05),
    (l + 0.05) / 0.0677
  ) FROM lum;
$$;

ALTER TABLE public.school_settings
  ADD CONSTRAINT school_settings_primary_color_wcag CHECK (primary_color IS NULL OR public.school_brand_color_contrast(primary_color) >= 4.5),
  ADD CONSTRAINT school_settings_accent_color_wcag CHECK (accent_color IS NULL OR public.school_brand_color_contrast(accent_color) >= 4.5);

INSERT INTO public.school_settings (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_settings_read ON public.school_settings;
CREATE POLICY school_settings_read ON public.school_settings
  FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS school_settings_director_update ON public.school_settings;
CREATE POLICY school_settings_director_update ON public.school_settings
  FOR UPDATE TO authenticated USING (public.is_director()) WITH CHECK (public.is_director());
DROP POLICY IF EXISTS school_settings_director_insert ON public.school_settings;
CREATE POLICY school_settings_director_insert ON public.school_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_director());

GRANT SELECT ON public.school_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.school_settings TO authenticated;

-- Keep legacy authentication metadata synchronized while school_settings remains authoritative.
CREATE OR REPLACE FUNCTION public.sync_school_settings_legacy_config()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.app_config (key, value, description)
  VALUES ('school_name', NEW.school_name, 'Full institutional name')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS school_settings_sync_legacy_config ON public.school_settings;
CREATE TRIGGER school_settings_sync_legacy_config
  AFTER INSERT OR UPDATE OF email_domain, school_name ON public.school_settings
  FOR EACH ROW EXECUTE FUNCTION public.sync_school_settings_legacy_config();

UPDATE public.app_config
SET value = (SELECT school_name FROM public.school_settings WHERE singleton = TRUE),
    description = 'Full institutional name'
WHERE key = 'school_name';
