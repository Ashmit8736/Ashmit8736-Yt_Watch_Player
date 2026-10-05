import React, { createContext, useContext, useState } from 'react';

export interface Participant {
  id: string;
  username: string;
  role: 'Host' | 'Moderator' | 'Participant' | 'Viewer';
}

export interface VideoState {
  playState: 'playing' | 'paused';
  currentTime: number;
  videoId: string;
  updatedAt: number;
}

interface RoomContextState {
  roomId: string | null;
  participants: Participant[];
  currentUser: Participant | null;
  videoState: VideoState;
  setRoomId: (id: string | null) => void;
  setParticipants: (p: Participant[]) => void;
  setCurrentUser: (u: Participant | null) => void;
  setVideoState: (v: VideoState) => void;
}

const defaultState: RoomContextState = {
  roomId: null,
  participants: [],
  currentUser: null,
  videoState: { playState: 'paused', currentTime: 0, videoId: '', updatedAt: 0 },
  setRoomId: () => {},
  setParticipants: () => {},
  setCurrentUser: () => {},
  setVideoState: () => {},
};

export const RoomContext = createContext<RoomContextState>(defaultState);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [videoState, setVideoState] = useState<VideoState>(defaultState.videoState);

  return (
    <RoomContext.Provider value={{
      roomId, participants, currentUser, videoState,
      setRoomId, setParticipants, setCurrentUser, setVideoState
    }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoomContext = () => useContext(RoomContext);
