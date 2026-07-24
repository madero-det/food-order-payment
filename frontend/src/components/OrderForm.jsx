import { useState } from 'react';

export default function OrderForm({ persons, onSubmit, initialData = {}, onCancel, isAdmin = true, isEditing = false }) {
  const toDateInput = (val) => {
    if (!val) return '';
    const m = String(val).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  };

  const toDatetimeInput = (val) => {
    if (!val) return '';
    const s = String(val).replace(' ', 'T');
    const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return m ? m[1] : '';
  };

  const toPriceString = (val) => {
    if (val == null || val === '') return '';
    return String(Math.round(Number(val)));
  };

  const formatDisplayDate = (val) => {
    if (!val) return '-';
    const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return val;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  };

  const formatRiel = (val) => {
    if (val == null || val === '') return '-';
    return `${Number(val).toLocaleString()} R`;
  };

  const formatPersonName = (id) => {
    const p = persons.find((p) => p.id === Number(id));
    return p ? p.name : '-';
  };

  const [formData, setFormData] = useState({
    order_date: toDateInput(initialData.order_date) || new Date().toISOString().split('T')[0],
    person_id: initialData.person_id ? String(initialData.person_id) : '',
    price: toPriceString(initialData.price),
    paid_amount: toPriceString(initialData.paid_amount),
    transaction_date: toDatetimeInput(initialData.transaction_date),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: Number(formData.price),
      paid_amount: formData.paid_amount !== '' ? Number(formData.paid_amount) : null,
      person_id: Number(formData.person_id),
      transaction_date: formData.transaction_date || null,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {isAdmin ? (
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={formData.order_date}
              onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Person</label>
            <select
              value={formData.person_id}
              onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
              required
            >
              <option value="">Select person...</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Price (Riel)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Paid Amount (Riel)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={formData.paid_amount}
              onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
              placeholder="Leave empty if unpaid"
            />
          </div>
        </div>
      ) : (
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="text"
              value={formatDisplayDate(formData.order_date)}
              readOnly
              style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </div>
          <div className="form-group">
            <label>Person</label>
            <input
              type="text"
              value={formatPersonName(formData.person_id)}
              readOnly
              style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </div>
          <div className="form-group">
            <label>Price (Riel)</label>
            {isEditing ? (
              <input
                type="text"
                value={formatRiel(formData.price)}
                readOnly
                style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
              />
            ) : (
              <input
                type="number"
                min="0"
                step="500"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            )}
          </div>
          <div className="form-group">
            <label>Paid Amount (Riel)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={formData.paid_amount}
              onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
              placeholder="Leave empty if unpaid"
            />
          </div>
        </div>
      )}
      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label>Transaction Date & Time</label>
        <input
          type="datetime-local"
          value={formData.transaction_date}
          onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="submit" className="btn btn-primary">Save</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
