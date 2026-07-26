import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Every uploaded P&L, accepted or rejected, lives in this one private bucket. */
export const BUCKET = "pnl-uploads";

/** Rejected uploads belong to no account, so they sit under their own prefix. */
export const REJECTED_PREFIX = "rejected/";

/**
 * Object keys are built from a filename the uploader chose, so everything
 * outside the safe set goes. The tail is kept rather than the head: the
 * extension is the useful part when you are looking at a list of these.
 *
 * Runs of dots collapse to one. A dot is legal in a key and "my..file.csv" is
 * harmless in itself, but canReadPath refuses any path containing "..", so
 * leaving it in would store a file that could never be downloaded again.
 */
export const safeStoragePath = (fileName: string) =>
  fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .slice(-80);

/**
 * Who may read which object.
 *
 * An admin reads the whole bucket, which is the point of the leads table.
 * Everyone else is confined to their own `<uid>/` prefix — the same shape the
 * upload paths are built with. Traversal and absolute paths are refused before
 * the prefix is even considered, so `<uid>/../someone-else/x` cannot slip
 * through on a prefix match.
 */
export function canReadPath(path: string, userId: string, isAdmin: boolean) {
  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\\")) return false;
  if (isAdmin) return true;
  return path.startsWith(`${userId}/`);
}

/**
 * Keeps a file that never became an analysis.
 *
 * Runs on paths that are already returning an error to the uploader, so it
 * never throws and never changes what they see: a storage hiccup here must not
 * turn "we could not read that file" into a 500.
 * ponytail: the abort() rollbacks in /api/register are not covered — they only
 * fire when our own infrastructure fails, and threading the buffer through all
 * of them costs more than the handful of files it would save.
 */
export async function recordRejectedUpload(
  admin: SupabaseClient<Database>,
  input: {
    userId?: string | null;
    email: string;
    company?: string | null;
    fileName: string;
    buffer: Buffer;
    contentType?: string;
    reason: string;
  },
) {
  const path = `${REJECTED_PREFIX}${randomUUID()}-${safeStoragePath(input.fileName)}`;
  try {
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, input.buffer, { contentType: input.contentType || "text/csv" });
    if (error) throw error;

    const { error: rowError } = await admin.from("upload_attempts").insert({
      user_id: input.userId ?? null,
      email: input.email,
      company: input.company ?? null,
      file_path: path,
      file_name: input.fileName,
      file_size: input.buffer.length,
      reason: input.reason,
    });
    if (rowError) throw rowError;
  } catch (error) {
    console.error("[uploads] could not keep a rejected upload", {
      email: input.email,
      error: error instanceof Error ? error.message : error,
    });
  }
}
