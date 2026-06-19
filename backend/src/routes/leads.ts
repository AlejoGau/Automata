import { Router, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Obtener todos los leads del workspace del agente autenticado
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        phone,
        source,
        stage_id,
        created_at,
        pipeline_stages (
          id,
          name
        )
      `)
      .eq('workspace_id', user.workspace_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(leads);
  } catch (error: any) {
    console.error('Error al obtener leads:', error);
    res.status(500).json({ error: 'Error al obtener leads', details: error.message });
  }
});

// Crear un nuevo lead (Dentro del workspace del agente)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, source, stageId } = req.body;
  const user = req.user!;

  if (!name || !phone) {
    res.status(400).json({ error: 'Faltan parámetros requeridos: name, phone' });
    return;
  }

  try {
    const workspaceId = user.workspace_id;

    // Si no proveen stageId, buscar el primero o crearlo en ese workspace
    let finalStageId = stageId;
    if (!finalStageId) {
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('order', { ascending: true })
        .limit(1);

      if (stagesError) throw stagesError;

      if (!stages || stages.length === 0) {
        const stagesToCreate = [
          { name: 'Nuevo', order: 1, workspace_id: workspaceId },
          { name: 'Contactado', order: 2, workspace_id: workspaceId },
          { name: 'En Negociación', order: 3, workspace_id: workspaceId },
          { name: 'Ganado', order: 4, workspace_id: workspaceId },
          { name: 'Perdido', order: 5, workspace_id: workspaceId }
        ];

        const { data: createdStages, error: createStagesError } = await supabase
          .from('pipeline_stages')
          .insert(stagesToCreate)
          .select('id')
          .order('order', { ascending: true });

        if (createStagesError) throw createStagesError;
        finalStageId = createdStages[0].id;
      } else {
        finalStageId = stages[0].id;
      }
    }

    // Crear Lead
    const { data: lead, error: createLeadError } = await supabase
      .from('leads')
      .insert({
        name,
        phone: phone.replace(/[^0-9]/g, ''),
        source: source || 'Manual',
        stage_id: finalStageId,
        workspace_id: workspaceId
      })
      .select('*')
      .single();

    if (createLeadError) throw createLeadError;

    // Crear conversación para el lead automáticamente
    const { data: newConvo, error: createConvoError } = await supabase
      .from('conversations')
      .insert({
        lead_id: lead.id,
        status: 'open',
        workspace_id: workspaceId,
        last_message_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (createConvoError) throw createConvoError;

    res.status(201).json({ lead, conversationId: newConvo.id });
  } catch (error: any) {
    console.error('Error al crear lead:', error);
    res.status(500).json({ error: 'Error al crear lead', details: error.message });
  }
});

// Actualizar etapa de un lead (Con validación de workspace)
router.put('/:id/stage', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const leadId = req.params.id;
  const { stageId } = req.body;
  const user = req.user!;

  if (!stageId) {
    res.status(400).json({ error: 'Falta parámetro requerido: stageId' });
    return;
  }

  try {
    // 1. Validar que el lead pertenezca al workspace
    const { data: existingLead, error: leadError } = await supabase
      .from('leads')
      .select('workspace_id')
      .eq('id', leadId)
      .single();

    if (leadError || !existingLead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }

    if (existingLead.workspace_id !== user.workspace_id) {
      res.status(403).json({ error: 'No tienes acceso a este lead' });
      return;
    }

    // 2. Validar que la etapa destino pertenezca al workspace
    const { data: stageCheck } = await supabase
      .from('pipeline_stages')
      .select('workspace_id')
      .eq('id', stageId)
      .single();

    if (!stageCheck || stageCheck.workspace_id !== user.workspace_id) {
      res.status(400).json({ error: 'La etapa destino no es válida para este espacio de trabajo' });
      return;
    }

    // 3. Actualizar etapa
    const { data: lead, error } = await supabase
      .from('leads')
      .update({ stage_id: stageId })
      .eq('id', leadId)
      .select(`
        id,
        name,
        phone,
        source,
        stage_id,
        pipeline_stages (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    res.status(200).json(lead);
  } catch (error: any) {
    console.error('Error al actualizar etapa del lead:', error);
    res.status(500).json({ error: 'Error al actualizar etapa del lead', details: error.message });
  }
});

export default router;
