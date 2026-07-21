/**
 * EndCard — placa final con el CTA (vertical 9:16).
 * Consume el visual `end_card` del cerebro: { headline, cta }.
 * Genérico y con marca: por defecto Automata, pero configurable.
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface EndCardProps {
  headline: string;
  cta: string;
  brandName?: string;
  accent?: string;
}

const GREEN = '#25D366';
const DARK = '#0a0e0d';

export const EndCard: React.FC<EndCardProps> = ({ headline, cta, brandName = 'Automata', accent = GREEN }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.7, stiffness: 120 } });
  const ctaEnter = spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.6, stiffness: 140 } });
  const ctaPulse = interpolate(Math.sin(frame / 9), [-1, 1], [1, 1.045]);
  const glow = interpolate(Math.sin(frame / 22), [-1, 1], [0.25, 0.5]);

  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: 'Helvetica Neue, Arial, sans-serif', alignItems: 'center', justifyContent: 'center' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, rgba(37,211,102,${glow}) 0%, rgba(10,14,13,0) 55%)` }} />

      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60,
          transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
          opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        {/* Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 110, height: 110, borderRadius: 28, background: `linear-gradient(135deg, ${accent}, #1da851)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 800, color: '#04231a', boxShadow: '0 0 60px rgba(37,211,102,0.4)' }}>
            {brandName.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{brandName}</div>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 78, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.15, maxWidth: 920, padding: '0 60px' }}>
          {headline}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 20, background: accent, color: '#04231a', fontSize: 52, fontWeight: 800,
            padding: '34px 72px', borderRadius: 70,
            opacity: interpolate(ctaEnter, [0, 1], [0, 1]),
            transform: `scale(${interpolate(ctaEnter, [0, 1], [0.85, 1]) * ctaPulse})`,
            boxShadow: '0 20px 60px rgba(37,211,102,0.35)',
          }}
        >
          {cta} ›
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default EndCard;
