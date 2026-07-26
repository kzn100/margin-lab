import type { User } from "@supabase/supabase-js";

export type Role = "user" | "admin";

/**
 * Role lives in app_metadata, which only the secret key can write — a user
 * cannot promote themselves by editing their own profile. Same claim the
 * is_admin() SQL function reads, so the UI and RLS never disagree.
 */
export function roleOf(user: User | null): Role {
  return user?.app_metadata?.role === "admin" ? "admin" : "user";
}

export const homeFor = (role: Role) => (role === "admin" ? "/admin" : "/dashboard");

/** Initials for the header avatar. "Nurul Aziz" → "NA". */
export function initials(name: string | undefined, fallback: string) {
  const source = name?.trim() || fallback;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Only same-origin paths are followed after login. Without this check a link
 * like /login?next=https://evil.example turns our own login form into an open
 * redirect.
 */
export function safeNext(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
