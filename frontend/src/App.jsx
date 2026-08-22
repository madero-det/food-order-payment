import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
          <h3>Something went wrong</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', wordBreak: 'break-all' }}>{this.state.error.message}</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Bell, Settings as SettingsIcon, LogOut,
  Sun, Moon, Menu, X
} from 'lucide-react';
import Login, { loadAuth, clearAuth } from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyOrders from './pages/DailyOrders';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import MenuPage from './pages/MenuPage';
import { ToastProvider, useToast } from './components/Toast';
import { api, getImageUrl } from './api/client';
import useSSE from './hooks/useSSE';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';
}

function NavbarAvatar({ user }) {
  const avatarUrl = getImageUrl(user.profile_image);

  return (
    <div className="nav-avatar-wrap">
      {avatarUrl ? (
        <img src={avatarUrl} alt={user.name} className="avatar" style={{ width: 30, height: 30 }} />
      ) : (
        <div className="avatar avatar-initials" style={{ width: 30, height: 30, fontSize: '0.7rem' }}>
          {getInitials(user.name)}
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const addToast = useToast();

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === 'NAVIGATE' && e.data.url) {
        if (window.location.hash) {
          window.location.hash = `#${e.data.url}`;
        } else {
          window.location.href = window.location.origin + e.data.url;
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  const notify = (title, body, tag, url) => {
    if (localStorage.getItem('notificationsEnabled') === 'false') return;
    if (Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: '/app_icon.png',
        badge: '/app_icon.png',
        tag: tag || 'food-order-notification',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: url || '/' },
      });
    }).catch(() => {});
  };

  const refreshUnread = () => {
    api.getUnreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
  };

  const formatDate = (d) => d ? String(d).substring(0, 10) : '-';
  const formatDateTime = (dt) => {
    if (!dt) return '-';
    const s = String(dt).replace(' ', 'T');
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return String(dt);
    const h = Number(m[4]);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${m[1]}-${m[2]}-${m[3]} ${h % 12 || 12}:${m[5]} ${ampm}`;
  };

  useSSE((event, data) => {
    if (!user) return;
    if (event === 'notification_read') {
      refreshUnread();
      return;
    }
    const uid = Number(user.pid || user.id);
    const pid = Number(data.person_id);
    if (event === 'payment_approved') {
      if (pid === uid) {
        const msg = `Your payment for ${Number(data.price).toLocaleString()} R has been approved!\nOrder: ${formatDate(data.order_date)}\nTxn: ${formatDateTime(data.transaction_date)}`;
        addToast(msg, 'success');
        notify('Payment Approved', msg, `payment-${data.id}`, `/orders?date=${formatDate(data.order_date)}`);
        refreshUnread();
      }
    } else if (event === 'payment_rejected' && pid === uid) {
      const msg = `Your payment for ${Number(data.price).toLocaleString()} R has been rejected.\nOrder: ${formatDate(data.order_date)}\nTxn: ${formatDateTime(data.transaction_date)}`;
        addToast(msg, 'error');
        notify('Payment Rejected', msg, `payment-${data.id}`, `/orders?date=${formatDate(data.order_date)}`);
        refreshUnread();
    } else if (event === 'deletion_cancelled' && pid === uid) {
      const msg = `Your delete request for order #${data.id} (${Number(data.price).toLocaleString()} R) has been cancelled.`;
      addToast(msg, 'error');
      notify('Delete Request Cancelled', msg, `deletion-${data.id}`, `/orders?date=${formatDate(data.order_date)}`);
      refreshUnread();
    } else if (event === 'deletion_approved' && pid === uid) {
      const msg = `Your delete request for order #${data.id} (${Number(data.price).toLocaleString()} R) has been approved.`;
      addToast(msg, 'success');
      notify('Delete Request Approved', msg, `deletion-${data.id}`, `/orders?date=${formatDate(data.order_date)}`);
      refreshUnread();
    }
  });

  useEffect(() => {
    const saved = loadAuth();
    if (saved) {
      setUser(saved.user);
    }
  }, []);

  useEffect(() => {
    if (user) refreshUnread();
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
      <div className="app">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <nav className="navbar" role="navigation" aria-label="Main navigation">
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className={`nav-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className={`nav-links${menuOpen ? ' open' : ''}`} role="menu">
            <div className="nav-brand">Food Order Payment</div>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)} role="menuitem">
              <LayoutDashboard size={18} /> <span className="nav-link-text">Dashboard</span>
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)} role="menuitem">
              <ShoppingCart size={18} /> <span className="nav-link-text">Orders</span>
            </NavLink>
          </div>
          <div className="nav-right">
            <NavbarAvatar user={user} />
            <span className="nav-user-text" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
              {user.name} {user.role === 'admin' && <span style={{ background: 'var(--color-warning)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', marginLeft: '0.25rem' }}>Admin</span>}
            </span>
            <NavLink to="/notifications" className="nav-icon-btn has-badge" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="badge-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </NavLink>
            <NavLink to="/settings" className="nav-icon-btn" aria-label="Settings">
              <SettingsIcon size={16} />
              <span className="nav-settings-text">Settings</span>
            </NavLink>
            <button className="nav-icon-btn" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="nav-icon-btn" onClick={handleLogout} aria-label="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </nav>
        <main className="container" id="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<DailyOrders />} />
            <Route path="/person-orders" element={<Navigate to="/" replace />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/notifications" element={<Notifications onCountChange={setUnreadCount} />} />
            <Route path="/settings" element={<Settings onUserUpdate={setUser} />} />
          </Routes>
        </main>
      </div>
      </ErrorBoundary>
    </HashRouter>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
