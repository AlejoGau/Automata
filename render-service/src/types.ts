/** Tipos laxos del storyboard (el servicio solo los pasa a Remotion). */

export interface Scene {
  id: string;
  start: number;
  end: number;
  purpose: string;
  narration: string;
  subtitle: string;
  transition: string;
  subtitleStyle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visual: any;
  /** data URL mp3 de la narración (lo completa el pipeline de voz). */
  audioDataUrl?: string;
}

export interface Storyboard {
  projectId: string;
  niche: string;
  title: string;
  durationSeconds: number;
  fps: number;
  aspectRatio?: string;
  scenes: Scene[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface RenderJob {
  id: string;
  status: JobStatus;
  /** 0..1 */
  progress: number;
  stage: string;
  videoUrl?: string;
  error?: string;
  createdAt: number;
}
