import { useState } from 'react';
import { API_BASE } from '../api/client';

function saveAuth(token, user, remember, name) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('token', token);
  storage.setItem('user', JSON.stringify(user));
  if (remember) {
    localStorage.setItem('savedName', name);
  }
}

function loadAuth() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const user = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (token && user) return { token, user: JSON.parse(user) };
  return null;
}

function getSavedName() {
  return localStorage.getItem('savedName') || '';
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

export { saveAuth, loadAuth, clearAuth, getSavedName };

export default function Login({ onLogin }) {
  const [name, setName] = useState(() => getSavedName());
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem('savedName'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      saveAuth(data.token, data.user, remember, name.trim());
      onLogin(data.user);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach server. Check network connection.' : err.message || 'Connection error');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', position: 'relative', backgroundImage: 'url(/bg_login.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card login-card">
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.3rem' }}>Food Order Payment</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Sign in to continue</p>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.6rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Remember me
          </label>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
