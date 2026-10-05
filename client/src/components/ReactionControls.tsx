import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useRoomContext } from '../context/RoomContext';
import '../styles/reactions.css';

const emojis = ['\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83C\uDF89', '\uD83D\uDD25'];

const ReactionControls: React.FC = () => {
  const { socket } = useSocket();
  const { roomId } = useRoomContext();

  const handleSendReaction = (emoji: string) => {
    if (!roomId) return;
    socket.emit('reaction', { emoji });
  };

  return (
    <div className="reaction-controls-card">
      {emojis.map(e => (
        <button 
          key={e} 
          onClick={() => handleSendReaction(e)}
          className="reaction-btn"
          title="React with emoji"
        >
          {e}
        </button>
      ))}
    </div>
  );
};

export default ReactionControls;
