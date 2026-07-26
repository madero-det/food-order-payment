import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import DateSelector from '../components/DateSelector';
import OrderTable from '../components/OrderTable';
import OrderForm from '../components/OrderForm';
import useSSE from '../hooks/useSSE';

export default function DailyOrders() {
  const user = api.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const initialDate = searchParams.get('date') || todayStr;
  const [date, setDate] = useState(initialDate);
  const [orders, setOrders] = useState([]);
  const [persons, setPersons] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState({ show: false, orderId: null, datetime: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, orderId: null });
  const [approveDeletionModal, setApproveDeletionModal] = useState({ show: false, orderId: null });
  const [cancelDeletionModal, setCancelDeletionModal] = useState({ show: false, orderId: null });
  const [rejectModal, setRejectModal] = useState({ show: false, orderId: null });
  const [approveModal, setApproveModal] = useState({ show: false, orderId: null });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getOrders({ date });
      setOrders(data.orders || data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [date]);

  const fetchPersons = async () => {
    try {
      const data = await api.getPersons();
      setPersons(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchPersons();
    api.getMenuItems().then(setMenuItems).catch(() => {});
  }, []);

  useSSE((event, data) => {
    const uid = user?.pid || user?.id;
    const belongsToUser = isAdmin || Number(data.person_id) === Number(uid);
    if (event === 'order_created') {
      if (data.order_date === date && data.triggeredBy !== uid && belongsToUser) {
        setOrders(prev => [...prev, {
          id: data.id,
          order_date: data.order_date,
          price: Number(data.price),
          paid_amount: data.paid_amount != null ? Number(data.paid_amount) : null,
          transaction_date: data.transaction_date,
          payment_status: data.payment_status,
          deletion_status: data.deletion_status,
          person_id: data.person_id,
          person_name: data.person_name,
          person_avatar: data.person_avatar || null,
          notes: data.notes || null,
          payment_method: data.payment_method || null,
          items: data.items || [],
        }]);
      }
    } else if (event === 'order_updated') {
      if (data.triggeredBy !== uid && belongsToUser) {
        setOrders(prev => prev.map(o => o.id === data.id ? {
          ...o,
          price: Number(data.price ?? o.price),
          paid_amount: data.paid_amount !== undefined ? (data.paid_amount != null ? Number(data.paid_amount) : null) : o.paid_amount,
          transaction_date: data.transaction_date !== undefined ? data.transaction_date : o.transaction_date,
          payment_status: data.payment_status !== undefined ? data.payment_status : o.payment_status,
          deletion_status: data.deletion_status !== undefined ? data.deletion_status : o.deletion_status,
          person_id: data.person_id ?? o.person_id,
          person_name: data.person_name ?? o.person_name,
          notes: data.notes !== undefined ? data.notes : o.notes,
          payment_method: data.payment_method !== undefined ? data.payment_method : o.payment_method,
          items: data.items !== undefined ? data.items : o.items,
        } : o));
      }
    } else if (event === 'order_deleted') {
      if (data.triggeredBy !== uid && belongsToUser) {
        setOrders(prev => prev.filter(o => o.id !== data.id));
      }
    } else if (event === 'payment_submitted' || event === 'payment_approved' || event === 'payment_rejected') {
      if (data.triggeredBy !== uid && belongsToUser) {
        setOrders(prev => prev.map(o => o.id === data.id ? {
          ...o,
          paid_amount: data.paid_amount != null ? Number(data.paid_amount) : null,
          transaction_date: data.transaction_date,
          payment_status: data.payment_status,
        } : o));
      }
    } else if (event === 'deletion_requested' || event === 'deletion_cancelled') {
      if (belongsToUser) {
        setOrders(prev => prev.map(o => o.id === data.id ? {
          ...o,
          deletion_status: data.deletion_status,
        } : o));
      }
    } else if (event === 'deletion_approved') {
      if (data.triggeredBy !== uid && belongsToUser) {
        setOrders(prev => prev.filter(o => o.id !== data.id));
      }
    }
  });

  const handleCreate = async (data) => {
    try {
      const result = await api.createOrder(data);
      setShowForm(false);
      if (result.order_date === date) {
        setOrders(prev => [...prev, {
          id: result.id,
          order_date: result.order_date,
          price: Number(result.price),
          paid_amount: result.paid_amount != null ? Number(result.paid_amount) : null,
          transaction_date: result.transaction_date,
          payment_status: result.payment_status,
          deletion_status: result.deletion_status,
          person_id: result.person_id,
          person_name: result.person_name,
          person_avatar: result.person_avatar || null,
          notes: result.notes || null,
          payment_method: result.payment_method || null,
          items: result.items || [],
        }]);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async (data) => {
    try {
      const result = await api.updateOrder(editingOrder.id, data);
      setEditingOrder(null);
      setShowForm(false);
      setOrders(prev => prev.map(o => o.id === result.id ? {
        ...o,
        price: Number(result.price ?? o.price),
        paid_amount: result.paid_amount !== undefined ? (result.paid_amount != null ? Number(result.paid_amount) : null) : o.paid_amount,
        transaction_date: result.transaction_date !== undefined ? result.transaction_date : o.transaction_date,
        payment_status: result.payment_status !== undefined ? result.payment_status : o.payment_status,
        deletion_status: result.deletion_status !== undefined ? result.deletion_status : o.deletion_status,
          person_id: result.person_id ?? o.person_id,
          person_name: result.person_name ?? o.person_name,
          notes: result.notes !== undefined ? result.notes : o.notes,
          payment_method: result.payment_method !== undefined ? result.payment_method : o.payment_method,
          items: result.items !== undefined ? result.items : o.items,
        } : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const openPayModal = (id) => {
    const now = new Date();
    const dt = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + 'T' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
    setPayModal({ show: true, orderId: id, datetime: dt });
  };

  const confirmPay = async () => {
    try {
      const result = await api.payOrder(payModal.orderId, { transaction_date: payModal.datetime });
      setPayModal({ show: false, orderId: null, datetime: '' });
      setOrders(prev => prev.map(o => o.id === result.id ? {
        ...o,
        paid_amount: result.paid_amount != null ? Number(result.paid_amount) : null,
        transaction_date: result.transaction_date,
        payment_status: result.payment_status,
      } : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    setDeleteModal({ show: true, orderId: id });
  };

  const confirmDelete = async () => {
    try {
      const result = await api.deleteOrder(deleteModal.orderId);
      setDeleteModal({ show: false, orderId: null });
      if (isAdmin || result.deletion_status !== 'pending') {
        setOrders(prev => prev.filter(o => o.id !== deleteModal.orderId));
      } else {
        setOrders(prev => prev.map(o => o.id === deleteModal.orderId ? {
          ...o,
          deletion_status: 'pending',
        } : o));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApprove = async (id) => {
    setApproveModal({ show: true, orderId: id });
  };

  const confirmApprove = async () => {
    try {
      const result = await api.approveOrder(approveModal.orderId);
      setApproveModal({ show: false, orderId: null });
      setOrders(prev => prev.map(o => o.id === result.id ? {
        ...o,
        payment_status: 'approved',
      } : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    setRejectModal({ show: true, orderId: id });
  };

  const confirmReject = async () => {
    try {
      await api.rejectOrder(rejectModal.orderId);
      setRejectModal({ show: false, orderId: null });
      setOrders(prev => prev.map(o => o.id === rejectModal.orderId ? {
        ...o,
        paid_amount: null,
        transaction_date: null,
        payment_status: 'rejected',
      } : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApproveDeletion = async (id) => {
    setApproveDeletionModal({ show: true, orderId: id });
  };

  const confirmApproveDeletion = async () => {
    try {
      await api.approveDeletion(approveDeletionModal.orderId);
      setApproveDeletionModal({ show: false, orderId: null });
      setOrders(prev => prev.filter(o => o.id !== approveDeletionModal.orderId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelDeletion = async (id) => {
    setCancelDeletionModal({ show: true, orderId: id });
  };

  const confirmCancelDeletion = async () => {
    try {
      await api.cancelDeletion(cancelDeletionModal.orderId);
      setCancelDeletionModal({ show: false, orderId: null });
      setOrders(prev => prev.map(o => o.id === cancelDeletionModal.orderId ? {
        ...o,
        deletion_status: null,
      } : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    setSearchParams({ date: newDate });
  };

  const totalPrice = orders.reduce((sum, o) => sum + Number(o.price), 0);
  const totalPaid = orders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Daily Orders</h1>
        <DateSelector date={date} onChange={handleDateChange} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="daily-summary">
            <div>Orders: <span>{orders.length}</span></div>
            <div>Total: <span>{totalPrice.toLocaleString()} R</span></div>
            <div>Paid: <span>{totalPaid.toLocaleString()} R</span></div>
            <div>Unpaid: <span style={{ color: '#dc2626' }}>{(totalPrice - totalPaid).toLocaleString()} R</span></div>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditingOrder(null); }}>
            {showForm ? 'Close' : '+ New Order'}
          </button>
        </div>

        {showForm && (
          <div className="order-form-area">
            <OrderForm
              persons={persons}
              menuItems={menuItems}
              onSubmit={editingOrder ? handleUpdate : handleCreate}
              initialData={editingOrder || { order_date: date, person_id: isAdmin ? '' : user.id }}
              onCancel={handleCancel}
              isAdmin={isAdmin}
              isEditing={!!editingOrder}
            />
          </div>
        )}

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : (
          <OrderTable
            orders={orders}
            onPay={openPayModal}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
            onApproveDeletion={handleApproveDeletion}
            onCancelDeletion={handleCancelDeletion}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {payModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', margin: 0 }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Confirm Payment</h2>
            <div className="form-group">
              <label>Transaction Date & Time</label>
              <input
                type="datetime-local"
                value={payModal.datetime}
                onChange={(e) => setPayModal({ ...payModal, datetime: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setPayModal({ show: false, orderId: null, datetime: '' })}>Cancel</button>
              <button className="btn btn-success" onClick={confirmPay}>Confirm Pay</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, orderId: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Order</h3>
            <p style={{ margin: '1rem 0' }}>Are you sure you want to delete this order?</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteModal({ show: false, orderId: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {approveDeletionModal.show && (
        <div className="modal-overlay" onClick={() => setApproveDeletionModal({ show: false, orderId: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Deletion</h3>
            <p style={{ margin: '1rem 0' }}>Are you sure you want to approve this deletion? The order will be permanently deleted.</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setApproveDeletionModal({ show: false, orderId: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmApproveDeletion}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {cancelDeletionModal.show && (
        <div className="modal-overlay" onClick={() => setCancelDeletionModal({ show: false, orderId: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Deletion Request</h3>
            <p style={{ margin: '1rem 0' }}>Are you sure you want to cancel this deletion request?</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setCancelDeletionModal({ show: false, orderId: null })}>No, Keep It</button>
              <button className="btn btn-warning" onClick={confirmCancelDeletion}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {rejectModal.show && (
        <div className="modal-overlay" onClick={() => setRejectModal({ show: false, orderId: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Payment</h3>
            <p style={{ margin: '1rem 0' }}>Are you sure you want to reject this payment? The paid amount will be cleared.</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setRejectModal({ show: false, orderId: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmReject}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {approveModal.show && (
        <div className="modal-overlay" onClick={() => setApproveModal({ show: false, orderId: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Payment</h3>
            <p style={{ margin: '1rem 0' }}>Are you sure you want to approve this payment?</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setApproveModal({ show: false, orderId: null })}>Cancel</button>
              <button className="btn btn-success" onClick={confirmApprove}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
