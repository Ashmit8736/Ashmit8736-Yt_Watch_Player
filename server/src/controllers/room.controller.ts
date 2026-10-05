import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { RoomManager } from '../services/RoomManager';

export class RoomController {
  static async getActiveRooms(req: Request, res: Response) {
    try {
      const io: Server = req.app.get('io');
      const allRooms = await RoomManager.getActiveRooms();

      const liveRooms = allRooms.filter(r => {
        if (!io || !io.sockets || !io.sockets.adapter) return true;
        try {
          const socketRoom = (io.sockets.adapter.rooms as any)?.get?.(r.id);
          return socketRoom ? socketRoom.size > 0 : true;
        } catch {
          return true;
        }
      });

      res.json({ rooms: liveRooms });
    } catch (err: any) {
      console.error('Error fetching active rooms:', err);
      res.json({ rooms: [] });
    }
  }

  static async getLatestRoom(req: Request, res: Response) {
    try {
      const io: Server = req.app.get('io');
      const allRooms = await RoomManager.getActiveRooms();
      const liveRooms = allRooms.filter(r => {
        if (!io || !io.sockets || !io.sockets.adapter) return true;
        try {
          const socketRoom = (io.sockets.adapter.rooms as any)?.get?.(r.id);
          return socketRoom ? socketRoom.size > 0 : true;
        } catch {
          return true;
        }
      });

      if (liveRooms.length > 0) {
        res.json({ room: liveRooms[liveRooms.length - 1] });
      } else {
        res.json({ room: null });
      }
    } catch (err: any) {
      console.error('Error fetching latest room:', err);
      res.json({ room: null });
    }
  }
}
