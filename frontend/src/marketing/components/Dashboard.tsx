/**
 * Dashboard — panel de métricas (vertical 9:16).
 * Consume el visual `dashboard` del cerebro: { metrics: [{ label, value }] }.
 * Las tarjetas entran escalonadas; los valores enteros hacen count-up.
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface DashboardMetric {
  label: string;
  value: string;
}

export interface DashboardProps {
  metrics: DashboardMetric[];
  title?: string;
  accent?: string;
}

const GREEN = '#25D366';

export const Dashboard: React.FC<DashboardProps> = ({ metrics, title, accent = GREEN }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = interpolate(Math.sin(frame / 24), [-1, 1], [0.18, 0.34]);

  return (
    <AbsoluteFill style={{ background: '#0a0e0d', fontFamily: 'Helvetica Neue, Arial, sans-serif', padding: '150px 70px', display: 'flex', flexDirection: 'column', gap: 60 }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, rgba(37,211,102,${glow}) 0%, rgba(10,14,13,0) 55%)` }} />

      {title && (
        <div style={{ fontSize: 58, fontWeight: 800, color: '#fff', textAlign: 'center', opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
          {title}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: metrics.length <= 2 ? '1fr' : '1fr 1fr', gap: 44, flex: 1, alignContent: 'center' }}>
        {metrics.map((m, i) => {
          const appear = 8 + i * 7;
          const t = spring({ frame: frame - appear, fps, config: { damping: 16, mass: 0.6, stiffness: 140 } });
          const opacity = interpolate(frame - appear, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const isInt = /^\d+$/.test(m.value.trim());
          const shown = isInt
            ? Math.round(interpolate(frame - appear, [0, 22], [0, parseInt(m.value, 10)], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })).toString()
            : m.value;
          return (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(37,211,102,0.28)', borderRadius: 34,
                padding: '52px 44px', opacity,
                transform: `translateY(${interpolate(t, [0, 1], [34, 0])}px) scale(${interpolate(t, [0, 1], [0.95, 1])})`,
              }}
            >
              <div style={{ fontSize: 92, fontWeight: 800, color: accent, lineHeight: 1 }}>{shown}</div>
              <div style={{ fontSize: 36, color: '#c8d6cf', marginTop: 16 }}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default Dashboard;
