/**
 * Prueba del cerebro de Marketing Studio + puente al toolkit.
 * Genera el storyboard y escribe:
 *   - storage/marketing/<projectId>.storyboard.json  (para el render automatizado futuro)
 *   - storage/marketing/<projectId>.brief.md         (para pasarle al video-toolkit)
 * Si definís MARKETING_TOOLKIT_DIR, copia el brief también a <toolkit>/briefs/.
 *
 * Uso:
 *   npm run studio:storyboard -- gimnasios "Los gimnasios pierden alumnos por responder tarde"
 *   npm run studio:storyboard -- gimnasios "..." 35 live-action-stock
 */
import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { generateStoryboard } from './agent.js';
import { storyboardToBrief } from './bridge.js';

const niche = process.argv[2] || 'gimnasios';
const topic = process.argv[3] || 'Los gimnasios pierden alumnos por responder tarde';
const durationSeconds = process.argv[4] ? Number(process.argv[4]) : undefined;
const style = process.argv[5];

const OUT_DIR = path.resolve(process.cwd(), '..', 'storage', 'marketing');

console.log(`\n→ Nicho: ${niche}`);
console.log(`→ Tema: "${topic}"`);
console.log(`→ Modelo: ${process.env.MARKETING_MODEL || 'claude-opus-4-8'}\n`);

async function main() {
  const { storyboard, corrected, warnings } = await generateStoryboard({
    niche, topic, durationSeconds, style,
  });

  console.log(`${corrected ? '⚠️  Se aplicó 1 corrección.' : '✅ Válido al primer intento.'}`);
  if (warnings.length) {
    console.log('Errores restantes (revisión humana):');
    warnings.forEach((w) => console.log('  - ' + w));
  }

  await mkdir(OUT_DIR, { recursive: true });
  const base = path.join(OUT_DIR, storyboard.projectId || `sb-${niche}`);
  const jsonPath = `${base}.storyboard.json`;
  const briefPath = `${base}.brief.md`;
  const brief = storyboardToBrief(storyboard);

  await writeFile(jsonPath, JSON.stringify(storyboard, null, 2), 'utf8');
  await writeFile(briefPath, brief, 'utf8');
  console.log(`\n📄 Storyboard: ${jsonPath}`);
  console.log(`📝 Brief (para el toolkit): ${briefPath}`);

  // Puente: si está configurado el workspace del toolkit, dejamos el brief ahí.
  const toolkitDir = process.env.MARKETING_TOOLKIT_DIR;
  if (toolkitDir) {
    const briefsDir = path.join(toolkitDir, 'briefs');
    await mkdir(briefsDir, { recursive: true });
    const dest = path.join(briefsDir, `${path.basename(base)}.brief.md`);
    await writeFile(dest, brief, 'utf8');
    console.log(`🔗 Copiado al toolkit: ${dest}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Falló:', err?.message || err);
  process.exit(1);
});
