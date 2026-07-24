import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(String(dateStr).replace(' ', 'T') + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z'));
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notifIcon(type) {
  switch (type) {
    case 'payment_approved':
      return { color: '#16a34a', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> };
    case 'payment_rejected':
      return { color: '#dc2626', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> };
    case 'payment_submitted':
      return { color: '#d97706', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> };
    case 'payment_updated':
      return { color: '#2563eb', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><polyline points="4 4 4 9 9 9"/></svg> };
    case 'deletion_requested':
      return { color: '#d97706', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> };
    case 'deletion_cancelled':
      return { color: '#6b7280', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> };
    case 'deletion_approved':
      return { color: '#16a34a', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> };
    default:
      return { color: '#6b7280', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> };
  }
}

export default function Notifications({ onCountChange }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchNotifications = async (p = 1) => {
    try {
      const data = await api.getNotifications({ page: p, limit });
      setNotifications(data.notifications);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onCountChange?.(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
      setNotifications(updated);
      onCountChange?.(updated.filter(n => !n.is_read).length);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      onCountChange?.(updated.filter(n => !n.is_read).length);
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClick = async (notif) => {
    if (!notif.is_read) await handleMarkRead(notif.id);
    if (notif.order_id) {
      const orderDate = notif.message.match(/Order:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      if (orderDate) {
        navigate(`/orders?date=${orderDate}`);
      } else {
        navigate('/orders');
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button className="btn btn-primary btn-sm" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <p style={{ color: '#9ca3af' }}>No notifications yet</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {notifications.map((notif) => {
            const icon = notifIcon(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderBottom: '1px solid #f3f4f6',
                  background: notif.is_read ? 'transparent' : '#eff6ff',
                  cursor: notif.order_id ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (notif.is_read) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = notif.is_read ? 'transparent' : '#eff6ff'; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `${icon.color}15`, color: icon.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {icon.svg}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: notif.is_read ? 400 : 600, fontSize: '0.9rem' }}>{notif.title}</span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(notif.created_at)}</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'pre-line' }}>{notif.message}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', padding: '0.25rem', flexShrink: 0,
                  }}
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          {page > 1 && (
            <button className="btn btn-ghost btn-sm" onClick={() => fetchNotifications(page - 1)}>Previous</button>
          )}
          <span style={{ fontSize: '0.85rem', color: '#6b7280', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <button className="btn btn-ghost btn-sm" onClick={() => fetchNotifications(page + 1)}>Next</button>
          )}
        </div>
      )}
    </div>
  );
}
