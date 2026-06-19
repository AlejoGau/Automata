import { Router, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

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
