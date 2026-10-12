// =============================================================================
// Supabase Edge Function: create-teacher
// Path: supabase/functions/create-teacher/index.ts
// Runtime: Deno / Supabase Edge Runtime
//
// Description: Secure server-side teacher account provisioning.
// - Authenticates caller via JWT Bearer token and validates profile.role === 'director'.
// - Strict CORS restriction to institutional domains (no wildcard '*').
// - Validates inputs against strict schema and rejects unknown fields.
// - Enforces per-user rate limiting (max 10 requests per minute per director).
// - Generates strong cryptographically random temporary password (14 chars).
// - Enforces must_change_password on first login.
// - Never logs passwords and never leaks service_role keys or internal stack traces.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://eduvia.brainzeduworld.com",
  "https://brainzos.edu",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".brainzeduworld.com");
  const allowOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

// In-memory rate limiting: map of callerId -> timestamps[]
const rateLimits = new Map<string, number[]>();

function checkRateLimit(callerId: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(callerId) || [];
  const valid = timestamps.filter(t => now - t < windowMs);
  if (valid.length >= limit) {
    return false;
  }
  valid.push(now);
  rateLimits.set(callerId, valid);
  return true;
}

/**
 * Generate a cryptographically secure 14-character temporary password
 */
function generateTemporaryPassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%&*?";
  const allChars = upper + lower + numbers + special;

  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Guarantee at least two characters from each required set
  const pwd = [
    upper[array[0] % upper.length],
    upper[array[1] % upper.length],
    lower[array[2] % lower.length],
    lower[array[3] % lower.length],
    numbers[array[4] % numbers.length],
    numbers[array[5] % numbers.length],
    special[array[6] % special.length],
    special[array[7] % special.length],
  ];

  for (let i = 8; i < length; i++) {
    pwd.push(allChars[array[i] % allChars.length]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    const temp = pwd[i];
    pwd[i] = pwd[j];
    pwd[j] = temp;
  }

  return pwd.join("");
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is supported." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing required server environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Supabase service keys are not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate caller using their Authorization bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Client operating in caller context
    const callerClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user: callerUser }, error: callerAuthError } = await callerClient.auth.getUser();

    if (callerAuthError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Authorize caller: Verify role is 'director' from public.profiles
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("id, role, full_name, role_confirmed")
      .eq("id", callerUser.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== "director" || !callerProfile.role_confirmed) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Administrative director authorization is required.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit per caller
    if (!checkRateLimit(callerUser.id, 10, 60000)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait before creating more accounts." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse and strictly validate payload against schema
    let rawBody: Record<string, unknown> = {};
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reject unexpected extra fields (mass-assignment protection)
    const allowedKeys = new Set(["full_name", "email", "role", "class_sections_taught", "class_section_ids"]);
    const unknownKeys = Object.keys(rawBody).filter(k => !allowedKeys.has(k));
    if (unknownKeys.length > 0) {
      return new Response(
        JSON.stringify({ error: `Unknown request properties rejected: ${unknownKeys.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullName = typeof rawBody.full_name === "string" ? rawBody.full_name.trim() : "";
    const email = typeof rawBody.email === "string" ? rawBody.email.trim().toLowerCase() : "";
    const role = typeof rawBody.role === "string" ? rawBody.role.trim().toLowerCase() : "teacher";

    if (role !== "teacher" && role !== "director") {
      return new Response(
        JSON.stringify({ error: "Account role must be teacher or director." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Faculty member's full name is required (between 2 and 100 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "A valid institutional email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domainPart = email.split("@")[1] || "";

    // Query allowed_domains from app_config
    const { data: domainConfig } = await adminClient
      .from("app_config")
      .select("value")
      .eq("key", "allowed_domains")
      .maybeSingle();

    const allowedDomainsRaw = typeof domainConfig?.value === "string" ? domainConfig.value : "";
    const allowedList = allowedDomainsRaw.split(",").map((d: string) => d.trim().toLowerCase()).filter(Boolean);
    const isAllowedDomain = allowedList.some((d: string) => domainPart === d || domainPart.endsWith("." + d));

    if (!isAllowedDomain) {
      return new Response(
        JSON.stringify({ error: `Institutional email must belong to an authorized institutional domain (${allowedList.join(", ")}).` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate class sections
    let submittedIds: string[] = [];
    if (Array.isArray(rawBody.class_section_ids) && rawBody.class_section_ids.length > 0) {
      submittedIds = rawBody.class_section_ids.map(id => String(id).trim()).filter(Boolean);
    } else if (Array.isArray(rawBody.class_sections_taught) && rawBody.class_sections_taught.length > 0) {
      submittedIds = rawBody.class_sections_taught.map(id => String(id).trim()).filter(Boolean);
    } else if (typeof rawBody.class_sections_taught === "string" && rawBody.class_sections_taught.trim()) {
      submittedIds = rawBody.class_sections_taught.split(",").map(s => s.trim()).filter(Boolean);
    }

    if (role === "teacher" && submittedIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one class section must be selected for the faculty member." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: allDbSections, error: csErr } = await adminClient
      .from("class_sections")
      .select("id, grade, section, stream, display_name, active");

    if (csErr) {
      console.error("Failed to query class_sections:", csErr);
      return new Response(
        JSON.stringify({ error: "Failed to validate class sections against institutional registry." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const availableSections = allDbSections || [];
    const validatedSections: typeof availableSections = [];

    const toRoman = (n: number) => {
      const rom: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII" };
      return rom[n] || String(n);
    };

    for (const token of submittedIds) {
      const match = availableSections.find(cs =>
        cs.id === token ||
        cs.display_name.toLowerCase() === token.toLowerCase() ||
        `${cs.grade}-${cs.section}`.toLowerCase() === token.toLowerCase() ||
        (cs.grade >= 11 && `${toRoman(cs.grade)}-${cs.section}`.toLowerCase() === token.toLowerCase()) ||
        (cs.grade >= 11 && `${toRoman(cs.grade)}-${cs.section} ${cs.stream}`.toLowerCase() === token.toLowerCase()) ||
        (cs.grade >= 11 && `Class ${toRoman(cs.grade)}-${cs.section}`.toLowerCase() === token.toLowerCase())
      );

      if (!match) {
        return new Response(
          JSON.stringify({ error: `Invalid class section: "${token}" does not exist in registry.`, code: "CLASS_SECTION_NOT_FOUND" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!match.active) {
        return new Response(
          JSON.stringify({ error: `Class section "${match.display_name}" is deactivated.`, code: "CLASS_SECTION_INACTIVE" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!validatedSections.some(v => v.id === match.id)) {
        validatedSections.push(match);
      }
    }

    const classSectionCodes = validatedSections.map(cs => {
      if (cs.grade >= 11) return `${toRoman(cs.grade)}-${cs.section}`;
      return `${cs.grade}-${cs.section}`;
    });

    const classSectionsStr = classSectionCodes.join(", ");

    // Check duplicate in profiles
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists in the institutional registry.", code: "USER_ALREADY_EXISTS" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate strong temporary password
    const temporaryPassword = generateTemporaryPassword(14);

    // Create auth user
    const { data: newAuthData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
        class_section: classSectionsStr,
        must_change_password: true,
      },
    });

    if (createUserError || !newAuthData?.user) {
      console.error("Error creating auth user:", createUserError);
      return new Response(
        JSON.stringify({ error: "Failed to provision faculty user credentials." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newAuthData.user.id;

    // Update profile row
    const { error: updateProfileError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        email: email,
        role: role,
        role_confirmed: true,
        class_section: classSectionsStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newUserId);

    if (updateProfileError) {
      console.error("Profile update failed, deleting orphaned auth user:", updateProfileError);
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Provisioning failed during profile creation." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return temporary credentials once (never log password, never return service_role keys)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Faculty account provisioned successfully.",
        credentials: {
          id: newUserId,
          full_name: fullName,
          email: email,
          temporary_password: temporaryPassword,
          role: role,
          class_sections_taught: classSectionsStr,
        },
        notice: "Please securely provide these credentials to the teacher. They must change password on first sign-in.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Unhandled error in create-teacher:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected internal server error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
