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
