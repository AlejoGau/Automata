/**
 * Lógica compartida de "bandeja de entrada": dado un mensaje entrante ya
 * normalizado (teléfono real, texto, id externo), se encarga de:
 *   - ubicar/crear el workspace, el lead y la conversación
 *   - registrar el mensaje evitando duplicados (por external_id)
 *   - emitir el evento en tiempo real por Socket.io
 *
 * La usa el webhook de Cloud API (Meta). El webhook de Evolution mantiene su
 * propia copia por ahora; cuando se apague Evolution, unificamos.
 */
import { supabase } from '../supabase.js';
import { Server as SocketServer } from 'socket.io';

async function getOrCreateWorkspaceId(): Promise<string> {
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1);

  if (error) throw error;

  if (workspaces && workspaces.length > 0) return workspaces[0].id;

  const { data: newWs, error: createError } = await supabase
    .from('workspaces')
    .insert({ name: 'Automata' })
    .select('id')
    .single();

  if (createError) throw createError;
  return newWs.id;
}

async function getFirstStageId(workspaceId: string): Promise<string> {
  const { data: stages, error } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('order', { ascending: true })
    .limit(1);

  if (error) throw error;
  if (stages && stages.length > 0) return stages[0].id;

  // Crear etapas predeterminadas si el pipeline está vacío
  const defaults = [
    { name: 'Nuevo', order: 1, workspace_id: workspaceId },
    { name: 'Contactado', order: 2, workspace_id: workspaceId },
    { name: 'En Negociación', order: 3, workspace_id: workspaceId },
    { name: 'Ganado', order: 4, workspace_id: workspaceId },
    { name: 'Perdido', order: 5, workspace_id: workspaceId },
  ];

  const { data: created, error: createError } = await supabase
    .from('pipeline_stages')
    .insert(defaults)
    .select('id')
    .order('order', { ascending: true });

  if (createError) throw createError;
  return created[0].id;
}

async function getOrCreateLeadId(
  workspaceId: string,
  phone: string,
  name: string
): Promise<string> {
  const { data: existing, error } = await supabase
    .from('leads')
    .select('id')
    .eq('phone', phone)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing.id;

  const stageId = await getFirstStageId(workspaceId);

  const { data: newLead, error: createError } = await supabase
    .from('leads')
    .insert({
      name,
      phone,
      stage_id: stageId,
      workspace_id: workspaceId,
      source: 'WhatsApp',
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return newLead.id;
}

async function getOrCreateConversationId(
  workspaceId: string,
  leadId: string,
  timestamp: string
): Promise<string> {
  const { data: existing, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (error) throw error;

  if (existing) {
    // Actualizar último mensaje y reabrir si estaba cerrada
    await supabase
      .from('conversations')
      .update({ last_message_at: timestamp, status: 'open' })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data: newConvo, error: createError } = await supabase
    .from('conversations')
    .insert({
      lead_id: leadId,
      status: 'open',
      workspace_id: workspaceId,
      last_message_at: timestamp,
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return newConvo.id;
}

export interface IncomingMessage {
  phone: string;
  name?: string;
  content: string;
  externalId?: string | null;
  timestamp: string; // ISO string
}

/**
 * Procesa un mensaje entrante: crea lead/conversación si hace falta, registra
 * el mensaje (evitando duplicados) y emite 'message:received' por Socket.io.
 */
export async function ingestIncomingMessage(
  io: SocketServer,
  msg: IncomingMessage
): Promise<{ status: string; messageId?: string }> {
  const name = msg.name || msg.phone;

  const workspaceId = await getOrCreateWorkspaceId();
  const leadId = await getOrCreateLeadId(workspaceId, msg.phone, name);
  const conversationId = await getOrCreateConversationId(workspaceId, leadId, msg.timestamp);

  // Evitar duplicados por reintentos de webhook
  if (msg.externalId) {
    const { data: existingMsg, error: checkError } = await supabase
      .from('messages')
      .select('id')
      .eq('external_id', msg.externalId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingMsg) return { status: 'duplicate', messageId: existingMsg.id };
  }

  const { data: newMsg, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      direction: 'incoming',
      content: msg.content,
      external_id: msg.externalId ?? null,
      status: 'read', // los entrantes entran como leídos para el cliente
      created_at: msg.timestamp,
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  io.emit('message:received', {
    message: newMsg,
    phone: msg.phone,
    pushName: name,
    conversationId,
  });

  return { status: 'success', messageId: newMsg.id };
}

/**
 * Actualiza el estado de un mensaje saliente (sent/delivered/read) por su
 * external_id y emite 'message:status_updated' por Socket.io.
 */
export async function updateMessageStatus(
  io: SocketServer,
  externalId: string,
  status: 'sent' | 'delivered' | 'read'
): Promise<void> {
  const { data: updated, error } = await supabase
    .from('messages')
    .update({ status })
    .eq('external_id', externalId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error actualizando estado del mensaje:', error);
    return;
  }

  if (updated) {
    io.emit('message:status_updated', {
      messageId: updated.id,
      conversationId: updated.conversation_id,
      status,
    });
  }
}
