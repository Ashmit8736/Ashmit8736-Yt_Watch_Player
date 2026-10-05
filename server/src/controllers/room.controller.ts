import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { RoomManager } from '../services/RoomManager';

export class RoomController {
  static async getActiveRooms(req: Request, res: Response) {
    try {
      const io: Server = req.app.get('io');
      const allRooms = await RoomManager.getActiveRooms();

      const liveRooms = allRooms.filter(r => {
        if (!io) return true;
        const socketRoom = io.sockets.adapter.rooms.get(r.id);
        return socketRoom && socketRoom.size > 0;
      });

      res.json({ rooms: liveRooms });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch active rooms' });
    }
  }

  static async getLatestRoom(req: Request, res: Response) {
    try {
      const io: Server = req.app.get('io');
      const allRooms = await RoomManager.getActiveRooms();
      const liveRooms = allRooms.filter(r => {
        if (!io) return true;
        const socketRoom = io.sockets.adapter.rooms.get(r.id);
        return socketRoom && socketRoom.size > 0;
      });

      if (liveRooms.length > 0) {
        res.json({ room: liveRooms[liveRooms.length - 1] });
      } else {
        res.json({ room: null });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch latest room' });
    }
  }
}
