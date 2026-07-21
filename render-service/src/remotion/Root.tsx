import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition, type RenderScene } from './VideoComposition';

type Props = { scenes: RenderScene[]; fps: number };

const DEFAULT_PROPS: Props = { scenes: [], fps: 30 };

/** Registra la composición "video". La duración real se calcula por props. */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="video"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={VideoComposition as any}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaultProps={DEFAULT_PROPS as any}
      calculateMetadata={({ props }: { props: Props }) => {
        const fps = props.fps || 30;
        const end = props.scenes.length ? Math.max(...props.scenes.map((s) => s.end)) : 10;
        return {
          durationInFrames: Math.max(1, Math.round(end * fps)),
          fps,
          width: 1080,
          height: 1920,
        };
      }}
    />
  );
};
