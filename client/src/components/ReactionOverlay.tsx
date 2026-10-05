import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useRoomContext } from '../context/RoomContext';
import '../styles/reactions.css';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

const ReactionOverlay: React.FC = () => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const { socket } = useSocket();
  const { roomId } = useRoomContext();

  useEffect(() => {
    if (!roomId) return;

    const handleReaction = (data: { emoji: string }) => {
      const newReaction: Reaction = {
        id: Math.random().toString(36).substring(2, 9),
        emoji: data.emoji,
        x: Math.random() * 70 + 15,
      };
      
      setReactions((prev) => [...prev, newReaction]);

      setTimeout(() => {
        setReactions((prev) => prev.filter(r => r.id !== newReaction.id));
      }, 3000);
    };

    socket.on('reaction', handleReaction);

    return () => {
      socket.off('reaction', handleReaction);
    };
  }, [socket, roomId]);

  return (
    <div className="reaction-overlay-container">
      {reactions.map(r => (
        <div
          key={r.id}
          className="floating-emoji"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
};

export default ReactionOverlay;
