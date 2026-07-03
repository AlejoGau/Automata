/**
 * Prueba rápida de envío por WhatsApp Cloud API (Meta) desde localhost.
 * No usa la base de datos ni autenticación: solo verifica que tus credenciales
 * de Meta funcionan y que un mensaje sale por WhatsApp.
 *
 * Como el número de prueba está fuera de la ventana de 24h, por defecto manda
 * la PLANTILLA hello_world (única forma de iniciar la conversación).
 *
 * Uso:
 *   # Plantilla hello_world (recomendado para el primer test):
 *   npm run send:cloud -- 54911XXXXXXXX
 *
 *   # Texto libre (solo funciona si el cliente te escribió en las últimas 24h):
 *   npm run send:cloud -- 54911XXXXXXXX "Hola, esto es texto libre"
 *
 * El número va en formato internacional, solo dígitos (sin + ni espacios) y
 * tiene que estar agregado como destinatario de prueba en el panel de Meta.
 *
 * Requiere en backend/.env: META_ACCESS_TOKEN, META_PHONE_NUMBER_ID
 * (opcional META_GRAPH_VERSION).
 */
import dotenv from 'dotenv';
import { sendWhatsAppText, sendWhatsAppTemplate } from './services/whatsapp.js';

dotenv.config();

const phone = process.argv[2];
const text = process.argv.slice(3).join(' ');

if (!phone) {
  console.error(
    '\n❌ Falta el número destinatario.\n' +
    '   Uso plantilla:  npm run send:cloud -- 54911XXXXXXXX\n' +
    '   Uso texto libre: npm run send:cloud -- 54911XXXXXXXX "Mensaje"\n' +
    '   (el número solo dígitos, sin + ni espacios, y agregado como test en Meta)\n'
  );
  process.exit(1);
}

const isTemplate = !text;

console.log(`\n→ Phone Number ID: ${process.env.META_PHONE_NUMBER_ID}`);
console.log(`→ Enviando a: ${phone}`);
console.log(isTemplate ? '→ Tipo: plantilla hello_world\n' : `→ Tipo: texto libre → "${text}"\n`);

const send = isTemplate
  ? sendWhatsAppTemplate(phone, 'hello_world', 'en_US')
  : sendWhatsAppText(phone, text);

send
  .then((res) => {
    console.log('✅ ¡Enviado! Respuesta de Meta:');
    console.log(JSON.stringify(res.raw, null, 2));
    console.log(`\n→ wamid (external_id): ${res.id}`);
    console.log('\nRevisá el WhatsApp del destinatario para confirmar la llegada.\n');
  })
  .catch((err) => {
    console.error('\n❌ Falló el envío:');
    console.error(err?.message || err);
    console.error(
      '\nChequeá: 1) META_ACCESS_TOKEN vigente (los temporales duran ~24h), ' +
      '2) META_PHONE_NUMBER_ID correcto, 3) que el destinatario esté agregado ' +
      'como número de prueba en el panel de Meta, 4) si mandás texto libre, que ' +
      'el cliente te haya escrito en las últimas 24h.\n'
    );
    process.exit(1);
  });
