/**
 * Cliente de WhatsApp Cloud API (Meta / Graph API).
 *
 * Reemplazo de Evolution API. A diferencia de Evolution:
 *  - Se autentica con Bearer token (META_ACCESS_TOKEN), no con apikey.
 *  - El número real del contacto llega directo (no hay @lid que resolver).
 *  - Fuera de la ventana de 24h desde el último mensaje del cliente, SOLO se
 *    pueden enviar plantillas aprobadas (usar sendWhatsAppTemplate), no texto libre.
 *
 * Requiere en backend/.env:
 *   META_ACCESS_TOKEN       token de acceso (temporal al principio, luego permanente)
 *   META_PHONE_NUMBER_ID    ID del número (ej: 1149528651583377)
 *   META_GRAPH_VERSION      opcional, por defecto v22.0
 */
import dotenv from 'dotenv';

dotenv.config();

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v22.0';

/** Resultado normalizado de un envío: id = wamid del mensaje en WhatsApp. */
export interface CloudSendResult {
  id: string | null;
  raw: any;
}

function assertConfig(): void {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    throw new Error(
      'Faltan credenciales de WhatsApp Cloud API (META_ACCESS_TOKEN, META_PHONE_NUMBER_ID) en backend/.env'
    );
  }
}

function messagesUrl(): string {
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`;
}

/** Cloud API espera el número en formato internacional, solo dígitos, sin "+". */
function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

async function postToGraph(body: Record<string, unknown>): Promise<CloudSendResult> {
  assertConfig();

  const response = await fetch(messagesUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data?.error?.message || JSON.stringify(data);
    throw new Error(`WhatsApp Cloud API falló con estado ${response.status}: ${detail}`);
  }

  return { id: data?.messages?.[0]?.id ?? null, raw: data };
}

/**
 * Envía un mensaje de texto libre.
 * OJO: solo funciona dentro de la ventana de 24h desde el último mensaje del
 * cliente. Fuera de esa ventana, Meta lo rechaza y hay que usar una plantilla.
 */
export async function sendWhatsAppText(phone: string, text: string): Promise<CloudSendResult> {
  return postToGraph({
    messaging_product: 'whatsapp',
    to: cleanPhone(phone),
    type: 'text',
    text: { body: text, preview_url: false },
  });
}

/**
 * Envía un mensaje de plantilla (obligatorio para iniciar conversación o
 * escribir fuera de la ventana de 24h). Por defecto usa "hello_world" en inglés,
 * la plantilla de prueba que ofrece Meta.
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName = 'hello_world',
  languageCode = 'en_US',
  components?: unknown[]
): Promise<CloudSendResult> {
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components && components.length > 0) {
    template.components = components;
  }

  return postToGraph({
    messaging_product: 'whatsapp',
    to: cleanPhone(phone),
    type: 'template',
    template,
  });
}
