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
        <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
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
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import Login, { loadAuth, clearAuth } from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyOrders from './pages/DailyOrders';
import Persons from './pages/Persons';
import PersonOrders from './pages/PersonOrders';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
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

  const notify = (title, body, tag) => {
    if (localStorage.getItem('notificationsEnabled') === 'false') return;
    if (Notification.permission !== 'granted') return;
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag });
    } else {
      new Notification(title, { body, icon: '/app_icon.png', tag });
    }
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
    const uid = Number(user.pid || user.id);
    const pid = Number(data.person_id);
    if (event === 'payment_approved') {
      if (pid === uid) {
        const msg = `Your payment for ${Number(data.price).toLocaleString()} R has been approved!\nOrder: ${formatDate(data.order_date)}\nTxn: ${formatDateTime(data.transaction_date)}`;
        addToast(msg, 'success');
        notify('Payment Approved', msg, `payment-${data.id}`);
        refreshUnread();
      } else if (user.role === 'admin' && !data.fromApproval) {
        const msg = `The payment for ${Number(data.price).toLocaleString()} R has been updated!\nName: ${data.person_name}\nOrder: ${formatDate(data.order_date)}\nTxn: ${formatDateTime(data.transaction_date)}`;
        addToast(msg, 'success');
        notify('Payment Updated', msg, `payment-${data.id}`);
        refreshUnread();
      }
    } else if (event === 'payment_rejected' && pid === uid) {
      const msg = `Your payment for ${Number(data.price).toLocaleString()} R has been rejected.\nOrder: ${formatDate(data.order_date)}\nTxn: ${formatDateTime(data.transaction_date)}`;
      addToast(msg, 'error');
      notify('Payment Rejected', msg, `payment-${data.id}`);
      refreshUnread();
    } else if (event === 'payment_submitted') {
      if (user.role === 'admin') {
        const msg = `${data.person_name || 'User'} submitted a payment of ${Number(data.price).toLocaleString()} R for approval.\nOrder: ${formatDate(data.order_date)}\nTxn: ${formatDateTime(data.transaction_date)}`;
        addToast(msg, 'warning');
        notify('Payment Pending Approval', msg, `payment-${data.id}`);
        refreshUnread();
      }
    } else if (event === 'deletion_requested') {
      if (user.role === 'admin') {
        const msg = `${data.person_name || 'User'} requested to delete order #${data.id} (${Number(data.price).toLocaleString()} R).\nOrder: ${formatDate(data.order_date)}`;
        addToast(msg, 'warning');
        notify('Delete Request Pending', msg, `deletion-${data.id}`);
        refreshUnread();
      }
    } else if (event === 'deletion_cancelled' && pid === uid) {
      const msg = `Your delete request for order #${data.id} (${Number(data.price).toLocaleString()} R) has been cancelled.`;
      addToast(msg, 'error');
      notify('Delete Request Cancelled', msg, `deletion-${data.id}`);
      refreshUnread();
    } else if (event === 'deletion_approved' && pid === uid) {
      const msg = `Your delete request for order #${data.id} (${Number(data.price).toLocaleString()} R) has been approved.`;
      addToast(msg, 'success');
      notify('Delete Request Approved', msg, `deletion-${data.id}`);
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
    <HashRouter>
      <ErrorBoundary>
      <div className="app">
        <nav className="navbar">
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
          <div className={`nav-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />
          <div className={`nav-links${menuOpen ? ' open' : ''}`}>
            <div className="nav-brand">Food Order Payment</div>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
            <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>Orders</NavLink>
            <NavLink to="/person-orders" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>{user.role === 'admin' ? 'Person Orders' : 'My Orders'}</NavLink>
            {user.role === 'admin' && (
              <NavLink to="/persons" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>Persons</NavLink>
            )}
          </div>
          <div className="nav-right">
            <NavbarAvatar user={user} />
            <span className="nav-user-text" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
              {user.name} {user.role === 'admin' && <span style={{ background: '#d97706', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '0.25rem' }}>Admin</span>}
            </span>
            <NavLink to="/notifications" className="btn btn-ghost" style={{ color: '#fff', fontSize: '0.85rem', textDecoration: 'none', padding: '0.4rem 0.65rem', borderRadius: '6px', background: 'rgba(255,255,255,0.15)', position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#dc2626', color: '#fff', fontSize: '0.65rem',
                  fontWeight: 700, minWidth: 16, height: 16, lineHeight: '16px',
                  textAlign: 'center', borderRadius: 8, padding: '0 4px',
                }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </NavLink>
            <NavLink to="/settings" className="btn btn-ghost" style={{ color: '#fff', fontSize: '0.85rem', textDecoration: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.15)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="nav-settings-text" style={{ marginLeft: '0.35rem' }}>Settings</span>
            </NavLink>
            <button className="btn btn-ghost" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Light mode' : 'Dark mode'} style={{ color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.15)' }}>
              {darkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button className="btn btn-ghost" onClick={handleLogout} title="Logout" style={{ color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.15)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </nav>
        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<DailyOrders />} />
            <Route path="/persons" element={<Persons user={user} onUserUpdate={setUser} />} />
            <Route path="/person-orders" element={<PersonOrders />} />
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
