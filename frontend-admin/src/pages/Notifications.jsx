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
    case 'deletion_approved':
      return { color: 'var(--color-success)', bg: 'var(--color-success-light)', icon: <CheckCircle size={18} /> };
    case 'payment_rejected':
      return { color: 'var(--color-danger)', bg: 'var(--color-danger-light)', icon: <XCircle size={18} /> };
    case 'payment_submitted':
    case 'deletion_requested':
      return { color: 'var(--color-warning)', bg: 'var(--color-warning-light)', icon: <AlertCircle size={18} /> };
    case 'payment_updated':
      return { color: 'var(--color-primary)', bg: 'var(--color-primary-soft)', icon: <RefreshCw size={18} /> };
    case 'deletion_cancelled':
      return { color: 'var(--color-text-muted)', bg: 'var(--color-border-light)', icon: <XCircle size={18} /> };
    default:
      return { color: 'var(--color-text-muted)', bg: 'var(--color-border-light)', icon: <Bell size={18} /> };
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
        <div className="card notif-empty">
          <Bell size={48} strokeWidth={1.5} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="card notif-list">
          {notifications.map((notif) => {
            const icon = notifIcon(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`notif-item ${notif.is_read ? '' : 'notif-unread'} ${notif.order_id ? 'clickable' : ''}`}
              >
                <div
                  className="notif-icon-wrap"
                  style={{ background: icon.bg, color: icon.color }}
                >
                  {icon.icon}
                </div>
                <div className="notif-content">
                  <div className="notif-header">
                    <span className="notif-title">{notif.title}</span>
                    <span className="notif-time">{timeAgo(notif.created_at)}</span>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                </div>
                <button
                  className="notif-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
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
        <div className="notif-pagination">
          {page > 1 && (
            <button className="btn btn-ghost btn-sm" onClick={() => fetchNotifications(page - 1)}>Previous</button>
          )}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <button className="btn btn-ghost btn-sm" onClick={() => fetchNotifications(page + 1)}>Next</button>
          )}
        </div>
      )}
    </div>
  );
}
