import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useRoomContext } from '../context/RoomContext';
import '../styles/chat.css';

interface ChatMessage {
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const { socket } = useSocket();
  const { currentUser } = useRoomContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('chat_message', handleChatMessage);

    return () => {
      socket.off('chat_message', handleChatMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || text.length > 500) return;
    socket.emit('chat_message', { text });
    setInputText('');
  };

  return (
    <div className="chat-card">
      <h3 className="chat-title">Live Chat</h3>
      
      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <p className="chat-empty-msg">No messages yet. Say hi!</p>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.userId === currentUser?.id;
            const isSystem = msg.userId === 'system';
            return (
              <div 
                key={idx} 
                className={`chat-bubble ${isSystem ? 'system' : isMe ? 'mine' : 'theirs'}`}
              >
                {!isMe && !isSystem && <div className="chat-author-name">{msg.username}</div>}
                {isSystem && <div className="chat-system-badge">System Notice</div>}
                <div>{msg.text}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message (max 500 chars)..." 
          maxLength={500}
          className="input-field chat-input"
        />
        <button type="submit" className="btn" disabled={!inputText.trim()}>Send</button>
      </form>
    </div>
  );
};

export default ChatBox;
