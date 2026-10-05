import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || API_BASE_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
