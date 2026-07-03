/**
 * Capa de abstracción de proveedor de WhatsApp.
 *
 * Permite convivir Evolution API y Cloud API (Meta) durante la migración.
 * El proveedor se elige con la variable de entorno WHATSAPP_PROVIDER:
 *   WHATSAPP_PROVIDER=evolution  → Evolution API (default, lo actual)
 *   WHATSAPP_PROVIDER=cloud      → WhatsApp Cloud API de Meta
 *
 * El resto del código llama a sendText() y recibe siempre un externalId
 * normalizado, sin importar qué proveedor esté activo.
 */
import { sendWhatsAppMessage } from './evolution.js';
import { sendWhatsAppText } from './whatsapp.js';

export type WhatsAppProvider = 'evolution' | 'cloud';

export function getProvider(): WhatsAppProvider {
  return (process.env.WHATSAPP_PROVIDER || 'evolution').toLowerCase() === 'cloud'
    ? 'cloud'
    : 'evolution';
}

export interface SendResult {
  externalId: string | null;
  raw: any;
}

/**
 * Envía un mensaje de texto por el proveedor activo y normaliza la respuesta.
 * Nota: con Cloud API el texto libre solo funciona dentro de la ventana de 24h.
 */
export async function sendText(phone: string, text: string): Promise<SendResult> {
  if (getProvider() === 'cloud') {
    const r = await sendWhatsAppText(phone, text);
    return { externalId: r.id, raw: r.raw };
  }

  const r = await sendWhatsAppMessage(phone, text);
  return { externalId: r?.key?.id || r?.messageId || null, raw: r };
}
