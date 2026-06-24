import dotenv from 'dotenv';

dotenv.config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'Automata';

/**
 * Envia un mensaje de texto por WhatsApp usando Evolution API.
 * @param phone Teléfono del destinatario (ej: "5491122334455")
 * @param text Contenido del mensaje de texto
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('Error: Las credenciales de Evolution API no están configuradas.');
    throw new Error('Evolution API configurations are missing.');
  }

  // Sanitizar la URL para evitar barras duplicadas
  const baseUrl = EVOLUTION_API_URL.endsWith('/') 
    ? EVOLUTION_API_URL.slice(0, -1) 
    : EVOLUTION_API_URL;
    
  const url = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;

  // Limpiar caracteres del número telefónico (sólo dígitos)
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const payload = {
    number: cleanPhone,
    text: text
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Evolution API falló con estado ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en sendWhatsAppMessage:', error);
    throw error;
  }
}

/**
 * Trae la lista de chats existentes de la instancia desde Evolution API.
 * Sirve para importar al CRM las conversaciones que ya existen en WhatsApp.
 */
export async function fetchEvolutionChats(): Promise<any[]> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API configurations are missing.');
  }

  const baseUrl = EVOLUTION_API_URL.endsWith('/')
    ? EVOLUTION_API_URL.slice(0, -1)
    : EVOLUTION_API_URL;
  const url = `${baseUrl}/chat/findChats/${EVOLUTION_INSTANCE_NAME}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`findChats falló con estado ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data?.chats || []);
}

/**
 * Trae la lista de contactos de la instancia desde Evolution API.
 */
export async function fetchEvolutionContacts(): Promise<any[]> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API configurations are missing.');
  }
  const baseUrl = EVOLUTION_API_URL.endsWith('/')
    ? EVOLUTION_API_URL.slice(0, -1)
    : EVOLUTION_API_URL;
  const url = `${baseUrl}/chat/findContacts/${EVOLUTION_INSTANCE_NAME}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify({})
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : (data?.contacts || []);
}

// ── Resolución de @lid → número real ──────────────────────────────────────
// WhatsApp usa un identificador de privacidad "@lid" en vez del teléfono.
// Evolution guarda el contacto @lid y el @s.whatsapp.net con la MISMA foto de
// perfil, así que cruzamos por la base de la URL de la foto para mapear
// LID → número real. Cacheamos el índice para no pegarle a Evolution en cada mensaje.
let contactsIndexCache: { at: number; lidToPhone: Map<string, { phone: string; name?: string }> } | null = null;
const CONTACTS_TTL_MS = 5 * 60 * 1000;

function picBase(url?: string | null): string | null {
  if (!url) return null;
  const base = url.split('?')[0];
  return base || null;
}

async function getContactsIndex() {
  if (contactsIndexCache && Date.now() - contactsIndexCache.at < CONTACTS_TTL_MS) {
    return contactsIndexCache;
  }
  const contacts = await fetchEvolutionContacts();
  // Agrupar por base de foto para encontrar pares (lid, teléfono) de la misma persona
  const byBase = new Map<string, { lid?: string; phone?: string; name?: string }>();
  for (const c of contacts) {
    const jid: string = c?.remoteJid || '';
    const base = picBase(c?.profilePicUrl);
    if (!base) continue;
    const entry = byBase.get(base) || {};
    if (jid.endsWith('@lid')) {
      entry.lid = jid.split('@')[0];
    } else if (jid.endsWith('@s.whatsapp.net')) {
      const num = jid.split('@')[0];
      if (/^\d{6,}$/.test(num) && num !== '0') entry.phone = num;
    }
    if (c?.pushName) entry.name = c.pushName;
    byBase.set(base, entry);
  }
  const lidToPhone = new Map<string, { phone: string; name?: string }>();
  for (const e of byBase.values()) {
    if (e.lid && e.phone) lidToPhone.set(e.lid, { phone: e.phone, name: e.name });
  }
  contactsIndexCache = { at: Date.now(), lidToPhone };
  return contactsIndexCache;
}

/**
 * Dado un remoteJid de WhatsApp, devuelve el teléfono real y el nombre.
 * Resuelve los identificadores de privacidad "@lid" al número real cuando se puede.
 */
export async function resolveIdentity(
  remoteJid: string,
  pushName?: string | null
): Promise<{ phone: string; name?: string }> {
  const num = remoteJid.split('@')[0];
  if (remoteJid.endsWith('@lid')) {
    try {
      const idx = await getContactsIndex();
      const match = idx.lidToPhone.get(num);
      if (match) return { phone: match.phone, name: pushName || match.name };
    } catch (e) {
      // si falla la resolución, caemos al LID
    }
  }
  return { phone: num, name: pushName || undefined };
}

/**
 * Extrae el texto legible de las distintas estructuras de mensaje de WhatsApp.
 */
export function extractMessageContent(message: any): string {
  if (!message) return '';
  if (typeof message === 'string') return message;
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.imageMessage) return '[Imagen]';
  if (message.videoMessage) return '[Video]';
  if (message.documentMessage) return '[Documento]';
  if (message.audioMessage) return '[Audio]';
  return '[Mensaje no soportado]';
}
