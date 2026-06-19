import { Router, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Obtener estadísticas agregadas del workspace del agente
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    // 1. Obtener conteo de leads del workspace
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('stage_id')
      .eq('workspace_id', user.workspace_id);

    if (leadsError) throw leadsError;

    // 2. Obtener conteo de conversaciones por estado
    const { data: convos, error: convosError } = await supabase
      .from('conversations')
      .select('status')
      .eq('workspace_id', user.workspace_id);

    if (convosError) throw convosError;

    // 3. Contar mensajes totales, entrantes y salientes
    const { data: workspaceConvos, error: wsConvosError } = await supabase
      .from('conversations')
      .select('id')
      .eq('workspace_id', user.workspace_id);

    if (wsConvosError) throw wsConvosError;

    const convoIds = workspaceConvos.map(c => c.id);
    let totalMessages = 0;
    let incomingMessages = 0;
    let outgoingMessages = 0;

    if (convoIds.length > 0) {
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('direction')
        .in('conversation_id', convoIds);

      if (msgsError) throw msgsError;

      totalMessages = msgs.length;
      incomingMessages = msgs.filter(m => m.direction === 'incoming').length;
      outgoingMessages = msgs.filter(m => m.direction === 'outgoing').length;
    }

    // Estructurar el reporte final
    res.status(200).json({
      leadsCount: leads.length,
      leadsByStage: {
        'stage-1': leads.filter(l => l.stage_id === 'stage-1').length,
        'stage-2': leads.filter(l => l.stage_id === 'stage-2').length,
        'stage-3': leads.filter(l => l.stage_id === 'stage-3').length,
        'stage-4': leads.filter(l => l.stage_id === 'stage-4').length,
        'stage-5': leads.filter(l => l.stage_id === 'stage-5').length,
      },
      conversations: {
        total: convos.length,
        open: convos.filter(c => c.status === 'open').length,
        closed: convos.filter(c => c.status === 'closed').length
      },
      messages: {
        total: totalMessages,
        incoming: incomingMessages,
        outgoing: outgoingMessages
      }
    });
  } catch (error: any) {
    console.error('Error al obtener métricas del dashboard:', error);
    res.status(500).json({ error: 'Error al obtener métricas del dashboard', details: error.message });
  }
});

export default router;
