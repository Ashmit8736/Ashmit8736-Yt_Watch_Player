import { Server } from 'socket.io';
import { Participant, DBParticipant } from './Participant';
import { VideoState } from './VideoState';
import { Events } from '../constants/events';

export interface DBRoom {
  id: string;
  participants: DBParticipant[];
  videoState: VideoState;
}

export class Room {
  public readonly id: string;
  private participants: Map<string, Participant>;
  private videoState: VideoState;

  constructor(id: string, initialVideoState?: VideoState) {
    this.id = id;
    this.participants = new Map();
    this.videoState = initialVideoState || {
      playState: 'paused',
      currentTime: 0,
      videoId: 'dQw4w9WgXcQ',
      updatedAt: Date.now()
    };
  }

  public getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  public getParticipant(id: string): Participant | undefined {
    return this.participants.get(id);
  }

  public findParticipantByUsername(username: string): Participant | undefined {
    for (const p of this.participants.values()) {
      if (p.username === username) return p;
    }
    return undefined;
  }

  public hasHost(): boolean {
    for (const p of this.participants.values()) {
      if (p.isHost()) return true;
    }
    return false;
  }

  public getHost(): Participant | undefined {
    for (const p of this.participants.values()) {
      if (p.isHost()) return p;
    }
    return undefined;
  }

  public addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant);
  }

  public removeParticipant(id: string): Participant | undefined {
    const p = this.participants.get(id);
    this.participants.delete(id);
    return p;
  }

  public isEmpty(): boolean {
    return this.participants.size === 0;
  }

  public getVideoState(): VideoState {
    if (this.videoState.playState === 'playing' && this.videoState.updatedAt) {
      const elapsedSeconds = (Date.now() - this.videoState.updatedAt) / 1000;
      return {
        ...this.videoState,
        currentTime: this.videoState.currentTime + Math.max(0, elapsedSeconds)
      };
    }
    return { ...this.videoState };
  }

  public updateVideoState(updates: Partial<VideoState>): VideoState {
    this.videoState = {
      ...this.videoState,
      ...updates,
      updatedAt: Date.now()
    };
    return this.getVideoState();
  }

  public broadcast(io: Server, event: string, payload: any): void {
    io.to(this.id).emit(event, payload);
  }

  public broadcastExcept(io: Server, excludeSocketId: string, event: string, payload: any): void {
    io.to(this.id).except(excludeSocketId).emit(event, payload);
  }

  public syncAll(io: Server): void {
    this.broadcast(io, Events.SYNC_STATE, this.getVideoState());
  }
}
