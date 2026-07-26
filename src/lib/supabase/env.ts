/** Fail at boot with a useful message, not at first query with "Invalid URL". */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} — see .env.example`);
  return value;
}

export const SUPABASE_URL = () => required("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY = () =>
  required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
export const SUPABASE_SECRET_KEY = () => required("SUPABASE_SECRET_KEY");
