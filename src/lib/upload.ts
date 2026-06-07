import { supabase } from "@/integrations/supabase/client";

/** Upload a file into the `project-media` bucket under `<userId>/<folder>/<ts>-<name>`.
 *  Returns the public URL. */
export async function uploadProjectMedia(
  userId: string,
  folder: string,
  file: File,
): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from("project-media")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("project-media").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload and return the storage path (for receipts stored as path, not URL). */
export async function uploadProjectMediaPath(
  userId: string,
  folder: string,
  file: File,
): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from("project-media")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export function publicUrlFor(path: string): string {
  return supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
}
