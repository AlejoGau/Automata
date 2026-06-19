import { Router, Response } from 'express';
import { supabase } from '../supabase.js';
import { sendWhatsAppMessage } from '../services/evolution.js';
import { Server as SocketServer } from 'socket.io';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

export function setupMessagesRouter(io: SocketServer) {
  // Buscar mensajes por texto (dentro del workspace)
  router.get('/search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { query } = req.query;
    const user = req.user!;

    if (!query || typeof query !== 'string') {
      res.status(200).json([]);
      return;
    }

    try {
      // 1. Obtener conversaciones del workspace
      const { data: convos, error: convosError } = await supabase
        .from('conversations')
        .select('id')
        .eq('workspace_id', user.workspace_id);

      if (convosError) throw convosError;
      const convoIds = convos.map(c => c.id);

      if (convoIds.length === 0) {
        res.status(200).json([]);
        return;
      }

      // 2. Buscar en la tabla messages
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          direction,
          created_at,
          conversation_id,
          conversations (
            id,
            leads (
              id,
              name,
              phone
            )
          )
        `)
        .in('conversation_id', convoIds)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false });

      if (msgsError) throw msgsError;

      res.status(200).json(msgs);
    } catch (error: any) {
      console.error('Error al buscar mensajes:', error);
      res.status(500).json({ error: 'Error al buscar mensajes', details: error.message });
    }
  });

  // Enviar un mensaje (Protegido por autenticación)
  router.post('/send', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { conversationId, content } = req.body;
    const user = req.user!; // Obtenido del token en requireAuth

    if (!conversationId || !content) {
      res.status(400).json({ error: 'Faltan parámetros requeridos: conversationId, content' });
      return;
    }

    try {
      // 1. Obtener la conversación, validar pertenencia al mismo workspace y obtener número
      const { data: convo, error: convoError } = await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          assigned_agent_id,
          workspace_id,
          leads (
            phone,
            name
          )
        `)
        .eq('id', conversationId)
        .single();

      if (convoError || !convo) {
        res.status(404).json({ error: 'Conversación no encontrada' });
        return;
      }

      // Validar que el agente pertenece al mismo workspace que la conversación
      if (convo.workspace_id !== user.workspace_id) {
        res.status(403).json({ error: 'No tienes acceso a este espacio de trabajo' });
        return;
      }

      const lead = convo.leads as any;
      if (!lead || !lead.phone) {
        res.status(400).json({ error: 'El lead asociado no tiene un número de teléfono válido' });
        return;
      }

      // 2. Lógica de asignación automática de conversación al primer agente que responde
      if (!convo.assigned_agent_id) {
        const { error: assignError } = await supabase
          .from('conversations')
          .update({ assigned_agent_id: user.id })
          .eq('id', conversationId);

        if (!assignError) {
          convo.assigned_agent_id = user.id; // Actualizar variable local
          io.emit('conversation:assigned', {
            conversationId: conversationId,
            assignedAgentId: user.id
          });
        }
      }

      // 3. Guardar el mensaje saliente en la base de datos
      const { data: tempMsg, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outgoing',
          content: content,
          sender_id: user.id, // Seguro: obtenido de la sesión, no del body
          status: 'sent',
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Actualizar timestamp del último mensaje de la conversación
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Emitir mensaje por socket en tiempo real
      io.emit('message:sent', {
        message: tempMsg,
        conversationId: conversationId
      });

      // 4. Despachar a WhatsApp mediante Evolution API
      let apiResult;
      try {
        apiResult = await sendWhatsAppMessage(lead.phone, content);
      } catch (apiError: any) {
        console.error('Error al enviar mensaje por Evolution API:', apiError);
        
        // Si falla la llamada externa, dejamos constancia
        res.status(500).json({ 
          error: 'Error al enviar por WhatsApp. Revisa la conexión de la API.',
          details: apiError.message,
          message: tempMsg
        });
        return;
      }

      // 5. Actualizar con el external_id real de WhatsApp devuelto por la API
      const externalId = apiResult?.key?.id || apiResult?.messageId || null;

      const { data: finalMsg, error: updateError } = await supabase
        .from('messages')
        .update({ external_id: externalId })
        .eq('id', tempMsg.id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // Comunicar la actualización del ID externo
      io.emit('message:updated', {
        message: finalMsg,
        conversationId: conversationId
      });

      res.status(201).json(finalMsg);
    } catch (error: any) {
      console.error('Error en endpoint /send:', error);
      res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
  });

  return router;
}
