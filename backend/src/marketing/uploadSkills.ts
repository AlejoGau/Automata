/**
 * Sube las skills locales (src/marketing/skills/*.md) al bucket de Supabase Storage.
 * Crea el bucket si no existe. Usa la service role key (bypassa RLS).
 *
 * Uso:  npm run studio:skills:upload
 * Bucket: MARKETING_SKILLS_BUCKET (por defecto "skills").
 */
import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../supabase.js';

const BUCKET = process.env.MARKETING_SKILLS_BUCKET || 'skills';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills');

async function main() {
  // 1. Asegurar que el bucket existe
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;

  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error) throw error;
    console.log(`✔ Bucket "${BUCKET}" creado.`);
  } else {
    console.log(`• Bucket "${BUCKET}" ya existe.`);
  }

  // 2. Subir cada .md (upsert = sobreescribe si ya está)
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.md'));
  if (files.length === 0) throw new Error(`No hay .md en ${DIR}`);

  for (const f of files) {
    const content = await readFile(path.join(DIR, f), 'utf8');
    const { error } = await supabase.storage.from(BUCKET).upload(f, Buffer.from(content, 'utf8'), {
      contentType: 'text/markdown',
      upsert: true,
    });
    if (error) throw error;
    console.log(`  ✔ ${f}`);
  }

  console.log(`\n✅ ${files.length} skill(s) en el bucket "${BUCKET}". El agente ya las lee desde Supabase.`);
}

main().catch((err) => {
  console.error('\n❌ Falló:', err?.message || err);
  process.exit(1);
});
