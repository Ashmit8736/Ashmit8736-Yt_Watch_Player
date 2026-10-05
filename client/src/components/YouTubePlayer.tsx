import React, { useEffect, useRef } from 'react';
import { useRoomContext } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import '../styles/player.css';

const YouTubePlayer: React.FC = () => {
  const { videoState, currentUser } = useRoomContext();
  const { socket } = useSocket();
  const playerRef = useRef<any>(null);
  const isReady = useRef(false);

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

  return (
    <div 
      className="player-card"
      style={{ pointerEvents: canControl ? 'auto' : 'none' }}
    >
      <div id="youtube-player"></div>
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
