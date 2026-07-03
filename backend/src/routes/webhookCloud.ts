/**
 * Webhook de WhatsApp Cloud API (Meta).
 *
 * Se monta en /api/webhooks/cloud y expone:
 *   GET  /  → verificación del webhook (responde el hub.challenge)
 *   POST /  → recepción de mensajes entrantes y actualizaciones de estado
 *
 * Callback URL a configurar en el panel de Meta:
 *   https://TU-BACKEND/api/webhooks/cloud
 *
 * Variables en el entorno del backend:
 *   META_VERIFY_TOKEN  string secreto que también se pega en el panel de Meta
 *   META_APP_SECRET    (opcional) para validar la firma X-Hub-Signature-256
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Server as SocketServer } from 'socket.io';
import { ingestIncomingMessage, updateMessageStatus } from '../services/inbox.js';

/** Extrae texto legible de los distintos tipos de mensaje de Cloud API. */
function extractCloudContent(message: any): string {
  if (!message) return '';
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'image':
      return message.image?.caption || '[Imagen]';
    case 'video':
      return message.video?.caption || '[Video]';
    case 'document':
      return message.document?.caption || message.document?.filename || '[Documento]';
    case 'audio':
      return '[Audio]';
    case 'sticker':
      return '[Sticker]';
    case 'location':
      return '[Ubicación]';
    case 'contacts':
      return '[Contacto]';
    case 'button':
      return message.button?.text || '[Respuesta]';
    case 'interactive':
      return (
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        '[Respuesta interactiva]'
      );
    default:
      return '[Mensaje no soportado]';
  }
}

/** Mapea el status de Cloud API a nuestro enum (ignora 'failed' y otros). */
function normalizeStatus(status: string): 'sent' | 'delivered' | 'read' | null {
  if (status === 'sent' || status === 'delivered' || status === 'read') return status;
  return null;
}

/** Valida la firma X-Hub-Signature-256 usando el App Secret (si está configurado). */
function isValidSignature(req: Request): boolean {
  const appSecret = process.env.META_APP_SECRET;
  // Si no hay App Secret configurado, no validamos (útil al empezar a probar).
  if (!appSecret) return true;

  const signature = req.header('x-hub-signature-256');
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!signature || !rawBody) return false;

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function setupWebhookCloudRouter(io: SocketServer) {
  const router = Router();

  // ── Verificación del webhook (Meta pega un GET al guardar la Callback URL) ──
  router.get('/', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      console.warn('Webhook Cloud: verificación fallida (token no coincide)');
      res.sendStatus(403);
    }
  });

  // ── Recepción de eventos ──
  router.post('/', async (req: Request, res: Response) => {
    if (!isValidSignature(req)) {
      res.sendStatus(401);
      return;
    }

    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') {
      res.sendStatus(404);
      return;
    }

    try {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};

          // Nombre por wa_id (viene en contacts[])
          const nameByWaId = new Map<string, string>();
          for (const c of value.contacts || []) {
            if (c?.wa_id && c?.profile?.name) nameByWaId.set(c.wa_id, c.profile.name);
          }

          // Mensajes entrantes (siempre de clientes: Cloud API no reenvía los propios)
          for (const m of value.messages || []) {
            if (!m?.from) continue;
            const timestamp = m.timestamp
              ? new Date(Number(m.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            await ingestIncomingMessage(io, {
              phone: m.from,
              name: nameByWaId.get(m.from),
              content: extractCloudContent(m),
              externalId: m.id,
              timestamp,
            });
          }

          // Actualizaciones de estado (sent/delivered/read) de mensajes salientes
          for (const s of value.statuses || []) {
            const mapped = normalizeStatus(s?.status);
            if (s?.id && mapped) {
              await updateMessageStatus(io, s.id, mapped);
            }
          }
        }
      }
    } catch (error) {
      // Devolvemos 200 igual para que Meta no reintente en bucle; el error queda logueado.
      console.error('Error procesando webhook de Cloud API:', error);
    }

    // Meta exige un 200 rápido para dar por entregado el evento.
    res.sendStatus(200);
  });

  return router;
}
