import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Bell } from 'lucide-react';
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
  const [previewOpen, setPreviewOpen] = useState(false);

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
    <>
      <div style={{ maxWidth: '400px', margin: '2rem auto' }} className="animate-fade-in-up">
        <div className="page-header">
          <h1>Settings</h1>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div className="avatar-upload" onClick={handleAvatarClick}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name} className="avatar" style={{ width: 64, height: 64 }} />
            ) : (
              <div className="avatar avatar-initials" style={{ width: 64, height: 64, fontSize: '1.3rem' }}>
                {getInitials(user.name)}
              </div>
            )}
            <div className="settings-avatar-hover">
              <Camera size={20} />
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Click avatar to change
              {avatarUrl && (
                <span> · <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>Preview</button></span>
              )}
            </div>
          </div>
        </div>

        {cropSrc && <CropModal imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Bell size={20} stroke="#6b7280" />
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

      {previewOpen && avatarUrl && (
        <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '0.5rem' }}>
            <img src={avatarUrl} alt={user.name} style={{ width: '100%', borderRadius: '8px' }} />
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
