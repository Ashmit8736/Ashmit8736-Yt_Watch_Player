import { Server, Socket } from 'socket.io';
import { SocketController } from '../controllers/socket.controller';
import { socketAuthMiddleware } from '../middlewares/auth.middleware';

export function setupSockets(io: Server) {
  // Socket auth middleware (optional JWT support)
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id} (${socket.data.username || 'Guest'})`);

    // Initialize custom socket data
    socket.data.roomId = null;
    socket.data.userId = socket.id;
    if (!socket.data.username) {
      socket.data.username = 'Anonymous';
    }

    // SocketController handles all room and message events in MVC architecture
    const controller = new SocketController(io, socket);
    controller.registerEvents();
  });
}
