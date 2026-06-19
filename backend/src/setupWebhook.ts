/**
 * Registra (o actualiza) el webhook de la instancia de Evolution API para que
 * apunte a este backend. Así no hay que configurarlo a mano en el panel.
 *
 * Uso:
 *   npm run webhook:setup -- https://tu-backend-publico.com
 *   (o definí PUBLIC_BACKEND_URL en backend/.env y corré: npm run webhook:setup)
 *
 * Requiere en backend/.env:
 *   EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME
 */
import dotenv from 'dotenv';

dotenv.config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'Automata';

// La URL pública del backend: por argumento de línea de comandos o por env.
const publicUrl = process.argv[2] || process.env.PUBLIC_BACKEND_URL;

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  fail('Faltan EVOLUTION_API_URL o EVOLUTION_API_KEY en backend/.env');
}
if (!publicUrl) {
  fail(
    'Falta la URL pública del backend.\n' +
    '   Pasala como argumento:  npm run webhook:setup -- https://tu-backend.com\n' +
    '   o definí PUBLIC_BACKEND_URL en backend/.env'
  );
}

const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, '');
const webhookUrl = `${publicUrl.replace(/\/+$/, '')}/api/webhooks/whatsapp`;

// Evolution API v2: POST /webhook/set/{instance}
// Los eventos que nos importan: mensajes nuevos y cambios de estado (✓✓).
const payload = {
  webhook: {
    enabled: true,
    url: webhookUrl,
    webhookByEvents: false,
    webhookBase64: false,
    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE'],
  },
};

async function main() {
  const url = `${baseUrl}/webhook/set/${INSTANCE}`;
  console.log(`\n→ Instancia: ${INSTANCE}`);
  console.log(`→ Apuntando el webhook a: ${webhookUrl}`);
  console.log(`→ POST ${url}\n`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY as string,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    fail(`Evolution respondió ${res.status}: ${text}`);
  }

  console.log('✅ Webhook registrado correctamente. Respuesta de Evolution:');
  console.log(text);
  console.log(
    '\nProbá enviando un WhatsApp al número de la instancia: debería aparecer ' +
    'en el inbox del CRM en tiempo real.\n'
  );
}

main().catch((err) => fail(err?.message || String(err)));
