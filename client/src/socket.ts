import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connect(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io({
    auth: { token },
    transports: ['websocket', 'polling']
  });
  return socket;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}