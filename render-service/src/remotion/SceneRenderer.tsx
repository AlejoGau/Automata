import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { ChatMockup, Dashboard, EndCard, NotificationCounter } from './components';

export type Bubble = { from: string; text: string; time?: string; status?: 'sent' | 'delivered' | 'read' };

export type Visual =
  | { type: 'stock'; stockQuery: string; stockAlternatives?: string[]; photoUrl?: string; treatment?: { kenBurns?: string; overlay?: number }; overlayComponent?: { type: string; params?: Record<string, any> } }
  | { type: 'chat_mockup'; bubbles: Bubble[]; unreadBadge?: number; typingIndicatorSeconds?: number }
  | { type: 'dashboard'; metrics: { label: string; value: string }[] }
  | { type: 'end_card'; headline: string; cta: string }
  | { type: 'screen_recording'; description: string; stockQuery?: string; photoUrl?: string };

export type SceneData = {
  id: string; start: number; end: number; purpose: string; narration: string;
  subtitle: string; transition: string; subtitleStyle?: string; visual: Visual;
};

const StockScene: React.FC<{ photoUrl?: string; kenBurns?: string; overlay?: number }> = ({ photoUrl, kenBurns, overlay = 0.35 }) => {
  const frame = useCurrentFrame();
  const scale = kenBurns === 'zoom_in' ? interpolate(frame, [0, 120], [1.05, 1.18], { extrapolateRight: 'clamp' })
    : kenBurns === 'zoom_out' ? interpolate(frame, [0, 120], [1.18, 1.05], { extrapolateRight: 'clamp' }) : 1.06;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#0a0e0d' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {photoUrl ? (
          <Img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <AbsoluteFill style={{ background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' }} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(0,0,0,${overlay})` }} />
    </AbsoluteFill>
  );
};

const Subtitle: React.FC<{ text: string; style?: string; position?: 'top' | 'bottom' }> = ({ text, style, position = 'bottom' }) => {
  if (style === 'none') return null;
  const small = style === 'small_bottom';
  const top = position === 'top';
  return (
    <AbsoluteFill style={{ justifyContent: top ? 'flex-start' : 'flex-end', alignItems: 'center', padding: top ? '210px 60px 0' : (small ? '0 60px 110px' : '0 70px 320px') }}>
      <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: small ? 44 : 64, fontWeight: 800, textAlign: 'center', padding: '18px 32px', borderRadius: 18, whiteSpace: 'pre-line', lineHeight: 1.2, fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const SceneRenderer: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const v = scene.visual;
  const showSubtitle = v.type === 'stock' || v.type === 'chat_mockup' || v.type === 'screen_recording';
  return (
    <AbsoluteFill style={{ background: '#0a0e0d' }}>
      {v.type === 'stock' && (
        <>
          <StockScene photoUrl={v.photoUrl} kenBurns={v.treatment?.kenBurns} overlay={v.treatment?.overlay} />
          {v.overlayComponent?.type === 'notification_counter' && (
            <NotificationCounter count={Number(v.overlayComponent.params?.count ?? 12)} />
          )}
        </>
      )}
      {v.type === 'chat_mockup' && (
        <ChatMockup bubbles={v.bubbles} unreadBadge={v.unreadBadge} typingIndicatorSeconds={v.typingIndicatorSeconds} contactName="Cliente" />
      )}
      {v.type === 'dashboard' && <Dashboard metrics={v.metrics} title="Tu negocio hoy" />}
      {v.type === 'end_card' && <EndCard headline={v.headline} cta={v.cta} />}
      {v.type === 'screen_recording' && <StockScene photoUrl={v.photoUrl} kenBurns="zoom_in" />}
      {showSubtitle && <Subtitle text={scene.subtitle} style={scene.subtitleStyle} position={v.type === 'chat_mockup' ? 'top' : 'bottom'} />}
    </AbsoluteFill>
  );
};
