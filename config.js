/**
 * Eduvia — Institutional Environment & Local Supabase Configuration
 * =========================================================================
 * Single-origin self-hosted configuration.
 * All traffic stays on the local school host (window.location.origin).
 * Zero cloud dependencies or external third-party telemetry.
 *
 * The bundled Supabase-compatible backend (scripts/serve.js) serves auth
 * (/auth/v1), PostgREST-style data (/rest/v1), and realtime (/realtime/v1/sse)
 * on the same origin, so the anon key must be a non-placeholder token —
 * placeholders ("mock-token*", empty) disable the live client entirely and
 * drop every session into local-only demo mode (no cross-tab sync).
 * =========================================================================
 */
window.EDUVIA_CONFIG = {
  SUPABASE_URL: (typeof window !== 'undefined' && window.EDUVIA_SUPABASE_URL) || (
    (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '8080' && window.location.port !== '3000')
      ? `${window.location.protocol}//${window.location.hostname}:8080`
      : ""
  ),
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.EDUVIA_SUPABASE_ANON_KEY) || "local-institutional-anon-key"
};
