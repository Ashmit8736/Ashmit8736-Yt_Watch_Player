import React from 'react';
import { useRoomContext, Participant } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import '../styles/participants.css';

const ParticipantList: React.FC = () => {
  const { participants, currentUser } = useRoomContext();
  const { socket } = useSocket();

  const isHost = currentUser?.role === 'Host';

  const handleRoleChange = (userId: string, newRole: string) => {
    socket.emit('assign_role', { userId, role: newRole });
  };

  const handleKick = (userId: string) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      socket.emit('remove_participant', { userId });
    }
  };

  return (
    <div className="participant-card">
      <h3 className="participant-title">Participants ({participants.length})</h3>
      <ul className="participant-list">
        {participants.map((p: Participant) => (
          <li key={p.id} className="participant-item">
            <div>
              <strong className="participant-name">
                {p.username} {p.id === currentUser?.id ? '(You)' : ''}
              </strong>
              <span className="participant-role-tag">{p.role}</span>
            </div>

            {isHost && p.id !== currentUser?.id && (
              <div className="participant-actions">
                <select 
                  value={p.role}
                  onChange={(e) => handleRoleChange(p.id, e.target.value)}
                  className="role-select"
                >
                  <option value="Host">Make Host</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Participant">Participant</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <button 
                  className="btn danger kick-btn"
                  onClick={() => handleKick(p.id)}
                >
                  Kick
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ParticipantList;
