import React, { useState } from 'react';
import { useRoomContext } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import '../styles/player.css';

const PlayerControls: React.FC = () => {
  const { videoState, currentUser } = useRoomContext();
  const { socket } = useSocket();
  const [videoInput, setVideoInput] = useState('');

  const canControl = currentUser?.role === 'Host' || currentUser?.role === 'Moderator';

  const handlePlay = () => {
    socket.emit('play');
  };

  const handlePause = () => {
    socket.emit('pause');
  };

  const extractVideoId = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('?')) {
      return trimmed;
    }
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
    const match = trimmed.match(regExp);
    return (match && match[1]) ? match[1] : trimmed;
  };

  const handleChangeVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput) return;
    const extractedId = extractVideoId(videoInput);
    if (!extractedId) {
      alert('Invalid YouTube URL or Video ID');
      return;
    }
    socket.emit('change_video', { videoId: extractedId });
    setVideoInput('');
  };

  if (!canControl) {
    return (
      <div className="player-controls-card">
        <div className="participant-notice">
          ℹ️ You are in <strong>{currentUser?.role || 'Viewer'}</strong> mode. Only Host and Moderators have playback controls.
        </div>
      </div>
    );
  }

  return (
    <div className="player-controls-card">
      <div className="playback-btn-row">
        <button 
          className="btn" 
          onClick={handlePlay}
          disabled={videoState.playState === 'playing'}
        >
          ▶ Play
        </button>
        <button 
          className="btn" 
          onClick={handlePause}
          disabled={videoState.playState === 'paused'}
        >
          ⏸ Pause
        </button>
      </div>

      <form onSubmit={handleChangeVideo} className="change-video-form">
        <input 
          type="text" 
          placeholder="Paste YouTube Video URL or Video ID" 
          className="input-field change-video-input"
          value={videoInput}
          onChange={(e) => setVideoInput(e.target.value)}
        />
        <button type="submit" className="btn">Change Video</button>
      </form>
    </div>
  );
};

export default PlayerControls;
