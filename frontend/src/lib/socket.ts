import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Creamos la instancia del socket pero no la conectamos de inmediato
export const socket: Socket = io(BACKEND_URL, {
  autoConnect: false,
});
