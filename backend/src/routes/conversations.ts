import { Router, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { fetchEvolutionChats, extractMessageContent, resolveIdentity } from '../services/evolution.js';

const router = Router();

// Importar/sincronizar los chats existentes de WhatsApp (vía Evolution) hacia la base.
// Crea leads + conversaciones + el último mensaje de cada chat. Idempotente.
router.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    const chats = await fetchEvolutionChats();

    // Primera etapa del pipeline (para los leads nuevos)
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('workspace_id', user.workspace_id)
      .order('order', { ascending: true })
      .limit(1);
    const firstStageId = stages?.[0]?.id ?? null;

    let synced = 0;
    let skipped = 0;

    for (const chat of chats) {
      const jid: string | undefined = chat?.remoteJid;
      // Saltar grupos, broadcasts/estados y entradas sin JID
      if (!jid || jid.includes('@g.us') || jid.includes('status@') || jid.startsWith('0@')) {
        skipped++;
        continue;
      }

      const rawId = jid.split('@')[0];
      // Resolver @lid → número real (y mejor nombre) cuando se pueda
      const resolved = await resolveIdentity(jid, chat.pushName);
      const identifier = resolved.phone;
      const name = resolved.name || chat.pushName || identifier;
      const lastMsg = chat.lastMessage;
      const ts = lastMsg?.messageTimestamp
        ? new Date(lastMsg.messageTimestamp * 1000).toISOString()
        : (chat.updatedAt || new Date().toISOString());

      // Si resolvimos un @lid a un número real, borrar el lead viejo que había
      // quedado guardado bajo el código LID (autolimpieza de imports previos).
      if (identifier !== rawId) {
        await supabase
          .from('leads')
          .delete()
          .eq('phone', rawId)
          .eq('workspace_id', user.workspace_id);
      }

      // 1. Lead (upsert por teléfono + workspace)
      let leadId: string;
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', identifier)
        .eq('workspace_id', user.workspace_id)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: newLead, error: leadErr } = await supabase
          .from('leads')
          .insert({
            name,
            phone: identifier,
            stage_id: firstStageId,
            workspace_id: user.workspace_id,
            source: 'WhatsApp'
          })
          .select('id')
          .single();
        if (leadErr || !newLead) {
          console.error('Sync: error creando lead', identifier, leadErr?.message);
          continue;
        }
        leadId = newLead.id;
      }

      // 2. Conversación (upsert por lead)
      let conversationId: string;
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (existingConvo) {
        conversationId = existingConvo.id;
        await supabase
          .from('conversations')
          .update({ last_message_at: ts })
          .eq('id', conversationId);
      } else {
        const { data: newConvo, error: convoErr } = await supabase
          .from('conversations')
          .insert({
            lead_id: leadId,
            status: 'open',
            workspace_id: user.workspace_id,
            last_message_at: ts
          })
          .select('id')
          .single();
        if (convoErr || !newConvo) {
          console.error('Sync: error creando conversación', leadId, convoErr?.message);
          continue;
        }
        conversationId = newConvo.id;
      }

      // 3. Último mensaje (upsert por external_id)
      const extId = lastMsg?.key?.id;
      if (extId) {
        const { data: existsMsg } = await supabase
          .from('messages')
          .select('id')
          .eq('external_id', extId)
          .maybeSingle();

        if (!existsMsg) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            direction: lastMsg.key.fromMe ? 'outgoing' : 'incoming',
            content: extractMessageContent(lastMsg.message),
            external_id: extId,
            status: lastMsg.key.fromMe ? 'sent' : 'read',
            created_at: ts
          });
        }
      }

      synced++;
    }

    res.status(200).json({ synced, skipped, total: chats.length });
  } catch (error: any) {
    console.error('Error al sincronizar chats:', error);
    res.status(500).json({ error: 'Error al sincronizar chats', details: error.message });
  }
});

// Obtener todas las conversaciones del workspace del agente autenticado
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        status,
        last_message_at,
        assigned_agent_id,
        leads (
          id,
          name,
          phone,
          source,
          stage_id,
          pipeline_stages (
            id,
            name
          )
        )
      `)
      .eq('workspace_id', user.workspace_id)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(conversations);
  } catch (error: any) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ error: 'Error interno al obtener conversaciones', details: error.message });
  }
});

// Obtener los mensajes de una conversación (Con validación de pertenencia al workspace)
router.get('/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.id;
  const user = req.user!;

  try {
    // Validar primero que la conversación pertenezca al workspace del agente
    const { data: convo, error: convoError } = await supabase
      .from('conversations')
      .select('workspace_id')
      .eq('id', conversationId)
      .single();

    if (convoError || !convo) {
      res.status(404).json({ error: 'Conversación no encontrada' });
      return;
    }

    if (convo.workspace_id !== user.workspace_id) {
      res.status(403).json({ error: 'No tienes permisos para acceder a esta conversación' });
      return;
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        direction,
        content,
        sender_id,
        external_id,
        status,
        created_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json(messages);
  } catch (error: any) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error interno al obtener mensajes', details: error.message });
  }
});

// Asignar agente a una conversación (Manual)
router.post('/:id/assign', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.id;
  const { agentId } = req.body;
  const user = req.user!;

  try {
    // 1. Validar que la conversación pertenezca al workspace
    const { data: convo, error: convoError } = await supabase
      .from('conversations')
      .select('workspace_id')
      .eq('id', conversationId)
      .single();

    if (convoError || !convo) {
      res.status(404).json({ error: 'Conversación no encontrada' });
      return;
    }

    if (convo.workspace_id !== user.workspace_id) {
      res.status(403).json({ error: 'No tienes acceso a este espacio de trabajo' });
      return;
    }

    // 2. Si se asigna un agente, validar que pertenezca al mismo workspace
    if (agentId) {
      const { data: targetAgent, error: agentError } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', agentId)
        .single();

      if (agentError || !targetAgent || targetAgent.workspace_id !== user.workspace_id) {
        res.status(400).json({ error: 'El agente a asignar debe pertenecer al mismo espacio de trabajo' });
        return;
      }
    }

    // 3. Realizar asignación
    const { data, error } = await supabase
      .from('conversations')
      .update({ assigned_agent_id: agentId || null })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error: any) {
    console.error('Error al asignar conversación:', error);
    res.status(500).json({ error: 'Error interno al asignar conversación', details: error.message });
  }
});

export default router;
