import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { RoomProvider } from '../context/RoomContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <RoomProvider>
          <RouterProvider router={router} />
        </RoomProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
