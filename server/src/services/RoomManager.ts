import { runQuery, getQuery, allQuery } from '../config/db';
import { Role } from '../constants/roles';
import { DBParticipant } from '../models/Participant';
import { VideoState } from '../models/VideoState';
import { DBRoom } from '../models/Room';

class RoomManagerService {
  async createRoom(roomId: string): Promise<DBRoom> {
    await runQuery(`INSERT OR IGNORE INTO rooms (id) VALUES (?)`, [roomId]);
    
    const defaultState: VideoState = {
      roomId,
      playState: 'paused',
      currentTime: 0,
      videoId: '',
      updatedAt: Date.now()
    };
    
    await runQuery(
      `INSERT OR IGNORE INTO video_states (roomId, playState, currentTime, videoId, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [roomId, defaultState.playState, defaultState.currentTime, defaultState.videoId, defaultState.updatedAt]
    );

    return { id: roomId, participants: [], videoState: defaultState };
  }

  async getRoom(roomId: string): Promise<DBRoom | undefined> {
    const roomRow = await getQuery<{ id: string }>('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!roomRow) return undefined;

    const participants = await allQuery<DBParticipant>('SELECT * FROM participants WHERE roomId = ?', [roomId]);
    const videoStateRow = await getQuery<VideoState>('SELECT * FROM video_states WHERE roomId = ?', [roomId]);

    if (videoStateRow && videoStateRow.playState === 'playing' && videoStateRow.updatedAt) {
      const updatedTime = typeof videoStateRow.updatedAt === 'number' 
        ? videoStateRow.updatedAt 
        : new Date(videoStateRow.updatedAt + 'Z').getTime();
      
      const elapsedSeconds = (Date.now() - updatedTime) / 1000;
      if (elapsedSeconds > 0 && elapsedSeconds < 86400) {
        videoStateRow.currentTime += elapsedSeconds;
      }
    }

    return {
      id: roomId,
      participants: participants || [],
      videoState: videoStateRow || { roomId, playState: 'paused', currentTime: 0, videoId: '' }
    };
  }

  async deleteRoom(roomId: string) {
    await runQuery('DELETE FROM rooms WHERE id = ?', [roomId]);
  }

  async addParticipant(roomId: string, userId: string, username: string, role: Role) {
    await runQuery(
      `INSERT OR REPLACE INTO participants (id, username, role, roomId) VALUES (?, ?, ?, ?)`,
      [userId, username, role, roomId]
    );
  }

  async removeParticipant(userId: string) {
    await runQuery('DELETE FROM participants WHERE id = ?', [userId]);
  }

  async getParticipant(userId: string): Promise<DBParticipant | undefined> {
    return getQuery<DBParticipant>('SELECT * FROM participants WHERE id = ?', [userId]);
  }

  async updateRole(userId: string, newRole: Role) {
    await runQuery('UPDATE participants SET role = ? WHERE id = ?', [newRole, userId]);
  }

  async updateVideoState(roomId: string, data: { playState?: string, currentTime?: number, videoId?: string }) {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.playState !== undefined) {
      updates.push('playState = ?');
      values.push(data.playState);
    }
    if (data.currentTime !== undefined) {
      updates.push('currentTime = ?');
      values.push(data.currentTime);
    }
    if (data.videoId !== undefined) {
      updates.push('videoId = ?');
      values.push(data.videoId);
    }

    if (updates.length > 0) {
      values.push(Date.now());
      values.push(roomId);
      await runQuery(`UPDATE video_states SET ${updates.join(', ')}, updatedAt = ? WHERE roomId = ?`, values);
    }
  }

  async getActiveRooms(): Promise<{ id: string; hostUsername: string; participantCount: number }[]> {
    const rows = await allQuery<DBParticipant>('SELECT * FROM participants');
    const byRoom = new Map<string, DBParticipant[]>();
    for (const p of rows) {
      const list = byRoom.get(p.roomId) || [];
      list.push(p);
      byRoom.set(p.roomId, list);
    }
    return Array.from(byRoom.entries()).map(([id, list]) => {
      const host = list.find(p => p.role === Role.HOST);
      return {
        id,
        hostUsername: host ? host.username : list[0].username,
        participantCount: list.length
      };
    });
  }
}

export const RoomManager = new RoomManagerService();
