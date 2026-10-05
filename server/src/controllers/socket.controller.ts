import { Server, Socket } from 'socket.io';
import { RoomManager } from '../services/RoomManager';
import { AuthService } from '../services/AuthService';
import { Role } from '../constants/roles';
import { Events } from '../constants/events';
import { generateRoomId } from '../utils/generateRoomId';

export class SocketController {
  private io: Server;
  private socket: Socket;

  constructor(io: Server, socket: Socket) {
    this.io = io;
    this.socket = socket;
  }

  public registerEvents(): void {
    this.socket.on(Events.JOIN_ROOM, this.handleJoinRoom.bind(this));
    this.socket.on(Events.LEAVE_ROOM, this.handleLeaveRoom.bind(this));
    this.socket.on(Events.PLAY, this.handlePlay.bind(this));
    this.socket.on(Events.PAUSE, this.handlePause.bind(this));
    this.socket.on(Events.SEEK, this.handleSeek.bind(this));
    this.socket.on(Events.CHANGE_VIDEO, this.handleChangeVideo.bind(this));
    this.socket.on(Events.ASSIGN_ROLE, this.handleAssignRole.bind(this));
    this.socket.on(Events.REMOVE_PARTICIPANT, this.handleRemoveParticipant.bind(this));
    this.socket.on(Events.CHAT_MESSAGE, this.handleChatMessage.bind(this));
    this.socket.on(Events.REACTION, this.handleReaction.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
  }

  private async handleJoinRoom(payload: { roomId?: string; username: string; create?: boolean }): Promise<void> {
    try {
      if (!payload.username) {
        this.socket.emit(Events.ERROR, { message: 'Username is required. Please register or login first!' });
        return;
      }

      // Check if user is registered in the database
      const registeredUser = await AuthService.findUserByUsername(payload.username);
      if (!registeredUser) {
        this.socket.emit(Events.ERROR, { 
          message: `Invalid username: User '@${payload.username}' is not registered. Please register first!` 
        });
        return;
      }

      let roomId = payload.roomId?.trim();
      let isCreator = payload.create || false;

      if (!roomId || roomId === 'new') {
        roomId = generateRoomId();
        isCreator = true;
      }

      let roomRecord = await RoomManager.getRoom(roomId);
      if (!roomRecord) {
        if (isCreator) {
          roomRecord = await RoomManager.createRoom(roomId);
        } else {
          this.socket.emit(Events.ERROR, { message: `Room "${roomId}" not found. Please check the Room ID or create a new watch party!` });
          return;
        }
      }

      const existingHost = roomRecord.participants.find(p => p.role === Role.HOST);
      const role = (!existingHost || existingHost.username === payload.username) ? Role.HOST : Role.PARTICIPANT;

      // Clean up ghost connection if same username
      const ghostUser = roomRecord.participants.find(p => p.username === payload.username);
      if (ghostUser) {
        await RoomManager.removeParticipant(ghostUser.id);
      }

      await RoomManager.addParticipant(roomId, this.socket.id, payload.username, role);
      this.socket.join(roomId);
      this.socket.data.roomId = roomId;
      this.socket.data.username = payload.username;

      const updatedRoom = await RoomManager.getRoom(roomId);
      if (!updatedRoom) return;

      this.socket.emit(Events.SYNC_STATE, updatedRoom.videoState);
      this.socket.emit('room_joined', { roomId });

      this.io.to(roomId).emit(Events.USER_JOINED, {
        username: payload.username,
        userId: this.socket.id,
        role: role,
        participants: updatedRoom.participants
      });
    } catch (err) {
      console.error('Error in handleJoinRoom:', err);
      this.socket.emit(Events.ERROR, { message: 'Failed to join room' });
    }
  }

  private async handlePlay(): Promise<void> {
    const roomId = this.socket.data.roomId;
    if (!roomId) return;
    const participant = await RoomManager.getParticipant(this.socket.id);
    if (!participant || (participant.role !== Role.HOST && participant.role !== Role.MODERATOR)) {
      this.socket.emit(Events.ERROR, { message: 'Unauthorized' });
      return;
    }
    await RoomManager.updateVideoState(roomId, { playState: 'playing' });
    const room = await RoomManager.getRoom(roomId);
    if (room) {
      this.io.to(roomId).emit(Events.SYNC_STATE, room.videoState);
    }
  }

  private async handlePause(): Promise<void> {
    const roomId = this.socket.data.roomId;
    if (!roomId) return;
    const participant = await RoomManager.getParticipant(this.socket.id);
    if (!participant || (participant.role !== Role.HOST && participant.role !== Role.MODERATOR)) {
      this.socket.emit(Events.ERROR, { message: 'Unauthorized' });
      return;
    }
    await RoomManager.updateVideoState(roomId, { playState: 'paused' });
    const room = await RoomManager.getRoom(roomId);
    if (room) {
      this.io.to(roomId).emit(Events.SYNC_STATE, room.videoState);
    }
  }

  private async handleSeek(payload: { time: number }): Promise<void> {
    const roomId = this.socket.data.roomId;
    if (!roomId || typeof payload.time !== 'number') return;
    const participant = await RoomManager.getParticipant(this.socket.id);
    if (!participant || (participant.role !== Role.HOST && participant.role !== Role.MODERATOR)) {
      this.socket.emit(Events.ERROR, { message: 'Unauthorized' });
      return;
    }
    await RoomManager.updateVideoState(roomId, { currentTime: payload.time });
    const room = await RoomManager.getRoom(roomId);
    if (room) {
      this.io.to(roomId).emit(Events.SYNC_STATE, room.videoState);
    }
  }

  private async handleChangeVideo(payload: { videoId: string }): Promise<void> {
    const roomId = this.socket.data.roomId;
    if (!roomId || !payload.videoId) return;
    const participant = await RoomManager.getParticipant(this.socket.id);
    if (!participant || (participant.role !== Role.HOST && participant.role !== Role.MODERATOR)) {
      this.socket.emit(Events.ERROR, { message: 'Unauthorized' });
      return;
    }
    await RoomManager.updateVideoState(roomId, {
      videoId: payload.videoId,
      currentTime: 0,
      playState: 'paused'
    });
    const room = await RoomManager.getRoom(roomId);
    if (room) {
      this.io.to(roomId).emit(Events.SYNC_STATE, room.videoState);
    }
  }

  private async handleAssignRole(payload: { userId: string; role: Role }): Promise<void> {
    const roomId = this.socket.data.roomId;
    if (!roomId) return;
    const currentParticipant = await RoomManager.getParticipant(this.socket.id);
    if (!currentParticipant || currentParticipant.role !== Role.HOST) {
      this.socket.emit(Events.ERROR, { message: 'Unauthorized: Host only' });
      return;
    }

    const targetParticipant = await RoomManager.getParticipant(payload.userId);
    if (targetParticipant && targetParticipant.roomId === roomId) {
      if (payload.role === Role.HOST) {
        await RoomManager.updateRole(this.socket.id, Role.PARTICIPANT);
      }
      await RoomManager.updateRole(payload.userId, payload.role);
      const updatedRoom = await RoomManager.getRoom(roomId);
      this.io.to(roomId).emit(Events.ROLE_ASSIGNED, {
        userId: targetParticipant.id,
        username: targetParticipant.username,
        role: payload.role,
        participants: updatedRoom?.participants || []
      });
    }
  }

  private async handleRemoveParticipant(payload: { userId: string }): Promise<void> {
    const roomId = this.socket.data.roomId;
    if (!roomId) return;
    const currentParticipant = await RoomManager.getParticipant(this.socket.id);
    if (!currentParticipant || currentParticipant.role !== Role.HOST) {
      this.socket.emit(Events.ERROR, { message: 'Unauthorized: Host only' });
      return;
    }

    const targetParticipant = await RoomManager.getParticipant(payload.userId);
    if (targetParticipant && targetParticipant.roomId === roomId) {
      await RoomManager.removeParticipant(payload.userId);
      this.io.to(payload.userId).emit(Events.PARTICIPANT_REMOVED, { message: 'You have been removed by the host' });
      const targetSocket = this.io.sockets.sockets.get(payload.userId);
      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.data.roomId = null;
      }
      const updatedRoom = await RoomManager.getRoom(roomId);
      this.io.to(roomId).emit(Events.USER_LEFT, {
        userId: payload.userId,
        username: targetParticipant.username,
        participants: updatedRoom?.participants || []
      });
    }
  }

  private handleChatMessage(payload: { text: string }): void {
    const roomId = this.socket.data.roomId;
    if (!roomId || !payload.text) return;
    this.io.to(roomId).emit(Events.CHAT_MESSAGE, {
      userId: this.socket.id,
      username: this.socket.data.username,
      text: payload.text,
      timestamp: Date.now()
    });
  }

  private handleReaction(payload: { emoji: string }): void {
    const roomId = this.socket.data.roomId;
    if (!roomId || !payload.emoji) return;
    this.io.to(roomId).emit(Events.REACTION, {
      userId: this.socket.id,
      username: this.socket.data.username,
      emoji: payload.emoji
    });
  }

  private async handleLeaveRoom(): Promise<void> {
    const roomId = this.socket.data.roomId;
    if (!roomId) return;
    this.socket.leave(roomId);
    const room = await RoomManager.getRoom(roomId);
    if (room) {
      const leavingUser = room.participants.find(p => p.id === this.socket.id);
      const wasHost = leavingUser?.role === Role.HOST;

      await RoomManager.removeParticipant(this.socket.id);
      const updatedRoom = await RoomManager.getRoom(roomId);
      const participants = updatedRoom ? updatedRoom.participants : [];
      this.io.to(roomId).emit(Events.USER_LEFT, {
        username: this.socket.data.username,
        userId: this.socket.id,
        participants: participants
      });

      if (participants.length === 0) {
        await RoomManager.deleteRoom(roomId);
      } else if (wasHost) {
        await RoomManager.updateVideoState(roomId, { playState: 'paused' });
        const pausedRoom = await RoomManager.getRoom(roomId);
        if (pausedRoom) {
          this.io.to(roomId).emit(Events.SYNC_STATE, pausedRoom.videoState);
        }
      }
    }
    this.socket.data.roomId = null;
  }

  private async handleDisconnect(): Promise<void> {
    try {
      const roomId = this.socket.data.roomId;
      if (roomId) {
        const room = await RoomManager.getRoom(roomId);
        if (room) {
          const leavingUser = room.participants.find(p => p.id === this.socket.id);
          const wasHost = leavingUser?.role === Role.HOST;

          await RoomManager.removeParticipant(this.socket.id);
          const updatedRoom = await RoomManager.getRoom(roomId);
          const participants = updatedRoom ? updatedRoom.participants : [];
          this.io.to(roomId).emit(Events.USER_LEFT, {
            username: this.socket.data.username,
            userId: this.socket.id,
            participants: participants
          });

          if (participants.length === 0) {
            await RoomManager.deleteRoom(roomId);
          } else if (wasHost) {
            await RoomManager.updateVideoState(roomId, { playState: 'paused' });
            const pausedRoom = await RoomManager.getRoom(roomId);
            if (pausedRoom) {
              this.io.to(roomId).emit(Events.SYNC_STATE, pausedRoom.videoState);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error on disconnect:', err);
    }
  }
}
