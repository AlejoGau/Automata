/**
 * Envío masivo (campañas) a los leads del workspace.
 *
 * ⚠️ Riesgo de ban: mandar el mismo texto a muchos contactos es la señal #1 de
 * spam para WhatsApp (sobre todo con Evolution, que es no-oficial). Por eso el
 * envío se hace con FRENOS:
 *   - demora aleatoria entre mensaje y mensaje (parece humano)
 *   - personalización con {nombre} (cada mensaje sale distinto)
 *   - tope máximo de destinatarios por campaña
 *
 * POST /api/broadcast
 *   body: { message: string, stageId?: string, leadIds?: string[] }
 *   - message  : texto; admite {nombre} que se reemplaza por el nombre del lead
 *   - leadIds  : si viene, se envía solo a esos leads (tiene prioridad)
 *   - stageId  : si viene (y no hay leadIds), se envía a los leads de esa etapa
 *   - si no viene ninguno, se envía a TODOS los leads del workspace
 *
 * Responde 202 al toque y procesa en segundo plano, emitiendo 'broadcast:progress'.
 */
import { Router, Response } from 'express';
import { supabase } from '../supabase.js';
import { Server as SocketServer } from 'socket.io';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { sendText } from '../services/messaging.js';

// ── Config anti-ban ──────────────────────────────────────────────
const MIN_DELAY_MS = 4000;   // demora mínima entre mensajes
const MAX_DELAY_MS = 12000;  // demora máxima entre mensajes
const MAX_RECIPIENTS = 200;  // tope de destinatarios por campaña

interface Recipient {
  id: string;
  name: string | null;
  phone: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(): number {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

/** Reemplaza {nombre} por el primer nombre del lead (o vacío si no hay). */
function personalize(template: string, name: string | null): string {
  const first = (name || '').trim().split(/\s+/)[0] || '';
  return template.replace(/\{nombre\}/gi, first);
}

async function getOrCreateConversationId(workspaceId: string, leadId: string): Promise<string> {
  const { data: existing, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({
      lead_id: leadId,
      status: 'open',
      workspace_id: workspaceId,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
}

/** Procesa la campaña en segundo plano, un mensaje por vez con demoras. */
async function runBroadcast(
  io: SocketServer,
  userId: string,
  workspaceId: string,
  template: string,
  recipients: Recipient[]
): Promise<void> {
  const total = recipients.length;
  let sent = 0;
  let failed = 0;

  io.emit('broadcast:progress', { status: 'running', sent, failed, total });

  for (let i = 0; i < recipients.length; i++) {
    const lead = recipients[i];
    const content = personalize(template, lead.name);

    try {
      const conversationId = await getOrCreateConversationId(workspaceId, lead.id);

      // Registrar el mensaje saliente en la base
      const { data: msg, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outgoing',
          content,
          sender_id: userId,
          status: 'sent',
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      io.emit('message:sent', { message: msg, conversationId });

      // Despachar por el proveedor activo (Evolution/Cloud)
      const result = await sendText(lead.phone, content);
      if (result.externalId) {
        await supabase
          .from('messages')
          .update({ external_id: result.externalId })
          .eq('id', msg.id);
      }

      sent++;
    } catch (err) {
      console.error(`Broadcast falló para lead ${lead.id} (${lead.phone}):`, err);
      failed++;
    }

    io.emit('broadcast:progress', {
      status: 'running',
      sent,
      failed,
      total,
      current: lead.name || lead.phone,
    });

    // Freno anti-ban: demora aleatoria salvo después del último
    if (i < recipients.length - 1) {
      await sleep(randomDelay());
    }
  }

  io.emit('broadcast:progress', { status: 'done', sent, failed, total });
}

export function setupBroadcastRouter(io: SocketServer) {
  const router = Router();

  router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { message, stageId, leadIds } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Falta el mensaje de la campaña' });
      return;
    }

    try {
      // Construir la lista de destinatarios (siempre dentro del workspace)
      let query = supabase
        .from('leads')
        .select('id, name, phone')
        .eq('workspace_id', user.workspace_id);

      if (Array.isArray(leadIds) && leadIds.length > 0) {
        query = query.in('id', leadIds);
      } else if (stageId) {
        query = query.eq('stage_id', stageId);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      const recipients: Recipient[] = (leads || []).filter(
        (l) => l.phone && /\d{6,}/.test(l.phone)
      );

      if (recipients.length === 0) {
        res.status(400).json({ error: 'No hay destinatarios con teléfono válido' });
        return;
      }

      if (recipients.length > MAX_RECIPIENTS) {
        res.status(400).json({
          error: `Demasiados destinatarios (${recipients.length}). El máximo por campaña es ${MAX_RECIPIENTS} para reducir el riesgo de ban.`,
        });
        return;
      }

      // Responder ya y procesar en segundo plano
      res.status(202).json({ status: 'started', total: recipients.length });

      runBroadcast(io, user.id, user.workspace_id, message, recipients).catch((err) => {
        console.error('Error en la campaña de broadcast:', err);
        io.emit('broadcast:progress', { status: 'error', message: err?.message });
      });
    } catch (error: any) {
      console.error('Error iniciando broadcast:', error);
      res.status(500).json({ error: 'Error iniciando el envío', details: error.message });
    }
  });

  return router;
}
