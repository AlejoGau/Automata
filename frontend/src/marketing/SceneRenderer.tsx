import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { ChatMockup, Dashboard, EndCard, NotificationCounter } from './components';

export type Bubble = { from: string; text: string; time?: string; status?: 'sent' | 'delivered' | 'read' };

export type Visual =
  | { type: 'stock'; stockQuery: string; stockAlternatives?: string[]; treatment?: { kenBurns?: string; overlay?: number }; overlayComponent?: { type: string; params?: Record<string, any> } }
  | { type: 'chat_mockup'; bubbles: Bubble[]; unreadBadge?: number; typingIndicatorSeconds?: number }
  | { type: 'dashboard'; metrics: { label: string; value: string }[] }
  | { type: 'end_card'; headline: string; cta: string }
  | { type: 'screen_recording'; description: string; stockQuery?: string };

export type SceneData = {
  id: string; start: number; end: number; purpose: string; narration: string;
  subtitle: string; transition: string; subtitleStyle?: string; visual: Visual;
};

const StockPlaceholder: React.FC<{ query: string; kenBurns?: string; overlay?: number }> = ({ query, kenBurns, overlay = 0.35 }) => {
  const frame = useCurrentFrame();
  const scale = kenBurns === 'zoom_in' ? interpolate(frame, [0, 120], [1.05, 1.18], { extrapolateRight: 'clamp' })
    : kenBurns === 'zoom_out' ? interpolate(frame, [0, 120], [1.18, 1.05], { extrapolateRight: 'clamp' }) : 1;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' }} />
      <AbsoluteFill style={{ background: `rgba(0,0,0,${overlay})` }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 70 }}>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 30, fontFamily: 'Helvetica Neue, Arial, sans-serif', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 20, padding: '24px 34px', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>STOCK · PEXELS</div>
          <div style={{ fontStyle: 'italic' }}>&quot;{query}&quot;</div>
        </div>
      </AbsoluteFill>
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
          <StockPlaceholder query={v.stockQuery} kenBurns={v.treatment?.kenBurns} overlay={v.treatment?.overlay} />
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
      {v.type === 'screen_recording' && <StockPlaceholder query={v.stockQuery ?? v.description} />}
      {showSubtitle && <Subtitle text={scene.subtitle} style={scene.subtitleStyle} position={v.type === 'chat_mockup' ? 'top' : 'bottom'} />}
    </AbsoluteFill>
  );
};
