import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { setupWebhookRouter } from './routes/webhook.js';
import { setupWebhookCloudRouter } from './routes/webhookCloud.js';
import { setupMessagesRouter } from './routes/messages.js';
import conversationsRouter from './routes/conversations.js';
import leadsRouter from './routes/leads.js';
import dashboardRouter from './routes/dashboard.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configurar CORS para permitir comunicación con el frontend
app.use(cors({
  origin: '*', // En producción restringir a la URL del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Guardamos el cuerpo crudo (rawBody) para poder validar la firma
// X-Hub-Signature-256 que manda Meta en los webhooks de Cloud API.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));

// Crear Servidor HTTP
const httpServer = createServer(app);

// Inicializar Socket.io
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Manejo de conexiones WebSocket (Útil para presencia y chat en tiempo real)
io.on('connection', (socket) => {
  console.log(`Socket conectado: ${socket.id}`);

  // Un agente abre una conversación específica
  socket.on('conversation:join', (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} entró a conversación: ${conversationId}`);
  });

  // Un agente cierra la conversación
  socket.on('conversation:leave', (conversationId) => {
    socket.leave(conversationId);
    console.log(`Socket ${socket.id} salió de conversación: ${conversationId}`);
  });

  // Presencia: Agente está escribiendo
  socket.on('agent:typing', (data: { conversationId: string; agentName: string; isTyping: boolean }) => {
    // Enviar a todos los demás agentes en la misma sala de conversación
    socket.to(data.conversationId).emit('agent:typing_status', data);
  });

  socket.on('disconnect', () => {
    console.log(`Socket desconectado: ${socket.id}`);
  });
});

// Registrar Rutas
app.use('/api/webhooks', setupWebhookRouter(io));
app.use('/api/webhooks/cloud', setupWebhookCloudRouter(io));
app.use('/api/messages', setupMessagesRouter(io));
app.use('/api/conversations', conversationsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Levantar el servidor
httpServer.listen(port, () => {
  console.log(`Backend de CRM Automata corriendo en puerto ${port}`);
});
