import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../services/socket';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextState {
  socket: Socket;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextState>({ socket, isConnected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      socket.auth = { token };
    }
    socket.connect();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
