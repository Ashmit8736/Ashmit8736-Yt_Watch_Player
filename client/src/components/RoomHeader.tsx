import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomContext } from '../context/RoomContext';
import '../styles/room.css';

const RoomHeader: React.FC = () => {
  const { roomId, currentUser } = useRoomContext();
  const navigate = useNavigate();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room link copied to clipboard!');
  };

  const handleBack = () => {
    if (window.confirm('Are you sure you want to leave this Watch Party?')) {
      navigate('/');
    }
  };

  return (
    <div className="room-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={handleBack}
          className="btn"
          style={{
            background: '#f1f2f6',
            color: '#2f3640',
            border: '1px solid #dcdde1',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '6px'
          }}
          title="Leave room and return to home page"
        >
          ← Leave Party
        </button>
        <div>
          <h2 className="room-header-title">YouTube Watch Party</h2>
          <span style={{ fontSize: '13px', color: '#7f8fa6' }}>
            Role: <strong>{currentUser?.role || 'Joining...'}</strong>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span 
          className="room-badge"
          onClick={handleCopyLink}
          title="Click to copy room link"
        >
          Room: <strong>{roomId}</strong> (Copy Link 📋)
        </span>
      </div>
    </div>
  );
};

export default RoomHeader;
