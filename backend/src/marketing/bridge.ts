/**
 * Puente Automata → claude-code-video-toolkit.
 *
 * El cerebro de Automata (backend) genera el storyboard validado; este puente lo
 * convierte en un "brief" en markdown que se le pasa al toolkit (comando /video)
 * para producir el video (voz, visuales, render). Así cada repo mantiene su rol:
 *   - Automata: la lógica creativa por nicho (el qué).
 *   - toolkit:  la producción del video (el cómo).
 */
import { Storyboard } from './schema.js';

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
  L.push('## Escenas');
  for (const s of sb.scenes) {
    L.push('');
    L.push(`### ${s.id} · ${s.start}s–${s.end}s · _${s.purpose}_`);
    L.push(`- **Voz:** ${s.narration}`);
    L.push(`- **Texto en pantalla:** ${s.subtitle.replace(/\n/g, '  /  ')}`);
    L.push(`- **Escenario/fondo:** ${s.background}`);
    if (s.characters.length) {
      L.push(
        `- **Sujetos:** ${s.characters
          .map((c) => `${c.id} (${c.action}, ${c.expression}, ${c.position})`)
          .join('; ')}`
      );
    }
    if (s.objects.length) L.push(`- **Objetos:** ${s.objects.join(', ')}`);
    L.push(`- **Cámara:** ${s.camera} · **Transición:** ${s.transition}`);
  }
  L.push('');
  L.push('---');
  L.push('## Cómo producirlo en el toolkit');
  L.push('1. Abrí `claude-code-video-toolkit` en Claude Code.');
  L.push('2. Corré `/video` y pegá este brief como concepto.');
  L.push('3. Usá el guion locutado para la voz (ElevenLabs) y cada escena para los visuales.');
  L.push('');
  return L.join('\n');
}
