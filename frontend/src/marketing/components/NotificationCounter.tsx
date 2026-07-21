/**
 * NotificationCounter — overlay que se pone ENCIMA de un footage de stock.
 * Consume el `overlayComponent` del cerebro: { type: "notification_counter", params: { count } }.
 * Muestra un contador que sube (mensajes sin responder acumulándose).
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface NotificationCounterProps {
  count: number;
  label?: string;
  position?: 'top' | 'center';
  accent?: string;
}

const GREEN = '#25D366';

const BubbleIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
    <path d="M12 3C6.9 3 3 6.4 3 10.6c0 1.9.8 3.6 2.2 4.9-.1.9-.5 2.1-1.4 3 1.6-.1 2.9-.7 3.7-1.2 1.3.5 2.8.8 4.5.8 5.1 0 9-3.4 9-7.5S17.1 3 12 3z" fill={color} />
  </svg>
);

export const NotificationCounter: React.FC<NotificationCounterProps> = ({
  count,
  label = 'mensajes sin responder',
  position = 'top',
  accent = GREEN,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame: frame - 6, fps, config: { damping: 12, mass: 0.5, stiffness: 150 } });
  const shown = Math.round(interpolate(frame, [12, 42], [0, count], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const badgePop = spring({ frame: frame - 40, fps, config: { damping: 10, mass: 0.4, stiffness: 180 } });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: position === 'top' ? 'flex-start' : 'center',
        padding: position === 'top' ? '170px 0 0' : '0',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 28,
          background: 'rgba(10,14,13,0.72)', borderRadius: 80, padding: '28px 48px',
          transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BubbleIcon color="#04231a" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 800, color: '#fff', lineHeight: 1, fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{shown}</div>
          <div style={{ fontSize: 30, color: '#c8d6cf', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>{label}</div>
        </div>

        {/* badge rojo estilo notificación */}
        <div
          style={{
            position: 'absolute', top: -12, right: -8, minWidth: 64, height: 64, borderRadius: 32,
            background: '#ff3b30', color: '#fff', fontSize: 36, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            transform: `scale(${interpolate(badgePop, [0, 1], [0, 1])})`,
            boxShadow: '0 6px 18px rgba(255,59,48,0.5)',
          }}
        >
          {shown}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default NotificationCounter;
