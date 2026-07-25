import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getImageUrl } from '../api/client';
import CropModal from '../components/CropModal';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';
}

export default function Settings({ onUserUpdate }) {
  const navigate = useNavigate();
  const user = api.getCurrentUser();
  const fileRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [notifPermission, setNotifPermission] = useState(() => {
    const stored = localStorage.getItem('notificationsEnabled');
    if (stored !== null) return stored === 'true' ? 'granted' : 'denied';
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleAvatarClick = () => fileRef.current?.click();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCrop = async (croppedFile) => {
    try {
      const result = await api.uploadAvatar(user.id, croppedFile);
      const updated = { ...user, profile_image: result.profile_image };
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updated));
      if (onUserUpdate) onUserUpdate(updated);
    } catch (err) {
      alert(err.message);
    }
    setCropSrc(null);
  };

  const handleNotifToggle = async () => {
    if (notifPermission === 'granted') {
      setNotifPermission('denied');
      localStorage.setItem('notificationsEnabled', 'false');
      return;
    }
    if (typeof Notification === 'undefined') {
      alert('Notifications are not supported in this browser');
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    localStorage.setItem('notificationsEnabled', result === 'granted' ? 'true' : 'false');
  };

  const avatarUrl = getImageUrl(user?.profile_image);

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="avatar-upload" onClick={handleAvatarClick}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={user.name} className="avatar" style={{ width: 80, height: 80 }} />
          ) : (
            <div className="avatar avatar-initials" style={{ width: 80, height: 80, fontSize: '1.5rem' }}>
              {getInitials(user.name)}
            </div>
          )}
          <div className="settings-avatar-hover">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
          Click to change profile picture
        </p>
      </div>

      {cropSrc && <CropModal imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Push Notifications</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Get notified when payments are approved/rejected</div>
            </div>
          </div>
          <button
            className={`btn btn-sm ${notifPermission === 'granted' ? 'btn-success' : 'btn-ghost'}`}
            onClick={handleNotifToggle}
            style={{ minWidth: '80px' }}
          >
            {notifPermission === 'granted' ? 'On' : 'Enable'}
          </button>
        </div>
        {notifPermission === 'denied' && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#dc2626' }}>
            Notifications blocked. Enable in browser settings.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Telegram Connection</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Receive payment notifications directly on Telegram</div>
            </div>
          </div>
          <span style={{ flexShrink: 0 }}>
            {user?.telegram_connected ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            )}
          </span>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
          Send <strong>/start</strong> to{' '}
          <a href="https://t.me/food_order_pay_bot" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>@food_order_pay_bot</a>
          {' '}on Telegram to connect.
        </p>
        {user?.telegram_connected && (
          <button
            className="btn btn-ghost btn-sm btn-danger"
            style={{ marginTop: '0.5rem' }}
            onClick={async () => {
              try {
                await api.disconnectTelegram(user.id);
                const updated = { ...user, telegram_connected: false };
                if (onUserUpdate) onUserUpdate(updated);
                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
                storage.setItem('user', JSON.stringify(updated));
              } catch (err) {
                alert(err.message);
              }
            }}
          >Disconnect</button>
        )}
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
