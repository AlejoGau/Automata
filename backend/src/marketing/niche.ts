/**
 * Carga la configuración de un nicho: NICHE.md (texto para el prompt) +
 * assets.json (extensiones del catálogo). Vive en niches/<nicho>/ en la raíz del repo.
 */
import { readFile } from 'fs/promises';
import path from 'path';
import { NicheAssets } from './catalog.js';

// Por defecto: carpeta niches/ en la raíz del repo (un nivel arriba de backend/).
const NICHES_DIR = process.env.MARKETING_NICHES_DIR || path.resolve(process.cwd(), '..', 'niches');

export interface NicheConfig {
  name: string;
  markdown: string;      // contenido de NICHE.md (reglas, dolores, CTAs, tono)
  assets: NicheAssets;   // extensiones del catálogo
}

export async function loadNiche(niche: string): Promise<NicheConfig> {
  const dir = path.join(NICHES_DIR, niche);
  let markdown: string;
  try {
    markdown = await readFile(path.join(dir, 'NICHE.md'), 'utf8');
  } catch {
    throw new Error(
      `No existe el nicho "${niche}" (falta ${path.join(dir, 'NICHE.md')}). ` +
      `El agente no inventa dolores/claims de un rubro que no conoce.`
    );
  }

  let assets: NicheAssets = { niche };
  try {
    const raw = await readFile(path.join(dir, 'assets.json'), 'utf8');
    assets = { niche, ...JSON.parse(raw) };
  } catch {
    // assets.json es opcional: el nicho puede no extender el catálogo base.
  }

  return { name: niche, markdown, assets };
}
