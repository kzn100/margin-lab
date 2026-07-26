/**
 * Fail at boot with a useful message, not at first query with "Invalid URL".
 * NEXT_PUBLIC_* refs must stay as static `process.env.X` member access —
 * Next.js only inlines those into the browser bundle when it can see the
 * literal key at build time. `process.env[name]` is a dynamic lookup, so it
 * silently resolves to undefined client-side in production builds (it works
 * in `next dev`, which exposes the full process.env to the client, masking
 * the bug there).
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var ${name} — see .env.example`);
  return value;
}

export const SUPABASE_URL = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
export const SUPABASE_SECRET_KEY = () =>
  required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
