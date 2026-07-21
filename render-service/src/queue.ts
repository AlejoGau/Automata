import { randomUUID } from 'crypto';
import type { RenderJob } from './types.js';

/** Un task recibe un `update` para reportar progreso y devuelve la URL del mp4. */
export type Task = (update: (patch: Partial<RenderJob>) => void) => Promise<string>;

const jobs = new Map<string, RenderJob>();
const waiting: Array<{ id: string; task: Task }> = [];
let running = false;

export function getJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

/** Encola un render. Se procesa DE A UNO (single worker) para no saturar la RAM. */
export function enqueue(task: Task): RenderJob {
  const id = randomUUID();
  const job: RenderJob = { id, status: 'queued', progress: 0, stage: 'En cola', createdAt: Date.now() };
  jobs.set(id, job);
  waiting.push({ id, task });
  void drain();
  return job;
}

function update(id: string, patch: Partial<RenderJob>) {
  const job = jobs.get(id);
  if (job) Object.assign(job, patch);
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (waiting.length) {
      const next = waiting.shift();
      if (!next) break;
      update(next.id, { status: 'processing', stage: 'Procesando', progress: 0 });
      try {
        const videoUrl = await next.task((patch) => update(next.id, patch));
        update(next.id, { status: 'done', progress: 1, stage: 'Listo', videoUrl });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        update(next.id, { status: 'error', stage: 'Error', error: message });
      }
    }
  } finally {
    running = false;
  }
}

/** Borra jobs de más de 1 hora para que el Map no crezca infinito. */
export function gcJobs(): void {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) if (job.createdAt < cutoff) jobs.delete(id);
}
