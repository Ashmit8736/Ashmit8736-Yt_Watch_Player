import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RoomPage from '../pages/RoomPage';
import NotFoundPage from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/room/:roomId',
    element: <RoomPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
