import React, { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import '../styles/player.css';

const YouTubePlayer: React.FC = () => {
  const { videoState, currentUser } = useRoomContext();
  const { socket } = useSocket();
  const playerRef = useRef<any>(null);
  const isReady = useRef(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const isDragging = useRef(false);

  const videoStateRef = useRef(videoState);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    videoStateRef.current = videoState;
  }, [videoState]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '450',
        width: '100%',
        videoId: videoState.videoId || 'dQw4w9WgXcQ',
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            isReady.current = true;
            const currentState = videoStateRef.current;
            
            if (currentState.currentTime > 0) {
              event.target.seekTo(currentState.currentTime, true);
            }
            
            if (currentState.playState === 'playing') {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
          },
          onStateChange: (event: any) => {
            const currentRole = currentUserRef.current?.role;
            const currentPlayState = videoStateRef.current.playState;
            if (currentRole === 'Host' || currentRole === 'Moderator') {
              if (event.data === window.YT.PlayerState.PLAYING) {
                if (currentPlayState !== 'playing') {
                  socket.emit('play');
                  socket.emit('seek', { time: event.target.getCurrentTime() });
                }
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                if (currentPlayState !== 'paused') {
                  socket.emit('pause');
                  socket.emit('seek', { time: event.target.getCurrentTime() });
                }
              }
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, []);

  useEffect(() => {
    if (isReady.current && playerRef.current && playerRef.current.getPlayerState) {
      const currentPlayerState = playerRef.current.getPlayerState();
      
      if (videoState.videoId) {
        const currentData = playerRef.current.getVideoData();
        if (currentData && currentData.video_id !== videoState.videoId) {
          if (videoState.playState === 'playing') {
            playerRef.current.loadVideoById(videoState.videoId);
          } else {
            playerRef.current.cueVideoById(videoState.videoId);
          }
        }
      }

      const playerTime = playerRef.current.getCurrentTime();
      let didSeek = false;
      if (Math.abs(playerTime - videoState.currentTime) > 2) {
        playerRef.current.seekTo(videoState.currentTime, true);
        didSeek = true;
      }

      if (videoState.playState === 'playing' && currentPlayerState !== window.YT?.PlayerState?.PLAYING) {
        playerRef.current.playVideo();
      } else if (videoState.playState === 'paused') {
        if (currentPlayerState === window.YT?.PlayerState?.PLAYING || currentPlayerState === window.YT?.PlayerState?.BUFFERING || didSeek) {
          playerRef.current.pauseVideo();
        }
      }
    }
  }, [videoState.playState, videoState.currentTime, videoState.videoId]);

  const canControl = currentUser?.role === 'Host' || currentUser?.role === 'Moderator';

  // Poll the player so the seek bar follows playback (everyone sees progress)
  useEffect(() => {
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!isReady.current || !player?.getCurrentTime || isDragging.current) return;
      setPosition(player.getCurrentTime() || 0);
      setDuration(player.getDuration?.() || 0);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const commitSeek = () => {
    isDragging.current = false;
    socket.emit('seek', { time: position });
  };

  const formatTime = (t: number) => {
    const total = Math.max(0, Math.floor(t));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  return (
    <div className="player-card">
      <div style={{ pointerEvents: canControl ? 'auto' : 'none' }}>
        <div id="youtube-player"></div>
      </div>
      <div className="seek-bar" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px' }}>
        <span style={{ fontSize: '12px', minWidth: '40px', color: '#e2e8f0' }}>{formatTime(position)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(position, duration || 0)}
          disabled={!canControl || !duration}
          onChange={(e) => {
            isDragging.current = true;
            setPosition(Number(e.target.value));
          }}
          onPointerUp={commitSeek}
          onKeyUp={commitSeek}
          style={{ flex: 1 }}
          aria-label="Seek"
          title={canControl ? 'Drag to seek for everyone' : 'Only Host/Moderator can seek'}
        />
        <span style={{ fontSize: '12px', minWidth: '40px', color: '#e2e8f0' }}>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default YouTubePlayer;
