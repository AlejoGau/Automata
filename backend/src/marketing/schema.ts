/**
 * Esquema del storyboard (sección 10 del spec) + validaciones (sección 11).
 * La estructura la valida Zod; las reglas del catálogo (que dependen del nicho)
 * se chequean aparte en validateAgainstCatalog().
 */
import { z } from 'zod';
import { LIMITS, VISUAL_STYLES, effectiveCatalog, NicheAssets } from './catalog.js';

export const CharacterSchema = z.object({
  id: z.string(),
  action: z.string(),
  expression: z.string(),
  position: z.string(),
});

export const SceneSchema = z.object({
  id: z.string(),
  start: z.number(),
  end: z.number(),
  purpose: z.string(),
  narration: z.string(),
  subtitle: z.string(),
  background: z.string(),
  characters: z.array(CharacterSchema),
  objects: z.array(z.string()),
  camera: z.string(),
  transition: z.string(),
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
 * Valida el storyboard contra los límites globales (sección 7/11) y el catálogo
 * efectivo del nicho (base + extensiones). Devuelve la lista de errores.
 */
export function validateStoryboard(sb: Storyboard, nicheAssets?: NicheAssets): ValidationResult {
  const errors: string[] = [];
  const cat = effectiveCatalog(nicheAssets);

  // Cantidad de escenas
  if (sb.scenes.length < 1) errors.push('No hay escenas.');
  if (sb.scenes.length > LIMITS.maximumScenes) {
    errors.push(`Demasiadas escenas (${sb.scenes.length} > ${LIMITS.maximumScenes}).`);
  }

  // Estilo
  if (!cat.styles.includes(sb.style)) errors.push(`Estilo inválido: ${sb.style}`);

  // Duración total y continuidad de escenas
  if (sb.scenes.length > 0) {
    const sorted = [...sb.scenes].sort((a, b) => a.start - b.start);
    if (sorted[0].start !== 0) errors.push('La primera escena no arranca en 0.');

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.start >= s.end) errors.push(`${s.id}: start (${s.start}) >= end (${s.end}).`);
      const dur = s.end - s.start;
      if (dur < LIMITS.minimumSceneDurationSeconds) {
        errors.push(`${s.id}: dura ${dur}s (< ${LIMITS.minimumSceneDurationSeconds}s).`);
      }
      if (dur > LIMITS.maximumSceneDurationSeconds) {
        errors.push(`${s.id}: dura ${dur}s (> ${LIMITS.maximumSceneDurationSeconds}s).`);
      }
      if (i > 0 && sorted[i].start !== sorted[i - 1].end) {
        errors.push(`Hueco/superposición entre ${sorted[i - 1].id} y ${sorted[i].id}.`);
      }

      // Subtítulos
      const lines = s.subtitle.split('\n');
      if (lines.length > LIMITS.maximumSubtitleLines) {
        errors.push(`${s.id}: subtítulo con ${lines.length} líneas (> ${LIMITS.maximumSubtitleLines}).`);
      }
      for (const line of lines) {
        if (line.length > LIMITS.maximumSubtitleCharactersPerLine) {
          errors.push(`${s.id}: línea de subtítulo de ${line.length} chars (> ${LIMITS.maximumSubtitleCharactersPerLine}).`);
        }
      }

      // Personajes / objetos
      if (s.characters.length > LIMITS.maximumCharactersPerScene) {
        errors.push(`${s.id}: ${s.characters.length} personajes (> ${LIMITS.maximumCharactersPerScene}).`);
      }
      if (s.objects.length > LIMITS.maximumObjectsPerScene) {
        errors.push(`${s.id}: ${s.objects.length} objetos (> ${LIMITS.maximumObjectsPerScene}).`);
      }

      // Catálogo
      if (!cat.backgrounds.includes(s.background)) errors.push(`${s.id}: fondo fuera de catálogo: ${s.background}`);
      if (!cat.transitions.includes(s.transition)) errors.push(`${s.id}: transición inválida: ${s.transition}`);
      if (!cat.cameras.includes(s.camera)) errors.push(`${s.id}: cámara inválida: ${s.camera}`);
      for (const c of s.characters) {
        if (!cat.characters.includes(c.id)) errors.push(`${s.id}: personaje fuera de catálogo: ${c.id}`);
        if (!cat.actions.includes(c.action)) errors.push(`${s.id}: acción fuera de catálogo: ${c.action}`);
        if (!cat.expressions.includes(c.expression)) errors.push(`${s.id}: expresión fuera de catálogo: ${c.expression}`);
        if (!cat.positions.includes(c.position)) errors.push(`${s.id}: posición inválida: ${c.position}`);
      }
      for (const o of s.objects) {
        if (!cat.objects.includes(o)) errors.push(`${s.id}: objeto fuera de catálogo: ${o}`);
      }
    }

    const total = sorted[sorted.length - 1].end;
    if (Math.abs(total - sb.durationSeconds) > 0.01) {
      errors.push(`La duración total (${total}s) no coincide con durationSeconds (${sb.durationSeconds}s).`);
    }
  }

  // CTA al final
  if (Math.abs(sb.cta.end - sb.durationSeconds) > 0.01) {
    errors.push(`El CTA no termina al final del video (cta.end=${sb.cta.end}, durationSeconds=${sb.durationSeconds}).`);
  }

  return { ok: errors.length === 0, errors };
}
