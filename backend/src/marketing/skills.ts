/**
 * Carga las skills (instrucciones de CÓMO hacer cada tarea) desde Supabase
 * Storage (bucket configurable, por defecto "skills"), con fallback a copias
 * locales en src/marketing/skills/ para poder trabajar sin depender de Supabase.
 *
 * Cada skill es un archivo markdown: <nombre>.md
 */
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../supabase.js';

const BUCKET = process.env.MARKETING_SKILLS_BUCKET || 'skills';
const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills');

const cache = new Map<string, string>();

/** Devuelve el contenido de una skill. Prioriza Supabase; cae a la copia local. */
export async function loadSkill(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;

  // 1. Supabase Storage
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(`${name}.md`);
    if (!error && data) {
      const text = await data.text();
      cache.set(name, text);
      return text;
    }
  } catch {
    // seguimos al fallback local
  }

  // 2. Fallback local (fuente de verdad versionada)
  try {
    const text = await readFile(path.join(LOCAL_DIR, `${name}.md`), 'utf8');
    cache.set(name, text);
    return text;
  } catch {
    throw new Error(`No se encontró la skill "${name}" ni en Supabase (bucket ${BUCKET}) ni local.`);
  }
}

/** Carga varias skills y las concatena (para inyectar en el prompt del agente). */
export async function loadSkills(names: string[]): Promise<string> {
  const parts = await Promise.all(
    names.map(async (n) => `## SKILL: ${n}\n\n${await loadSkill(n)}`)
  );
  return parts.join('\n\n---\n\n');
}
