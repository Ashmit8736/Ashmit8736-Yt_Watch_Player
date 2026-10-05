import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRoomContext, Participant } from '../context/RoomContext';
import RoomHeader from '../components/RoomHeader';
import YouTubePlayer from '../components/YouTubePlayer';
import PlayerControls from '../components/PlayerControls';
import ReactionControls from '../components/ReactionControls';
import ReactionOverlay from '../components/ReactionOverlay';
import ParticipantList from '../components/ParticipantList';
import ChatBox from '../components/ChatBox';
import '../styles/room.css';

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username');
  const navigate = useNavigate();

  const { socket, isConnected } = useSocket();
  const { 
    setRoomId, 
    setParticipants, 
    setCurrentUser, 
    setVideoState,
    roomId: currentRoomId
  } = useRoomContext();

  useEffect(() => {
    if (!username) {
      alert('Username is required to join a room');
      navigate('/');
      return;
    }

    if (!isConnected) return;

    const actualRoomId = roomId === 'new' ? undefined : roomId;
    socket.emit('join_room', { roomId: actualRoomId, username, create: roomId === 'new' });

    const onRoomJoined = (data: { roomId: string }) => {
      setRoomId(data.roomId);
      if (roomId === 'new') {
        window.history.replaceState(null, '', `/room/${data.roomId}?username=${encodeURIComponent(username)}`);
      }
    };

    const onUserJoined = (data: { username: string, userId: string, role: any, participants: Participant[] }) => {
      setParticipants(data.participants);
      const me = data.participants.find(p => p.id === socket.id);
      if (me) setCurrentUser(me as any);
    };

    const onUserLeft = (data: { participants: Participant[] }) => {
      setParticipants(data.participants);
    };

    const onSyncState = (state: any) => {
      setVideoState(state);
    };

    const onRoleAssigned = (data: { participants: Participant[] }) => {
      setParticipants(data.participants);
      const me = data.participants.find(p => p.id === socket.id);
      if (me) setCurrentUser(me as any);
    };

    const onParticipantRemoved = (data: { message: string }) => {
       alert(data.message);
       navigate('/');
    };

    const onError = (data: { message: string }) => {
      alert(data.message);
      navigate('/');
    };

    socket.on('room_joined', onRoomJoined);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('sync_state', onSyncState);
    socket.on('role_assigned', onRoleAssigned);
    socket.on('participant_removed', onParticipantRemoved);
    socket.on('error', onError);

    return () => {
      socket.emit('leave_room');
      socket.off('room_joined', onRoomJoined);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('sync_state', onSyncState);
      socket.off('role_assigned', onRoleAssigned);
      socket.off('participant_removed', onParticipantRemoved);
      socket.off('error', onError);
      setRoomId(null);
      setParticipants([]);
      setCurrentUser(null);
    };
  }, [roomId, username, isConnected, navigate]);

  if (!currentRoomId) {
    return (
      <div className="room-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h3>Connecting to Watch Party...</h3>
      </div>
    );
  }

  return (
    <div className="room-container">
      <RoomHeader />
      <div className="room-grid">
        <div className="video-section-wrapper">
          <div style={{ position: 'relative' }}>
            <YouTubePlayer />
            <ReactionOverlay />
          </div>
          <ReactionControls />
          <PlayerControls />
        </div>
        <div className="sidebar-section-wrapper">
          <ParticipantList />
          <ChatBox />
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
