import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getImageUrl } from '../api/client';
import PersonForm from '../components/PersonForm';
import CropModal from '../components/CropModal';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';
}

function PersonAvatar({ src, name, personId, canEdit, onUploaded }) {
  const fileRef = useRef(null);
  const [cropSrc, setCropSrc] = useState(null);

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
      const result = await api.uploadAvatar(personId, croppedFile);
      onUploaded(personId, result.profile_image);
    } catch (err) {
      alert(err.message);
    }
    setCropSrc(null);
  };

  const avatar = src ? (
    <img src={src} alt={name} className="avatar" style={{ width: 36, height: 36 }} />
  ) : (
    <div className="avatar avatar-initials" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
      {getInitials(name)}
    </div>
  );

  if (!canEdit) return avatar;

  return (
    <>
      <div className="avatar-upload" onClick={() => fileRef.current?.click()}>
        {avatar}
        <div className="settings-avatar-hover">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
      </div>
      {cropSrc && <CropModal imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}
    </>
  );
}

export default function Persons({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [persons, setPersons] = useState([]);
  const [editingPerson, setEditingPerson] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [previewSrc, setPreviewSrc] = useState(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const fetchPersons = async () => {
    setLoading(true);
    try {
      const data = await api.getPersons();
      setPersons(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const handleAvatarUploaded = (personId, filename) => {
    setPersons(prev => prev.map(p => p.id === personId ? { ...p, profile_image: filename } : p));
    if (onUserUpdate && personId === user.id) {
      const updated = { ...user, profile_image: filename };
      onUserUpdate(updated);
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updated));
    }
  };

  const handleCreate = async (data) => {
    try {
      await api.createPerson(data);
      setShowForm(false);
      fetchPersons();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.updatePerson(editingPerson.id, data);
      setEditingPerson(null);
      setShowForm(false);
      fetchPersons();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this person? Their orders will also be deleted.')) return;
    try {
      await api.deletePerson(id);
      fetchPersons();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!newPwd || newPwd.length < 6) {
      setPwdError('Password must be at least 6 characters');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Passwords do not match');
      return;
    }

    setPwdLoading(true);
    try {
      await api.resetPassword(resetModal.id, newPwd);
      setPwdSuccess('Password updated successfully');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => { setResetModal(null); setPwdSuccess(''); }, 1500);
    } catch (err) {
      setPwdError(err.message);
    }
    setPwdLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Persons</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditingPerson(null); }}>
            {showForm ? 'Close' : '+ Add Person'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <PersonForm
            onSubmit={editingPerson ? handleUpdate : handleCreate}
            initialData={editingPerson || {}}
            onCancel={() => { setShowForm(false); setEditingPerson(null); }}
          />
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : persons.length === 0 ? (
          <div className="empty-state">No persons added yet</div>
        ) : (
          <>
          {/* Desktop grid */}
          <div className="table-wrapper">
          <div className="persons-grid">
            {persons.map((p) => (
              <div className="person-card card" key={p.id}>
                <div className="person-card-avatar">
                  <PersonAvatar
                    src={getImageUrl(p.profile_image)}
                    name={p.name}
                    personId={p.id}
                    canEdit={isAdmin || p.id === user.id}
                    onUploaded={handleAvatarUploaded}
                  />
                </div>
                <div className="person-card-info">
                  <div className="person-card-name" onClick={() => navigate(`/person-orders?person_id=${p.id}`)}>
                    {p.name}
                  </div>
                  <span className="badge" style={{ background: p.role === 'admin' ? '#d97706' : '#6b7280', color: '#fff', fontSize: '0.65rem', alignSelf: 'flex-start' }}>
                    {p.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                  <div className="person-card-sub">
                    <span style={{ color: '#6b7280' }}>
                      {p.profile_image ? 'Click avatar to preview' : 'No profile photo'}
                    </span>
                    {p.profile_image && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewSrc(getImageUrl(p.profile_image)); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>Preview</button>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="person-card-actions">
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setEditingPerson(p); setShowForm(true); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Reset Password" onClick={() => { setResetModal(p); setNewPwd(''); setConfirmPwd(''); setPwdError(''); setPwdSuccess(''); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-danger" title="Delete" onClick={() => handleDelete(p.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Mobile cards */}
          <div className="mobile-cards">
            {persons.map((p) => (
              <div className="order-card" key={p.id}>
                <div className="order-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PersonAvatar
                      src={getImageUrl(p.profile_image)}
                      name={p.name}
                      personId={p.id}
                      canEdit={isAdmin || p.id === user.id}
                      onUploaded={handleAvatarUploaded}
                    />
                    <span
                      className="order-date"
                      onClick={() => navigate(`/person-orders?person_id=${p.id}`)}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <span className="badge" style={{ background: p.role === 'admin' ? '#d97706' : '#6b7280', color: '#fff' }}>
                    {p.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="order-card-actions">
                    <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setEditingPerson(p); setShowForm(true); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Reset Password" onClick={() => { setResetModal(p); setNewPwd(''); setConfirmPwd(''); setPwdError(''); setPwdSuccess(''); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </button>
                    <button className="btn btn-ghost btn-sm btn-danger" title="Delete" onClick={() => handleDelete(p.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {resetModal && (
        <div className="modal-overlay" onClick={() => setResetModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password for {resetModal.name}</h3>
            <form onSubmit={handleResetPassword}>
              {pwdError && <div className="alert alert-error">{pwdError}</div>}
              {pwdSuccess && <div className="alert alert-success">{pwdSuccess}</div>}
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Enter new password"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setResetModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={pwdLoading}>
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewSrc && (
        <div className="modal-overlay" onClick={() => setPreviewSrc(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '0.5rem' }}>
            <img src={previewSrc} alt="Preview" style={{ width: '100%', borderRadius: '8px' }} />
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewSrc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
