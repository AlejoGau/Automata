import os from 'os';
import path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { generateVoice } from './voice.js';
import { rebuildTimeline } from './timeline.js';
import { renderVideo } from './render.js';
import { uploadRender } from './storage.js';
import type { Storyboard, RenderJob, Scene } from './types.js';
import type { Task } from './queue.js';

/**
 * Pipeline completo de un render:
 *   voz (ElevenLabs) → re-anclar tiempos a la voz → render Remotion → subir a Supabase.
 * Reporta progreso por etapas (0..1).
 */
export function buildRenderTask(storyboard: Storyboard): Task {
  return async (update: (patch: Partial<RenderJob>) => void): Promise<string> => {
    const fps = storyboard.fps || 30;
    const scenes: Scene[] = storyboard.scenes || [];
    if (!scenes.length) throw new Error('El storyboard no tiene escenas.');

    // 1) Voz por escena (secuencial: evita ráfagas contra ElevenLabs)
    update({ stage: 'Generando voz', progress: 0.05 });
    const durations: (number | null)[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const v = await generateVoice(scenes[i].narration);
      if (v) {
        scenes[i].audioDataUrl = v.audioDataUrl;
        durations.push(v.durationSeconds);
      } else {
        durations.push(null);
      }
      update({ progress: 0.05 + 0.25 * ((i + 1) / scenes.length) });
    }

    // 2) Re-anclar la línea de tiempo a la duración real de la voz
    const timed = rebuildTimeline(scenes, durations);

    // 3) Render a mp4
    update({ stage: 'Renderizando', progress: 0.35 });
    const dir = await mkdtemp(path.join(os.tmpdir(), 'render-'));
    const out = path.join(dir, 'video.mp4');
    try {
      await renderVideo(timed, fps, out, (p) => update({ progress: 0.35 + 0.55 * p }));

      // 4) Subir y devolver link
      update({ stage: 'Subiendo', progress: 0.92 });
      const safe =
        (storyboard.projectId || storyboard.title || 'video')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'video';
      const filename = `${safe}-${Date.now()}.mp4`;
      return await uploadRender(out, filename);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  };
}
