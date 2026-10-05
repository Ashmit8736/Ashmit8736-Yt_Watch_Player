export interface VideoState {
  roomId?: string;
  playState: 'playing' | 'paused';
  currentTime: number;
  videoId: string;
  updatedAt?: number;
}
