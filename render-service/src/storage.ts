import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.RENDER_BUCKET || 'renders';

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Sube el mp4 a Supabase Storage y devuelve una URL para descargar.
 * Usa signed URL (7 días) para que funcione aunque el bucket sea privado;
 * si falla, cae a la URL pública.
 */
export async function uploadRender(localPath: string, filename: string): Promise<string> {
  const bytes = await readFile(localPath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`Supabase upload: ${error.message}`);

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(filename, 60 * 60 * 24 * 7);
  if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;

  return supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
}
