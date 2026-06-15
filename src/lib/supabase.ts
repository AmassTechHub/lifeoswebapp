import { createClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "study-materials";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  // Try uploading — if bucket missing, create it then retry
  let uploadError = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false })
    .then(({ error }) => error);

  if (uploadError && (uploadError.message.includes("not found") || uploadError.message.includes("does not exist") || uploadError.message.includes("Bucket not found"))) {
    await supabase.storage.createBucket(STORAGE_BUCKET, { public: true, fileSizeLimit: 20 * 1024 * 1024 });
    const retry = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: false });
    uploadError = retry.error;
  }

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFromStorage(path: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
