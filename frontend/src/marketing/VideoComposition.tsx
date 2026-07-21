import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { SceneRenderer, type SceneData } from './SceneRenderer';

/** Composición Remotion que renderiza el storyboard (la ve el <Player />). */
export const VideoComposition: React.FC<{ scenes: SceneData[]; fps: number }> = ({ scenes, fps }) => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {scenes.map((s) => (
        <Sequence
          key={s.id}
          from={Math.round(s.start * fps)}
          durationInFrames={Math.max(1, Math.round((s.end - s.start) * fps))}
        >
          <SceneRenderer scene={s} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
