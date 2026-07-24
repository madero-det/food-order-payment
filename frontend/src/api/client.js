const API_BASE = import.meta.env.VITE_API_URL || '/api';
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_URL || '/uploads';

export { API_BASE, UPLOADS_BASE };
export const getUploadsBase = () => UPLOADS_BASE;

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getCurrentUser: () => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  },

  getOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/orders${qs ? '?' + qs : ''}`);
  },
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  payOrder: (id, data = {}) => request(`/orders/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  approveOrder: (id) => request(`/orders/${id}/approve`, { method: 'POST' }),
  rejectOrder: (id) => request(`/orders/${id}/reject`, { method: 'POST' }),
  approveDeletion: (id) => request(`/orders/${id}/approve-deletion`, { method: 'POST' }),
  cancelDeletion: (id) => request(`/orders/${id}/cancel-deletion`, { method: 'POST' }),

  getPersons: () => request('/persons'),
  createPerson: (data) => request('/persons', { method: 'POST', body: JSON.stringify(data) }),
  updatePerson: (id, data) => request(`/persons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePerson: (id) => request(`/persons/${id}`, { method: 'DELETE' }),

  getDashboard: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/dashboard${qs ? '?' + qs : ''}`);
  },
  getUnpaid: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/dashboard/unpaid${qs ? '?' + qs : ''}`);
  },
  getMonthlyExpense: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/dashboard/monthly${qs ? '?' + qs : ''}`);
  },

  changePassword: (current_password, new_password) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),

  resetPassword: (person_id, new_password) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ person_id, new_password }) }),

  uploadAvatar: async (personId, file) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/persons/${personId}/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notifications${qs ? '?' + qs : ''}`);
  },
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
};
