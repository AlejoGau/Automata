/**
 * Cerebro de Marketing Studio: idea + nicho → storyboard validado.
 *
 * El storyboard separa dos capas:
 *   - QUÉ dice (por nicho): dolores, claims, CTAs, tono → NICHE.md
 *   - CÓMO se ve (genérico): bloque `visual` ejecutable por escena → skill visual-production
 */
import Anthropic from '@anthropic-ai/sdk';
import { LIMITS, PURPOSE_VISUAL_MAP, VISUAL_TYPES, TRANSITIONS } from './catalog.js';
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
  const skills = await loadSkills(['short-form-scriptwriter', 'scene-storyboard', 'visual-production']);

  const system = [
    'Sos el director creativo/guionista/productor de Automata (Marketing Studio).',
    'Convertís una idea en un storyboard de video corto vertical 9:16, claro y consistente.',
    '',
    '# DOS CAPAS (no las mezcles)',
    '- QUÉ dice el video (por nicho): dolores, beneficios, claims, CTAs, tono → salen SOLO del NICHE.md.',
    '- CÓMO se ve (genérico): cada escena lleva un bloque `visual` EJECUTABLE, NO personajes actuando.',
    '',
    '# REGLAS GLOBALES (no negociables)',
    `- Máximo ${LIMITS.maximumScenes} escenas. Cada una entre ${LIMITS.minimumSceneDurationSeconds}s y ${LIMITS.maximumSceneDurationSeconds}s. Contiguas (sin huecos), CTA al final.`,
    `- Subtítulos: máx ${LIMITS.maximumSubtitleLines} líneas, ${LIMITS.maximumSubtitleCharactersPerLine} caracteres por línea.`,
    '- Solo dolores/beneficios/CTAs del NICHE.md. Nunca claims prohibidos. Honestidad total.',
    '',
    '# CAPA VISUAL',
    `- visual.type ∈ ${JSON.stringify(VISUAL_TYPES)}`,
    `- Mapeo recomendado propósito → visual: ${JSON.stringify(PURPOSE_VISUAL_MAP)}`,
    `- transiciones válidas: ${JSON.stringify(TRANSITIONS)}`,
    '- Para `stock`: stockQuery EN INGLÉS y específica. Para `chat_mockup`: burbujas reales del rubro con horas. Para `dashboard`: métricas creíbles y permitidas. Para `end_card`: headline + CTA aprobado.',
    '',
    '# CONFIGURACIÓN DEL NICHO (NICHE.md)',
    niche.markdown,
    '',
    '# SKILLS',
    skills,
    '',
    '# SALIDA',
    'Devolvé ÚNICAMENTE el JSON del storyboard (sin markdown, sin texto extra), con esta forma:',
    JSON.stringify({
      projectId: 'string', niche: req.niche, title: 'string', objective: 'string', audience: 'string',
      durationSeconds, aspectRatio: '9:16', fps: 30,
      style: req.style ?? 'live-action-stock',
      voice: { source: 'generated', audioUrl: null, language: req.language ?? 'es-AR' },
      scenes: [{
        id: 'scene-1', start: 0, end: 3, purpose: 'hook', narration: '...', subtitle: '...', transition: 'cut',
        visual: { type: 'stock', stockQuery: 'english specific query', treatment: { kenBurns: 'zoom_in', overlay: 0.35 } },
      }, {
        id: 'scene-2', start: 3, end: 8, purpose: 'problem', narration: '...', subtitle: '...', transition: 'cut',
        visual: { type: 'chat_mockup', bubbles: [{ from: 'cliente', text: '...', time: '18:32' }], unreadBadge: 12 },
      }],
      cta: { text: 'CTA del nicho', start: 12, end: 15 },
    }, null, 2),
  ].join('\n');

  const user = [
    `Idea/tema: ${req.topic}`,
    `Nicho: ${req.niche}`,
    `Duración: ${durationSeconds} segundos`,
    `Estilo: ${req.style ?? 'live-action-stock'}`,
    `Idioma: ${req.language ?? 'es-AR'}`,
    '',
    'Generá el storyboard completo con bloques visual ejecutables, respetando todas las reglas.',
  ].join('\n');

  // 1er intento
  let raw = await askModel(system, user);
  let storyboard = StoryboardSchema.parse(extractJson(raw));
  let result = validateStoryboard(storyboard);
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
    result = validateStoryboard(storyboard);
  }

  return { storyboard, corrected, warnings: result.errors };
}
