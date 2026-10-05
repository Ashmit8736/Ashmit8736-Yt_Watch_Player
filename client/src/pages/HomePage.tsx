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

  const [roomId, setRoomId] = useState('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActiveRooms = async () => {
      try {
        const res = await api.get('/api/rooms/active');
        const data = res.data;
        setActiveRooms(data.rooms || []);
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

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    navigate('/room/new');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !roomId.trim()) return;
    navigate(`/room/${roomId.trim()}`);
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">YouTube Watch Party</h1>
        <p className="home-subtitle">
          Watch videos synchronized in real-time with friends
        </p>

        {/* Live rooms */}
        {activeRooms.length > 0 && (
          <div className="active-party-banner">
            <div className="active-party-header">
              <span className="active-party-badge">🟢 Live Watch Parties ({activeRooms.length})</span>
            </div>
            {activeRooms.map((room) => (
              <div key={room.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: '#2c3e50' }}>
                  <code>{room.id}</code> · hosted by <strong>@{room.hostUsername}</strong> · {room.participantCount} watching
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={!user}
                  onClick={() => navigate(`/room/${room.id}`)}
                  style={{ padding: '4px 12px', fontSize: '13px' }}
                >
                  Join
                </button>
              </div>
            ))}
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
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={!user}>
            {user ? 'Create Watch Party' : 'Log in to create a party'}
          </button>
        </form>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />

        {/* Join Room Section */}
        <form onSubmit={handleJoinRoom}>
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Join an Existing Room</h3>
          <input 
            type="text" 
            placeholder="Room ID" 
            className="input-field"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={!user || !roomId.trim()}>
            {user ? 'Join Watch Party' : 'Log in to join a party'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;
