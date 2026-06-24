import { Router, Request, Response } from 'express';
import { supabase } from '../supabase.js';
import { Server as SocketServer } from 'socket.io';

const router = Router();

// Helper para extraer texto de las diferentes estructuras de mensaje de Evolution API
function extractMessageContent(message: any): string {
  if (!message) return '';
  if (typeof message === 'string') return message;
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  
  // Placeholders para multimedia
  if (message.imageMessage) return '[Imagen]';
  if (message.videoMessage) return '[Video]';
  if (message.documentMessage) return '[Documento]';
  if (message.audioMessage) return '[Audio]';
  return '[Mensaje no soportado]';
}

// Helper para mapear estados numéricos de Evolution API a texto
function mapStatus(statusNumber: number): 'sent' | 'delivered' | 'read' {
  switch (statusNumber) {
    case 3:
    case 4:
      return 'read';
    case 2:
      return 'delivered';
    case 1:
    default:
      return 'sent';
  }
}

export function setupWebhookRouter(io: SocketServer) {
  // Soporta los dos modos de Evolution:
  //  - webhookByEvents=false → POST a /whatsapp  (el evento viene en el body)
  //  - webhookByEvents=true  → POST a /whatsapp/messages-upsert (evento en la ruta)
  router.post(['/whatsapp', '/whatsapp/:eventPath'], async (req: Request, res: Response) => {
    // Validar token/firma si está configurado en producción (opcional)
    const secret = req.headers['webhook-signature'] || req.headers['x-evolution-token'];
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { data } = req.body;
    // El evento puede venir en el body o en la ruta (ej: "messages-upsert" → "messages.upsert")
    let event = req.body.event;
    if (!event && req.params.eventPath) {
      event = req.params.eventPath.replace(/-/g, '.');
    }

    if (!event || !data) {
      res.status(400).json({ error: 'Payload inválido' });
      return;
    }

    try {
      // 1. EVENTO DE NUEVO MENSAJE (INCOMING O OUTGOING DESDE EL CELULAR)
      if (event === 'messages.upsert') {
        // En Evolution API, data puede ser un objeto único o un arreglo
        const msgData = Array.isArray(data) ? data[0] : data;
        const key = msgData?.key;
        
        if (!key || !key.remoteJid) {
          res.status(200).json({ status: 'ignored', reason: 'No remoteJid' });
          return;
        }

        const remoteJid = key.remoteJid;
        // Evitar procesar mensajes de grupos
        if (remoteJid.includes('@g.us')) {
          res.status(200).json({ status: 'ignored', reason: 'Group message' });
          return;
        }

        const phone = remoteJid.split('@')[0];
        const fromMe = !!key.fromMe;
        const externalId = key.id;
        const pushName = msgData.pushName || phone;
        const content = extractMessageContent(msgData.message);
        
        // Convertir timestamp a ISOString
        const timestamp = msgData.messageTimestamp 
          ? new Date(msgData.messageTimestamp * 1000).toISOString()
          : new Date().toISOString();

        // Evitar registrar mensajes vacíos o que no contienen información útil
        if (!content && !msgData.message) {
          res.status(200).json({ status: 'ignored', reason: 'Empty message' });
          return;
        }

        // --- LÓGICA DE WORKSPACE (MVP: Tomamos el primero o creamos uno) ---
        let workspaceId = '';
        const { data: workspaces, error: wsError } = await supabase
          .from('workspaces')
          .select('id')
          .limit(1);

        if (wsError) throw wsError;

        if (!workspaces || workspaces.length === 0) {
          const { data: newWs, error: createWsError } = await supabase
            .from('workspaces')
            .insert({ name: 'Automata' })
            .select('id')
            .single();

          if (createWsError) throw createWsError;
          workspaceId = newWs.id;
        } else {
          workspaceId = workspaces[0].id;
        }

        // --- LÓGICA DE LEAD ---
        let leadId = '';
        const { data: existingLead, error: leadError } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', phone)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (leadError) throw leadError;

        if (!existingLead) {
          // Buscamos la primera etapa del pipeline
          let stageId = '';
          const { data: stages, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('id')
            .eq('workspace_id', workspaceId)
            .order('order', { ascending: true })
            .limit(1);

          if (stagesError) throw stagesError;

          if (!stages || stages.length === 0) {
            // Crear etapas predeterminadas
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
            stageId = createdStages[0].id;
          } else {
            stageId = stages[0].id;
          }

          // Crear Lead
          const { data: newLead, error: createLeadError } = await supabase
            .from('leads')
            .insert({
              name: pushName,
              phone: phone,
              stage_id: stageId,
              workspace_id: workspaceId,
              source: 'WhatsApp'
            })
            .select('id')
            .single();

          if (createLeadError) throw createLeadError;
          leadId = newLead.id;
        } else {
          leadId = existingLead.id;
        }

        // --- LÓGICA DE CONVERSACIÓN ---
        let conversationId = '';
        const { data: existingConvo, error: convoError } = await supabase
          .from('conversations')
          .select('id, status')
          .eq('lead_id', leadId)
          .maybeSingle();

        if (convoError) throw convoError;

        if (!existingConvo) {
          const { data: newConvo, error: createConvoError } = await supabase
            .from('conversations')
            .insert({
              lead_id: leadId,
              status: 'open',
              workspace_id: workspaceId,
              last_message_at: timestamp
            })
            .select('id')
            .single();

          if (createConvoError) throw createConvoError;
          conversationId = newConvo.id;
        } else {
          conversationId = existingConvo.id;
          
          // Actualizar la fecha del último mensaje y reabrir si estaba cerrada
          await supabase
            .from('conversations')
            .update({ 
              last_message_at: timestamp,
              status: 'open' // Se autoabre al recibir mensaje
            })
            .eq('id', conversationId);
        }

        // --- REGISTRAR MENSAJE ---
        // Verificar si ya existe para evitar duplicidad de webhooks reintentados
        const { data: existingMsg, error: msgCheckError } = await supabase
          .from('messages')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (msgCheckError) throw msgCheckError;

        let messageRow = null;

        if (!existingMsg) {
          const { data: newMsg, error: insertMsgError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              direction: fromMe ? 'outgoing' : 'incoming',
              content: content,
              external_id: externalId,
              status: fromMe ? 'sent' : 'read', // Si es entrante, entra como leído para el cliente
              created_at: timestamp
            })
            .select('*')
            .single();

          if (insertMsgError) throw insertMsgError;
          messageRow = newMsg;
        } else {
          // Si ya existe, podemos omitir o re-emitir
          res.status(200).json({ status: 'ignored', reason: 'Duplicate message' });
          return;
        }

        // Emitir evento por WebSocket en tiempo real
        io.emit('message:received', {
          message: messageRow,
          phone: phone,
          pushName: pushName,
          conversationId: conversationId
        });

        res.status(201).json({ status: 'success', messageId: messageRow.id });
        return;
      }

      // 2. EVENTO DE ACTUALIZACIÓN DE ESTADO (DELIVERED, READ)
      if (event === 'messages.update') {
        const updateArray = Array.isArray(data) ? data : [data];
        
        for (const updateItem of updateArray) {
          const externalId = updateItem?.key?.id;
          const statusVal = updateItem?.update?.status;

          if (externalId && statusVal !== undefined) {
            const mappedStatus = mapStatus(statusVal);

            const { data: updatedMsg, error: updateError } = await supabase
              .from('messages')
              .update({ status: mappedStatus })
              .eq('external_id', externalId)
              .select('*')
              .maybeSingle();

            if (updateError) {
              console.error('Error actualizando estado del mensaje:', updateError);
            }

            if (updatedMsg) {
              // Emitir actualización de estado a través de WebSockets
              io.emit('message:status_updated', {
                messageId: updatedMsg.id,
                conversationId: updatedMsg.conversation_id,
                status: mappedStatus
              });
            }
          }
        }

        res.status(200).json({ status: 'success', event: 'status_updated' });
        return;
      }

      // Otros eventos (ej: conexión) se ignoran de momento
      res.status(200).json({ status: 'ignored', event });
    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
}
