/**
 * Prueba rápida de envío por Evolution API desde localhost.
 * No usa la base de datos ni autenticación: solo verifica que tu
 * EVOLUTION_API_URL + EVOLUTION_API_KEY + instancia funcionan y que
 * un mensaje sale por WhatsApp.
 *
 * Uso:
 *   npm run send:test -- 5491122334455 "Hola, esto es una prueba del CRM"
 *
 * El número va en formato internacional, solo dígitos (sin + ni espacios).
 * Requiere en backend/.env: EVOLUTION_API_URL, EVOLUTION_API_KEY,
 * EVOLUTION_INSTANCE_NAME, y que la instancia esté conectada (QR escaneado).
 */
import dotenv from 'dotenv';
import { sendWhatsAppMessage } from './services/evolution.js';

dotenv.config();

const phone = process.argv[2];
const text = process.argv.slice(3).join(' ');

if (!phone || !text) {
  console.error(
    '\n❌ Faltan datos.\n' +
    '   Uso: npm run send:test -- <telefono> "<mensaje>"\n' +
    '   Ej:  npm run send:test -- 5491122334455 "Hola desde el CRM"\n'
  );
  process.exit(1);
}

console.log(`\n→ Instancia: ${process.env.EVOLUTION_INSTANCE_NAME || 'Automata'}`);
console.log(`→ Enviando a: ${phone}`);
console.log(`→ Texto: "${text}"\n`);

sendWhatsAppMessage(phone, text)
  .then((res) => {
    console.log('✅ ¡Enviado! Respuesta de Evolution API:');
    console.log(JSON.stringify(res, null, 2));
    console.log('\nRevisá el WhatsApp del destinatario para confirmar la llegada.\n');
  })
  .catch((err) => {
    console.error('\n❌ Falló el envío:');
    console.error(err?.message || err);
    console.error(
      '\nChequeá: 1) EVOLUTION_API_URL y EVOLUTION_API_KEY en backend/.env, ' +
      '2) que el nombre de la instancia coincida, 3) que la instancia esté conectada.\n'
    );
    process.exit(1);
  });
