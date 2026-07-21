/**
 * ChatMockup — simulación de una conversación de WhatsApp (vertical 9:16).
 *
 * Muestra burbujas que aparecen de a una (sincronizables con la voz) para
 * representar el "problema" (mensajes del cliente sin responder) o la "solución"
 * (el negocio responde al toque). Componente genérico: el contenido viene por props.
 *
 * Alineado al contrato del cerebro (schema.ts de Automata): cada burbuja puede
 * traer `status` (sent/delivered/read → tildes) y el mockup un `typingIndicatorSeconds`
 * (muestra "escribiendo…" antes de la primera respuesta saliente).
 *
 * Uso:
 *   <ChatMockup
 *     contactName="Gimnasio"
 *     unreadBadge={14}
 *     typingIndicatorSeconds={2}
 *     bubbles={[
 *       { from: 'cliente', text: 'Hola! ¿Cuánto sale la cuota?', time: '18:32', status: 'read' },
 *       { from: 'negocio', text: '¡Hola! La cuota es $18.000. ¿Venís a probar?', time: '18:33', status: 'read' },
 *     ]}
 *   />
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatBubbleData {
  from: string;          // "cliente" = entrante (izq) | "negocio"/"bot" = saliente (der)
  text: string;
  time?: string;
  status?: MessageStatus;
}

export interface ChatMockupProps {
  bubbles: ChatBubbleData[];
  unreadBadge?: number;
  contactName?: string;
  contactStatus?: string;                 // ej. "en línea" | "últ. vez hoy 21:14"
  outgoingFrom?: string[];                // qué `from` van a la derecha (verdes)
  startFrame?: number;                    // frame donde arranca a mostrar la 1ª burbuja
  bubbleIntervalFrames?: number;          // separación entre burbujas
  typingIndicatorSeconds?: number;        // "escribiendo…" antes de la 1ª respuesta saliente
}

// Paleta WhatsApp (tema claro clásico, reconocible)
const HEADER = '#075E54';
const CHAT_BG = '#ECE5DD';
const IN_BUBBLE = '#FFFFFF';
const OUT_BUBBLE = '#DCF8C6';
const BADGE = '#25D366';
const TEXT = '#111B21';
const META = '#667781';
const READ_BLUE = '#34B7F1';

const DEFAULT_OUTGOING = ['negocio', 'bot', 'automata', 'gimnasio'];

/** Tildes de estado: sent = 1 gris · delivered = 2 gris · read = 2 azul. */
const StatusTick: React.FC<{ status?: MessageStatus }> = ({ status = 'delivered' }) => {
  const color = status === 'read' ? READ_BLUE : META;
  const single = status === 'sent';
  return (
    <svg width={single ? 12 : 18} height="12" viewBox={single ? '0 0 12 12' : '0 0 18 12'} style={{ marginLeft: 4 }}>
      <path d="M1 6.5 L4.2 9.6 L9.5 2.5" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {!single && (
        <path d="M6.5 6.5 L9.7 9.6 L15 2.5" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
};

/** Burbuja con "escribiendo…" (tres puntitos animados). */
const TypingBubble: React.FC<{ out: boolean }> = ({ out }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        alignSelf: out ? 'flex-end' : 'flex-start',
        background: out ? OUT_BUBBLE : IN_BUBBLE,
        borderRadius: 26,
        padding: '26px 30px',
        display: 'flex',
        gap: 12,
        boxShadow: '0 2px 3px rgba(0,0,0,0.12)',
      }}
    >
      {[0, 1, 2].map((i) => {
        const o = interpolate(Math.sin((frame - i * 4) / 5), [-1, 1], [0.3, 1]);
        return <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: META, opacity: o }} />;
      })}
    </div>
  );
};

export const ChatMockup: React.FC<ChatMockupProps> = ({
  bubbles,
  unreadBadge,
  contactName = 'Nuevo mensaje',
  contactStatus = 'en línea',
  outgoingFrom = DEFAULT_OUTGOING,
  startFrame = 0,
  bubbleIntervalFrames,
  typingIndicatorSeconds,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const interval = bubbleIntervalFrames ?? Math.round(fps * 0.7);
  const typingFrames = Math.round((typingIndicatorSeconds ?? 0) * fps);

  const isOut = (from: string) => outgoingFrom.includes(from.toLowerCase());

  // Calcular el frame de aparición de cada burbuja, insertando el gap de "escribiendo…"
  // justo antes de la primera burbuja saliente.
  let acc = startFrame;
  let typingInserted = false;
  let typingWindow: { start: number; end: number; out: boolean } | null = null;
  const items = bubbles.map((b) => {
    const out = isOut(b.from);
    if (out && typingFrames > 0 && !typingInserted) {
      typingWindow = { start: acc, end: acc + typingFrames, out: true };
      acc += typingFrames;
      typingInserted = true;
    }
    const appear = acc;
    acc += interval;
    return { b, appear, out };
  });

  const tw = typingWindow as unknown as { start: number; end: number; out: boolean } | null;
  const showTyping = !!tw && frame >= tw.start && frame < tw.end;

  return (
    <AbsoluteFill style={{ backgroundColor: CHAT_BG, fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, backgroundColor: HEADER, padding: '54px 40px 26px', color: '#fff' }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>‹</div>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#cfd8dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: HEADER, fontWeight: 700 }}>
          {contactName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 40, fontWeight: 600 }}>{contactName}</div>
          <div style={{ fontSize: 26, opacity: 0.85 }}>{showTyping ? 'escribiendo…' : contactStatus}</div>
        </div>
        {typeof unreadBadge === 'number' && unreadBadge > 0 && (
          <div style={{ background: BADGE, color: '#04231a', minWidth: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, padding: '0 14px' }}>
            {unreadBadge}
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 22, padding: '28px 34px 60px' }}>
        {items.map(({ b, appear, out }, i) => {
          if (frame < appear) return null;
          const t = spring({ frame: frame - appear, fps, config: { damping: 16, mass: 0.6, stiffness: 140 } });
          const opacity = interpolate(frame - appear, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div
              key={i}
              style={{
                alignSelf: out ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                background: out ? OUT_BUBBLE : IN_BUBBLE,
                color: TEXT,
                borderRadius: 26,
                borderTopLeftRadius: out ? 26 : 6,
                borderTopRightRadius: out ? 6 : 26,
                padding: '22px 26px 16px',
                boxShadow: '0 2px 3px rgba(0,0,0,0.12)',
                opacity,
                transform: `translateY(${interpolate(t, [0, 1], [24, 0])}px) scale(${interpolate(t, [0, 1], [0.94, 1])})`,
              }}
            >
              <div style={{ fontSize: 40, lineHeight: 1.25 }}>{b.text}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 24, color: META }}>{b.time ?? ''}</span>
                {out && <StatusTick status={b.status} />}
              </div>
            </div>
          );
        })}
        {showTyping && tw && <TypingBubble out={tw.out} />}
      </div>
    </AbsoluteFill>
  );
};

export default ChatMockup;
