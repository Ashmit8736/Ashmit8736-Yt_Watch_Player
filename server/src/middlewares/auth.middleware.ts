import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { AuthService } from '../services/AuthService';

export function expressAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const user = AuthService.verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  (req as any).user = user;
  next();
}

export function socketAuthMiddleware(socket: Socket, next: (err?: any) => void) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (token) {
    const user = AuthService.verifyToken(token);
    if (user) {
      socket.data.authUser = user;
      socket.data.username = user.username;
    }
  }
  next();
}
