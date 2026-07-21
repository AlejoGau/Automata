/**
 * Esquema del storyboard (con capa de PRODUCCIÓN VISUAL) + validaciones.
 *
 * Cada escena ahora lleva un bloque `visual` EJECUTABLE por el toolkit
 * (chat_mockup, stock con query, dashboard, end_card, screen_recording) en vez
 * de una descripción teatral (personajes actuando). Lo que cambia por nicho es
 * el CONTENIDO del visual (textos de las burbujas, la query de stock, las
 * métricas); el componente es genérico.
 */
import { z } from 'zod';
import { LIMITS, VISUAL_STYLES, PURPOSES, VISUAL_TYPES, KEN_BURNS, TRANSITIONS } from './catalog.js';

// ── Bloques visuales (unión discriminada por `type`) ──────────────
export const StockVisualSchema = z.object({
  type: z.literal('stock'),
  // Query de búsqueda en Pexels, EN INGLÉS y específica (la genera el cerebro).
  stockQuery: z.string().min(3),
  treatment: z
    .object({
      kenBurns: z.enum(KEN_BURNS).optional(),
      overlay: z.number().min(0).max(1).optional(), // scrim oscuro para contraste del texto
    })
    .optional(),
});

export const ChatBubbleSchema = z.object({
  from: z.string(),          // "cliente" | "negocio" | "bot" (según el nicho)
  text: z.string().min(1),
  time: z.string().optional(),
});

export const ChatMockupVisualSchema = z.object({
  type: z.literal('chat_mockup'),
  bubbles: z.array(ChatBubbleSchema).min(1),
  unreadBadge: z.number().optional(),
});

export const DashboardVisualSchema = z.object({
  type: z.literal('dashboard'),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
});

export const EndCardVisualSchema = z.object({
  type: z.literal('end_card'),
  headline: z.string().min(1),
  cta: z.string().min(1),
});

export const ScreenRecordingVisualSchema = z.object({
  type: z.literal('screen_recording'),
  description: z.string().min(1),
  stockQuery: z.string().optional(), // fallback a stock si no hay demo real
});

export const VisualSchema = z.discriminatedUnion('type', [
  StockVisualSchema,
  ChatMockupVisualSchema,
  DashboardVisualSchema,
  EndCardVisualSchema,
  ScreenRecordingVisualSchema,
]);

export type Visual = z.infer<typeof VisualSchema>;

// ── Escena ────────────────────────────────────────────────────────
export const SceneSchema = z.object({
  id: z.string(),
  start: z.number(),
  end: z.number(),
  purpose: z.enum(PURPOSES),
  narration: z.string(),
  subtitle: z.string(),
  transition: z.string(),
  visual: VisualSchema,
});

export const StoryboardSchema = z.object({
  projectId: z.string(),
  niche: z.string(),
  title: z.string(),
  objective: z.string(),
  audience: z.string(),
  durationSeconds: z.number(),
  aspectRatio: z.string(),
  fps: z.number(),
  style: z.enum(VISUAL_STYLES),
  voice: z.object({
    source: z.enum(['uploaded', 'generated']),
    audioUrl: z.string().nullable().optional(),
    language: z.string(),
  }),
  scenes: z.array(SceneSchema),
  cta: z.object({
    text: z.string(),
    start: z.number(),
    end: z.number(),
  }),
});

export type Storyboard = z.infer<typeof StoryboardSchema>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Valida el storyboard contra los límites globales y las reglas de la capa visual.
 */
export function validateStoryboard(sb: Storyboard): ValidationResult {
  const errors: string[] = [];

  if (sb.scenes.length < 1) errors.push('No hay escenas.');
  if (sb.scenes.length > LIMITS.maximumScenes) {
    errors.push(`Demasiadas escenas (${sb.scenes.length} > ${LIMITS.maximumScenes}).`);
  }
  if (!VISUAL_STYLES.includes(sb.style)) errors.push(`Estilo inválido: ${sb.style}`);

  if (sb.scenes.length > 0) {
    const sorted = [...sb.scenes].sort((a, b) => a.start - b.start);
    if (sorted[0].start !== 0) errors.push('La primera escena no arranca en 0.');

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.start >= s.end) errors.push(`${s.id}: start (${s.start}) >= end (${s.end}).`);
      const dur = s.end - s.start;
      if (dur < LIMITS.minimumSceneDurationSeconds) errors.push(`${s.id}: dura ${dur}s (< ${LIMITS.minimumSceneDurationSeconds}s).`);
      if (dur > LIMITS.maximumSceneDurationSeconds) errors.push(`${s.id}: dura ${dur}s (> ${LIMITS.maximumSceneDurationSeconds}s).`);
      if (i > 0 && sorted[i].start !== sorted[i - 1].end) {
        errors.push(`Hueco/superposición entre ${sorted[i - 1].id} y ${sorted[i].id}.`);
      }

      // Subtítulos
      const lines = s.subtitle.split('\n');
      if (lines.length > LIMITS.maximumSubtitleLines) errors.push(`${s.id}: subtítulo con ${lines.length} líneas (> ${LIMITS.maximumSubtitleLines}).`);
      for (const line of lines) {
        if (line.length > LIMITS.maximumSubtitleCharactersPerLine) {
          errors.push(`${s.id}: línea de subtítulo de ${line.length} chars (> ${LIMITS.maximumSubtitleCharactersPerLine}).`);
        }
      }

      // Transición
      if (!TRANSITIONS.includes(s.transition)) errors.push(`${s.id}: transición inválida: ${s.transition}`);

      // Reglas por tipo visual
      const v = s.visual;
      if (!VISUAL_TYPES.includes(v.type)) errors.push(`${s.id}: visual.type inválido: ${v.type}`);
      if (v.type === 'stock' && !v.stockQuery.trim()) errors.push(`${s.id}: stock sin stockQuery.`);
      if (v.type === 'chat_mockup' && v.bubbles.length === 0) errors.push(`${s.id}: chat_mockup sin burbujas.`);
      if (v.type === 'dashboard' && v.metrics.length === 0) errors.push(`${s.id}: dashboard sin métricas.`);
    }

    const total = sorted[sorted.length - 1].end;
    if (Math.abs(total - sb.durationSeconds) > 0.01) {
      errors.push(`La duración total (${total}s) no coincide con durationSeconds (${sb.durationSeconds}s).`);
    }

    // El CTA debería ser una placa final (end_card)
    const last = sorted[sorted.length - 1];
    if (last.purpose === 'cta' && last.visual.type !== 'end_card') {
      errors.push(`La escena de CTA (${last.id}) debería usar visual.type "end_card".`);
    }
  }

  if (Math.abs(sb.cta.end - sb.durationSeconds) > 0.01) {
    errors.push(`El CTA no termina al final del video (cta.end=${sb.cta.end}, durationSeconds=${sb.durationSeconds}).`);
  }

  return { ok: errors.length === 0, errors };
}
