import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useRoomContext, Participant } from '../context/RoomContext';
import { Events } from '../constants/events';
import RoomHeader from '../components/RoomHeader';
import YouTubePlayer from '../components/YouTubePlayer';
import PlayerControls from '../components/PlayerControls';
import ReactionControls from '../components/ReactionControls';
import ReactionOverlay from '../components/ReactionOverlay';
import ParticipantList from '../components/ParticipantList';
import ChatBox from '../components/ChatBox';
import '../styles/room.css';

interface PendingRequest {
  requestId: string;
  requesterId: string;
  requesterName: string;
  action: string;
  value?: any;
}

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
    roomId: currentRoomId,
    currentUser
  } = useRoomContext();

  const [activeRequest, setActiveRequest] = useState<PendingRequest | null>(null);
  const [userNotification, setUserNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      alert('Username is required to join a room');
      navigate('/');
      return;
    }

    if (!isConnected) return;

    const actualRoomId = roomId === 'new' ? undefined : roomId;
    socket.emit(Events.JOIN_ROOM, { roomId: actualRoomId, username, create: roomId === 'new' });

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

    const onActionRequested = (data: PendingRequest) => {
      setActiveRequest(data);
    };

    const onRequestApproved = (data: { message: string }) => {
      setUserNotification(`🎉 ${data.message}`);
      setTimeout(() => setUserNotification(null), 5000);
    };

    const onRequestRejected = (data: { message: string }) => {
      setUserNotification(`⚠️ ${data.message}`);
      setTimeout(() => setUserNotification(null), 5000);
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
    socket.on(Events.USER_JOINED, onUserJoined);
    socket.on(Events.USER_LEFT, onUserLeft);
    socket.on(Events.SYNC_STATE, onSyncState);
    socket.on(Events.ROLE_ASSIGNED, onRoleAssigned);
    socket.on(Events.ACTION_REQUESTED, onActionRequested);
    socket.on(Events.REQUEST_APPROVED, onRequestApproved);
    socket.on(Events.REQUEST_REJECTED, onRequestRejected);
    socket.on(Events.PARTICIPANT_REMOVED, onParticipantRemoved);
    socket.on(Events.ERROR, onError);

    return () => {
      socket.emit(Events.LEAVE_ROOM);
      socket.off('room_joined', onRoomJoined);
      socket.off(Events.USER_JOINED, onUserJoined);
      socket.off(Events.USER_LEFT, onUserLeft);
      socket.off(Events.SYNC_STATE, onSyncState);
      socket.off(Events.ROLE_ASSIGNED, onRoleAssigned);
      socket.off(Events.ACTION_REQUESTED, onActionRequested);
      socket.off(Events.REQUEST_APPROVED, onRequestApproved);
      socket.off(Events.REQUEST_REJECTED, onRequestRejected);
      socket.off(Events.PARTICIPANT_REMOVED, onParticipantRemoved);
      socket.off(Events.ERROR, onError);
      setRoomId(null);
      setParticipants([]);
      setCurrentUser(null);
    };
  }, [roomId, username, isConnected, navigate]);

  const handleApproveRequest = () => {
    if (!activeRequest) return;
    socket.emit(Events.APPROVE_REQUEST, {
      requestId: activeRequest.requestId,
      requesterId: activeRequest.requesterId,
      requesterName: activeRequest.requesterName,
      action: activeRequest.action,
      value: activeRequest.value
    });
    setActiveRequest(null);
  };

  const handleRejectRequest = () => {
    if (!activeRequest) return;
    socket.emit(Events.REJECT_REQUEST, {
      requestId: activeRequest.requestId,
      requesterId: activeRequest.requesterId,
      requesterName: activeRequest.requesterName
    });
    setActiveRequest(null);
  };

  if (!currentRoomId) {
    return (
      <div className="room-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h3>Connecting to Watch Party...</h3>
      </div>
    );
  }

  const isPrivileged = currentUser?.role === 'Host' || currentUser?.role === 'Moderator';

  return (
    <div className="room-container">
      <RoomHeader />

      {/* Participant Request Notification for Host/Mod */}
      {isPrivileged && activeRequest && (
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #6366f1',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div>
            <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>🔔</span>
            <strong>@{activeRequest.requesterName}</strong> requested to{' '}
            {activeRequest.action === 'change_video' ? (
              <span>change video to <code>{activeRequest.value}</code></span>
            ) : (
              <span>be promoted to Moderator</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleApproveRequest}
              style={{
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ✅ Approve
            </button>
            <button 
              onClick={handleRejectRequest}
              style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ❌ Decline
            </button>
          </div>
        </div>
      )}

      {/* Requester Notification Toast */}
      {userNotification && (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '1rem',
          fontWeight: 600,
          color: '#e2e8f0'
        }}>
          {userNotification}
        </div>
      )}

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
