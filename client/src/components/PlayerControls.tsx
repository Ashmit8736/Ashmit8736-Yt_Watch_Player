import React, { useState } from 'react';
import { useRoomContext } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { Events } from '../constants/events';
import '../styles/player.css';

const PlayerControls: React.FC = () => {
  const { videoState, currentUser } = useRoomContext();
  const { socket } = useSocket();
  const [videoInput, setVideoInput] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const canControl = currentUser?.role === 'Host' || currentUser?.role === 'Moderator';

  const handlePlay = () => {
    socket.emit(Events.PLAY);
  };

  const handlePause = () => {
    socket.emit(Events.PAUSE);
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
    socket.emit(Events.CHANGE_VIDEO, { videoId: extractedId });
    setVideoInput('');
  };

  const handleRequestVideoChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    const extractedId = extractVideoId(videoInput);
    if (!extractedId) {
      alert('Invalid YouTube URL or Video ID');
      return;
    }
    socket.emit(Events.REQUEST_CHANGE, {
      action: 'change_video',
      value: extractedId
    });
    setRequestSent(true);
    setVideoInput('');
    setTimeout(() => setRequestSent(false), 4000);
  };

  const handleRequestModRole = () => {
    socket.emit(Events.REQUEST_CHANGE, {
      action: 'request_mod'
    });
    setRequestSent(true);
    setTimeout(() => setRequestSent(false), 4000);
  };

  if (!canControl) {
    return (
      <div className="player-controls-card">
        <div className="participant-notice">
          ℹ️ You are in <strong>{currentUser?.role || 'Viewer'}</strong> mode.
          Want to change the video or get controls? Send a request to the Host!
        </div>

        <form onSubmit={handleRequestVideoChange} className="change-video-form" style={{ marginTop: '0.75rem' }}>
          <input 
            type="text" 
            placeholder="Paste YouTube Video URL to request..." 
            className="input-field change-video-input"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" disabled={!videoInput.trim()}>
            📩 Request Video
          </button>
        </form>

        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleRequestModRole}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          >
            🛡️ Request Moderator Role
          </button>
          {requestSent && (
            <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
              ✅ Request sent to Host!
            </span>
          )}
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
