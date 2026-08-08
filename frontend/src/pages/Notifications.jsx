import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, Trash2, Bell, RefreshCw, Check, X } from 'lucide-react';
import { api } from '../api/client';

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(String(dateStr).replace(' ', 'T') + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z'));
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = then.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const mm = String(then.getMinutes()).padStart(2, '0');
  return `${months[then.getMonth()]} ${then.getDate()}, ${then.getFullYear()} ${h12}:${mm} ${ampm}`;
}

function notifIcon(type) {
  switch (type) {
    case 'payment_approved':
      return { color: '#16a34a', icon: <CheckCircle size={18} /> };
    case 'payment_rejected':
      return { color: '#dc2626', icon: <XCircle size={18} /> };
    case 'payment_submitted':
      return { color: '#d97706', icon: <AlertCircle size={18} /> };
    case 'payment_updated':
      return { color: '#2563eb', icon: <RefreshCw size={18} /> };
    case 'deletion_requested':
      return { color: '#d97706', icon: <Trash2 size={18} /> };
    case 'deletion_cancelled':
      return { color: '#6b7280', icon: <XCircle size={18} /> };
    case 'deletion_approved':
      return { color: '#16a34a', icon: <CheckCircle size={18} /> };
    default:
      return { color: '#6b7280', icon: <Bell size={18} /> };
  }
}

export default function Notifications({ onCountChange }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

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
    <div className="animate-fade-in-up">
      <div className="page-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button className="btn btn-primary btn-sm" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Bell size={48} stroke="#d1d5db" strokeWidth={1.5} style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>No notifications yet</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {notifications.map((notif) => {
            const icon = notifIcon(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={notif.is_read ? '' : 'notif-unread'}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: notif.order_id ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (notif.is_read) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = notif.is_read ? 'transparent' : 'var(--notif-unread-bg, #eff6ff)'; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `${icon.color}15`, color: icon.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {notifIcon(notif.type).icon}
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
                  title="Delete notification"
                >
                  <X size={14} />
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
