import type { Scene } from './types.js';

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Reconstruye la línea de tiempo anclada a la voz (production.timing.anchor = "voice"):
 * cada escena dura al menos lo que su narración, con un pequeño respiro al final.
 * Las escenas quedan contiguas (sin huecos ni solapamientos), que es lo que valida el
 * guion original. Si una escena no tiene audio, conserva su duración planificada.
 */
export function rebuildTimeline(scenes: Scene[], audioDurations: (number | null)[], tailPad = 0.4): Scene[] {
  let t = 0;
  return scenes.map((s, i) => {
    const planned = Math.max(0.5, s.end - s.start);
    const audio = audioDurations[i] || 0;
    const dur = audio > 0 ? Math.max(planned, audio + tailPad) : planned;
    const start = round(t);
    const end = round(t + dur);
    t = end;
    return { ...s, start, end };
  });
}

export const totalDuration = (scenes: Scene[]): number =>
  scenes.length ? Math.max(...scenes.map((s) => s.end)) : 0;
