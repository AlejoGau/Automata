import path from 'path';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import type { Scene } from './types.js';

let cachedServeUrl: string | null = null;

/** Empaqueta el proyecto Remotion una sola vez (se cachea entre renders). */
async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;
  cachedServeUrl = await bundle({
    entryPoint: path.resolve(process.cwd(), 'src/remotion/index.ts'),
  });
  return cachedServeUrl;
}

/**
 * Renderiza las escenas a un mp4 h264. onProgress recibe 0..1.
 * Concurrencia capada por env (REMOTION_CONCURRENCY) para no saturar la RAM del server.
 */
export async function renderVideo(
  scenes: Scene[],
  fps: number,
  outputLocation: string,
  onProgress?: (p: number) => void
): Promise<string> {
  const serveUrl = await getServeUrl();
  const inputProps = { scenes, fps };

  const composition = await selectComposition({
    serveUrl,
    id: 'video',
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation,
    inputProps,
    concurrency: Math.max(1, Number(process.env.REMOTION_CONCURRENCY || 2)),
    onProgress: ({ progress }) => onProgress?.(progress),
  });

  return outputLocation;
}
