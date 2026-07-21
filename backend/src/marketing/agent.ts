/**
 * Cerebro de Marketing Studio (Fase 1): idea + nicho → storyboard validado.
 *
 * Orquesta la API de Claude:
 *  1. Resuelve el nicho (NICHE.md + assets.json).
 *  2. Carga las skills (guionista + storyboard) desde Supabase/local.
 *  3. Arma el prompt (reglas globales + límites + catálogo efectivo + nicho + skills).
 *  4. Pide a Claude el storyboard como JSON y lo valida (Zod + catálogo/límites).
 *  5. Si hay errores, hace UNA corrección (maximumStoryboardCorrections = 1).
 */
import Anthropic from '@anthropic-ai/sdk';
import { LIMITS, effectiveCatalog } from './catalog.js';
import { StoryboardSchema, Storyboard, validateStoryboard } from './schema.js';
import { loadNiche } from './niche.js';
import { loadSkills } from './skills.js';

const MODEL = process.env.MARKETING_MODEL || 'claude-opus-4-8';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export interface StoryboardRequest {
  topic: string;
  niche: string;
  durationSeconds?: number;
  style?: string;
  language?: string;
}

export interface StoryboardResult {
  storyboard: Storyboard;
  corrected: boolean;
  warnings: string[];
}

function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('El modelo no devolvió JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

async function askModel(system: string, user: string): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal') throw new Error('El modelo rechazó la solicitud.');
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

export async function generateStoryboard(req: StoryboardRequest): Promise<StoryboardResult> {
  const durationSeconds = req.durationSeconds ?? LIMITS.defaultDurationSeconds;
  if (durationSeconds < LIMITS.minimumDurationSeconds || durationSeconds > LIMITS.maximumDurationSeconds) {
    throw new Error(`Duración fuera de rango (${LIMITS.minimumDurationSeconds}-${LIMITS.maximumDurationSeconds}s).`);
  }

  const niche = await loadNiche(req.niche);
  const catalog = effectiveCatalog(niche.assets);
  const skills = await loadSkills(['short-form-scriptwriter', 'scene-storyboard']);

  const system = [
    'Sos el director creativo/guionista/storyboard artist de Automata (Marketing Studio).',
    'Convertís una idea en un storyboard de video corto vertical 9:16, claro y consistente.',
    '',
    '# REGLAS GLOBALES (no negociables)',
    `- Máximo ${LIMITS.maximumScenes} escenas. Cada escena entre ${LIMITS.minimumSceneDurationSeconds}s y ${LIMITS.maximumSceneDurationSeconds}s.`,
    `- Subtítulos: máx ${LIMITS.maximumSubtitleLines} líneas, ${LIMITS.maximumSubtitleCharactersPerLine} caracteres por línea.`,
    `- Máx ${LIMITS.maximumCharactersPerScene} personajes y ${LIMITS.maximumObjectsPerScene} objetos por escena.`,
    '- Solo recursos del CATÁLOGO EFECTIVO. No inventes nombres de personajes/acciones/fondos/objetos.',
    '- Solo dolores, beneficios y CTAs del NICHE.md. Nunca claims prohibidos. Honestidad total.',
    '- Escenas contiguas (sin huecos ni superposiciones); CTA al final.',
    '',
    '# LÍMITES / CATÁLOGO EFECTIVO (base + nicho)',
    JSON.stringify({ limits: LIMITS, catalog }, null, 2),
    '',
    '# CONFIGURACIÓN DEL NICHO (NICHE.md)',
    niche.markdown,
    '',
    '# SKILLS',
    skills,
    '',
    '# SALIDA',
    'Devolvé ÚNICAMENTE el JSON del storyboard (sin markdown, sin texto extra) con esta forma:',
    '{ projectId, niche, title, objective, audience, durationSeconds, aspectRatio:"9:16", fps:30,',
    '  style, voice:{source:"generated", audioUrl:null, language}, scenes:[{id,start,end,purpose,',
    '  narration,subtitle,background,characters:[{id,action,expression,position}],objects,camera,transition}],',
    '  cta:{text,start,end} }',
  ].join('\n');

  const user = [
    `Idea/tema: ${req.topic}`,
    `Nicho: ${req.niche}`,
    `Duración: ${durationSeconds} segundos`,
    `Estilo: ${req.style ?? 'live-action-stock'}`,
    `Idioma: ${req.language ?? 'es-AR'}`,
    '',
    'Generá el storyboard completo respetando todas las reglas.',
  ].join('\n');

  // 1er intento
  let raw = await askModel(system, user);
  let storyboard = StoryboardSchema.parse(extractJson(raw));
  let result = validateStoryboard(storyboard, niche.assets);
  let corrected = false;

  // 1 corrección permitida
  if (!result.ok) {
    corrected = true;
    const fix = [
      'El storyboard anterior tiene estos errores. Corregí SOLO estos errores y devolvé el JSON completo de nuevo:',
      ...result.errors.map((e) => `- ${e}`),
      '',
      'Storyboard anterior:',
      JSON.stringify(storyboard),
    ].join('\n');
    raw = await askModel(system, fix);
    storyboard = StoryboardSchema.parse(extractJson(raw));
    result = validateStoryboard(storyboard, niche.assets);
  }

  return { storyboard, corrected, warnings: result.errors };
}
