import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import '../styles/home.css';

interface ActiveRoom {
  id: string;
  hostUsername: string;
  participantCount: number;
}

const HomePage: React.FC = () => {
  const { user, login, register, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [createUsername, setCreateUsername] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [activeRoomMessage, setActiveRoomMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setCreateUsername(user.username);
      setJoinUsername(user.username);
    }
  }, [user]);

  useEffect(() => {
    const fetchActiveRooms = async () => {
      try {
        const res = await api.get('/api/rooms/active');
        const data = res.data;
        if (data.rooms && data.rooms.length > 0) {
          setActiveRooms(data.rooms);
          const latest = data.rooms[data.rooms.length - 1];
          setRoomId(latest.id);
        } else {
          setActiveRooms([]);
        }
      } catch (err) {
        console.error('Error fetching active rooms:', err);
      }
    };

    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const autoRoom = searchParams.get('autoRoom');
    if (autoRoom) {
      setRoomId(autoRoom);
    }
  }, [searchParams]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        await login(authUsername, authPassword);
      } else {
        await register(authUsername, authPassword, authName);
      }
      setAuthName('');
      setAuthUsername('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const checkUserExists = async (uname: string): Promise<boolean> => {
    try {
      const res = await api.get(`/api/auth/check/${encodeURIComponent(uname)}`);
      return !!res.data.exists;
    } catch {
      return false;
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = user ? user.username : createUsername.trim();
    if (!uname) return alert('Please enter a username or log in');

    // If user is not logged in, check if this username is registered
    if (!user) {
      const exists = await checkUserExists(uname);
      if (!exists) {
        setAuthMode('register');
        setAuthUsername(uname);
        setAuthError(`⚠️ Invalid username: '@${uname}' is not registered. Please register below first!`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return alert(`Invalid username: '@${uname}' is not registered.\n\nPlease register below to get Watch Party access!`);
      }
    }

    if (activeRooms.length > 0) {
      const existing = activeRooms[activeRooms.length - 1];
      if (existing.hostUsername !== uname) {
        setRoomId(existing.id);
        setActiveRoomMessage(
          `⚠️ Room already reserved by host (@${existing.hostUsername})! Room ID "${existing.id}" has been auto-filled. Please join the existing room.`
        );
        return;
      }
    }

    navigate(`/room/new?username=${encodeURIComponent(uname)}`);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = user ? user.username : joinUsername.trim();
    if (!uname || !roomId.trim()) return alert('Please enter username and Room ID');

    // If user is not logged in, check if this username is registered
    if (!user) {
      const exists = await checkUserExists(uname);
      if (!exists) {
        setAuthMode('register');
        setAuthUsername(uname);
        setAuthError(`⚠️ Invalid username: '@${uname}' is not registered. Please register below first!`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return alert(`Invalid username: '@${uname}' is not registered.\n\nPlease register below to get Watch Party access!`);
      }
    }

    navigate(`/room/${roomId.trim()}?username=${encodeURIComponent(uname)}`);
  };

  const handleQuickJoinActive = (activeId: string) => {
    setRoomId(activeId);
    const uname = user ? user.username : joinUsername.trim();
    if (uname) {
      navigate(`/room/${activeId}?username=${encodeURIComponent(uname)}`);
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">YouTube Watch Party</h1>
        <p className="home-subtitle">
          Watch videos synchronized in real-time with friends
        </p>

        {/* Active Room Notification Banner */}
        {activeRooms.length > 0 && (
          <div className="active-party-banner">
            <div className="active-party-header">
              <span className="active-party-badge">
                🟢 Active Watch Party Found!
              </span>
              <span className="active-party-count">
                {activeRooms[activeRooms.length - 1].participantCount} watching
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#2c3e50' }}>
              Hosted by: <strong>@{activeRooms[activeRooms.length - 1].hostUsername}</strong> (Room ID: <code>{activeRooms[activeRooms.length - 1].id}</code>)
            </div>
            <button
              type="button"
              onClick={() => handleQuickJoinActive(activeRooms[activeRooms.length - 1].id)}
              className="btn"
              style={{ padding: '6px 14px', fontSize: '13px', alignSelf: 'flex-start', marginTop: '4px' }}
            >
              Auto-Fill & Join This Room
            </button>
          </div>
        )}

        {/* Warning Message if Host already created room */}
        {activeRoomMessage && (
          <div className="auth-error-msg" style={{ marginBottom: '18px' }}>
            {activeRoomMessage}
          </div>
        )}

        {/* Authentication Section */}
        <div className="auth-box">
          {user ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#7f8fa6' }}>Signed in as:</span>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2f3640' }}>
                  {user.name && user.name !== user.username ? `${user.name} (@${user.username})` : user.username}
                </div>
              </div>
              <button 
                onClick={logout} 
                className="btn danger" 
                style={{ padding: '6px 14px', fontSize: '13px' }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <div>
              <div className="auth-tabs">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                  className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                >
                  Register
                </button>
              </div>

              {authError && (
                <div className="auth-error-msg">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="input-field"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                )}
                <input
                  type="text"
                  placeholder="Username"
                  className="input-field"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    className="input-field"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    style={{ marginBottom: 0, paddingRight: '70px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button
                  type="submit"
                  className="btn"
                  disabled={authLoading}
                  style={{ width: '100%', marginTop: '12px', padding: '10px' }}
                >
                  {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Create Room Section */}
        <form onSubmit={handleCreateRoom} style={{ marginBottom: '25px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Create a New Room</h3>
          {!user && (
            <input 
              type="text" 
              placeholder="Your Username" 
              className="input-field"
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
            />
          )}
          <button type="submit" className="btn" style={{ width: '100%' }}>Create Watch Party</button>
        </form>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />

        {/* Join Room Section */}
        <form onSubmit={handleJoinRoom}>
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Join an Existing Room</h3>
          {!user && (
            <input 
              type="text" 
              placeholder="Your Username" 
              className="input-field"
              value={joinUsername}
              onChange={(e) => setJoinUsername(e.target.value)}
            />
          )}
          <input 
            type="text" 
            placeholder="Room ID" 
            className="input-field"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button type="submit" className="btn" style={{ width: '100%' }}>Join Watch Party</button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;
