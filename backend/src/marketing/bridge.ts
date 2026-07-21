/**
 * Puente Automata → claude-code-video-toolkit.
 * Convierte el storyboard en un brief markdown con instrucciones EJECUTABLES
 * por tipo de visual (componente Remotion / query de stock), no descripciones teatrales.
 */
import { Storyboard, Visual } from './schema.js';

/** Traduce un bloque visual a una instrucción concreta para el toolkit. */
function renderVisual(v: Visual): string[] {
  switch (v.type) {
    case 'stock': {
      const t = v.treatment;
      const tr = t ? ` (Ken Burns: ${t.kenBurns ?? 'none'}${t.overlay != null ? `, scrim ${t.overlay}` : ''})` : '';
      const L = [`- **Visual:** STOCK (Pexels) → buscar: \`${v.stockQuery}\`${tr}`];
      if (v.stockAlternatives?.length) L.push(`    - Alternativas: ${v.stockAlternatives.map((q) => `\`${q}\``).join(', ')}`);
      if (v.overlayComponent) L.push(`    - Overlay: componente \`${v.overlayComponent.type}\`${v.overlayComponent.params ? ` (${JSON.stringify(v.overlayComponent.params)})` : ''}`);
      return L;
    }
    case 'chat_mockup': {
      const L = [`- **Visual:** COMPONENTE \`ChatMockup\`${v.unreadBadge != null ? ` (badge no leídos: ${v.unreadBadge})` : ''}${v.typingIndicatorSeconds != null ? ` · "escribiendo…" ${v.typingIndicatorSeconds}s` : ''}`];
      for (const b of v.bubbles) L.push(`    - [${b.time ?? '--:--'}] ${b.from}${b.status ? ` (${b.status})` : ''}: "${b.text}"`);
      return L;
    }
    case 'dashboard':
      return [`- **Visual:** COMPONENTE \`Dashboard\` → métricas: ${v.metrics.map((m) => `${m.label}: ${m.value}`).join(' · ')}`];
    case 'end_card':
      return [`- **Visual:** COMPONENTE \`EndCard\` → "${v.headline}" · CTA: "${v.cta}"`];
    case 'screen_recording':
      return [`- **Visual:** SCREEN RECORDING → ${v.description}${v.stockQuery ? ` (fallback stock: \`${v.stockQuery}\`)` : ''}`];
    default:
      return ['- **Visual:** (desconocido)'];
  }
}

/** Convierte un storyboard en un brief markdown listo para el toolkit. */
export function storyboardToBrief(sb: Storyboard): string {
  const L: string[] = [];
  L.push(`# Brief de video — ${sb.title}`);
  L.push('');
  L.push(`- **Nicho:** ${sb.niche}`);
  L.push(`- **Objetivo:** ${sb.objective}`);
  L.push(`- **Público:** ${sb.audience}`);
  L.push(`- **Formato:** ${sb.aspectRatio} · ${sb.durationSeconds}s · ${sb.fps}fps`);
  L.push(`- **Estilo visual:** ${sb.style}`);
  L.push(`- **Idioma / voz:** ${sb.voice.language} (${sb.voice.source})`);
  L.push(`- **CTA final:** "${sb.cta.text}"`);
  L.push('');
  L.push('## Guion locutado (voiceover completo)');
  L.push('');
  L.push(sb.scenes.map((s) => s.narration).join(' '));
  L.push('');
  L.push('## Escenas (con producción visual ejecutable)');
  for (const s of sb.scenes) {
    L.push('');
    L.push(`### ${s.id} · ${s.start}s–${s.end}s · _${s.purpose}_`);
    L.push(`- **Voz:** ${s.narration}`);
    L.push(`- **Texto en pantalla:** ${s.subtitle.replace(/\n/g, '  /  ')}${s.subtitleStyle ? ` _(estilo: ${s.subtitleStyle})_` : ''}`);
    L.push(...renderVisual(s.visual));
    L.push(`- **Transición:** ${s.transition}`);
  }

  if (sb.production) {
    L.push('');
    L.push('## Producción (reglas como data)');
    const p = sb.production;
    if (p.captions) L.push(`- **Captions:** ${JSON.stringify(p.captions)}`);
    if (p.audio) L.push(`- **Audio:** ${JSON.stringify(p.audio)}`);
    if (p.timing) L.push(`- **Timing:** ${JSON.stringify(p.timing)}`);
  }

  L.push('');
  L.push('---');
  L.push('## Cómo producirlo en el toolkit');
  L.push('- `chat_mockup`/`dashboard`/`end_card` → componentes Remotion (renderizar las burbujas/métricas/CTA tal cual).');
  L.push('- `stock` → bajar de Pexels con la query exacta y aplicar el tratamiento.');
  L.push('- Voz: usar el guion locutado (ElevenLabs). Sincronizar subtítulos con timestamps de la voz.');
  L.push('');
  return L.join('\n');
}
