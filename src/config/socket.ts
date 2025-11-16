import { io, Socket } from 'socket.io-client';

// Replace with your Socket.io server URL
const SOCKET_SERVER_URL = 'http://your-socket-server-url.com';

// Create a singleton socket instance
let socket: Socket | null = null;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
};
