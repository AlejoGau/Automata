import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { SceneRenderer, type SceneData } from './SceneRenderer';

/** Escena con su audio de narración (data URL mp3 generado por ElevenLabs). */
export type RenderScene = SceneData & { audioDataUrl?: string };

/**
 * Composición que se renderiza a mp4. Igual que el preview del front, pero
 * agrega la pista de voz de cada escena dentro de su Sequence (Remotion mezcla).
 */
export const VideoComposition: React.FC<{ scenes: RenderScene[]; fps: number }> = ({ scenes, fps }) => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {scenes.map((s) => {
        const from = Math.round(s.start * fps);
        const durationInFrames = Math.max(1, Math.round((s.end - s.start) * fps));
        return (
          <Sequence key={s.id} from={from} durationInFrames={durationInFrames}>
            <SceneRenderer scene={s} />
            {s.audioDataUrl ? <Audio src={s.audioDataUrl} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
