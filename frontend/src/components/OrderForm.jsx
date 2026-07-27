import { useState, useEffect } from 'react';

export default function OrderForm({ persons, menuItems = [], onSubmit, initialData = {}, onCancel, isAdmin = true, isEditing = false }) {
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

  const initItems = initialData.items && initialData.items.length
    ? initialData.items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity || 1, price: i.price, id: Date.now() + Math.random() }))
    : [];

  const [formData, setFormData] = useState({
    order_date: toDateInput(initialData.order_date) || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })(),
    person_id: initialData.person_id ? String(initialData.person_id) : '',
    price: toPriceString(initialData.price),
    paid_amount: toPriceString(initialData.paid_amount),
    transaction_date: toDatetimeInput(initialData.transaction_date),
    notes: initialData.notes || '',
    payment_method: initialData.payment_method || '',
  });

    const [selectedItems, setSelectedItems] = useState(initItems);
    const [newItemId, setNewItemId] = useState('');

    const totalPrice = selectedItems.reduce((s, i) => s + (Number(i.price) * (i.quantity || 1)), 0);

    useEffect(() => {
      setFormData(prev => ({ ...prev, price: totalPrice || prev.price }));
    }, [totalPrice]);

    const addItem = () => {
      if (!newItemId) return;
      const item = menuItems.find(m => m.id === Number(newItemId));
      if (!item) return;
      setSelectedItems(prev => [...prev, { menu_item_id: item.id, quantity: 1, price: item.price, id: Date.now() + Math.random() }]);
      setNewItemId('');
    };

    const removeItem = (uid) => {
    setSelectedItems(prev => prev.filter(i => i.id !== uid));
  };

  const updateQty = (uid, qty) => {
    setSelectedItems(prev => prev.map(i => i.id === uid ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: totalPrice || Number(formData.price),
      paid_amount: formData.paid_amount !== '' ? Number(formData.paid_amount) : null,
      person_id: Number(formData.person_id),
      transaction_date: formData.transaction_date || null,
      notes: formData.notes || null,
      payment_method: formData.payment_method || null,
      items: selectedItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, price: i.price })),
    };
    onSubmit(data);
  };

  const foodItems = menuItems.filter(m => m.type !== 'dessert' && !m.is_rice && m.is_available !== false);
  const dessertItems = menuItems.filter(m => m.type === 'dessert' && !m.is_rice && m.is_available !== false);
    const riceItem = menuItems.find(m => m.is_rice);
  const hasRice = selectedItems.some(si => riceItem && si.menu_item_id === riceItem.id);

  const toggleRice = () => {
    if (!riceItem) return;
    if (hasRice) {
      setSelectedItems(prev => prev.filter(si => si.menu_item_id !== riceItem.id));
    } else {
      setSelectedItems(prev => [...prev, { menu_item_id: riceItem.id, quantity: 1, price: riceItem.price, id: Date.now() + Math.random() }]);
    }
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
              onChange={(e) => {
                const pid = e.target.value;
                const person = persons.find(p => p.id === Number(pid));
                setFormData({ ...formData, person_id: pid, price: person?.default_price ? String(person.default_price) : formData.price });
              }}
              required
            >
              <option value="">Select person...</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Paid Amount (Riel)</label>
            <input
              type="number"
              min="0"
              step="100"
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
              className="input-disabled"
            />
          </div>
          <div className="form-group">
            <label>Person</label>
            <input
              type="text"
              value={formatPersonName(formData.person_id)}
              readOnly
              className="input-disabled"
            />
          </div>
          <div className="form-group">
            <label>Paid Amount (Riel)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.paid_amount}
              onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
              placeholder="Leave empty if unpaid"
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
          Food Items
        </label>
        {riceItem && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={hasRice} onChange={toggleRice} style={{ width: 16, height: 16, outline: 'none' }} />
            {riceItem.name} ({Number(riceItem.price).toLocaleString()} R)
          </label>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <select value={newItemId} onChange={(e) => setNewItemId(e.target.value)} style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}>
            <option value="">- Add item -</option>
            {foodItems.length > 0 && <optgroup label="Food" />}
            {foodItems.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({Number(m.price).toLocaleString()} R)</option>
            ))}
            {dessertItems.length > 0 && <optgroup label="Dessert" />}
            {dessertItems.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({Number(m.price).toLocaleString()} R)</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary btn-sm" onClick={addItem}>+</button>
        </div>

        {selectedItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
            {selectedItems.map((si) => {
              const mi = menuItems.find(m => m.id === Number(si.menu_item_id));
              return (
                <div key={si.id} className="selected-item-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f3f4f6', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span style={{ flex: 1 }}>{mi?.name || 'Item'} {mi?.type === 'dessert' ? '(Dessert)' : ''}</span>
                  <span style={{ color: '#6b7280' }}>
                    <select value={si.quantity} onChange={(e) => updateQty(si.id, Number(e.target.value))} style={{ padding: '0.1rem 0.3rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {[1,2,3,4,5].map(q => <option key={q} value={q}>{q}</option>)}
                    </select>{' '}
                    × {Number(si.price).toLocaleString()} R = <strong>{(Number(si.price) * si.quantity).toLocaleString()} R</strong>
                  </span>
                  <button type="button" onClick={() => removeItem(si.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1rem' }}>×</button>
                </div>
              );
            })}
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="food-total" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Total: {totalPrice.toLocaleString()} R
          </div>
        )}
      </div>

      <div className="form-row" style={{ marginTop: '0.5rem' }}>
        <div className="form-group">
          <label>Notes</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g., no chili"
          />
        </div>
        <div className="form-group">
          <label>Payment Method</label>
          <select
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            disabled={!isAdmin && isEditing}
            className={(!isAdmin && isEditing) ? 'input-disabled' : ''}
          >
            <option value="">-</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>
      </div>
      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label>Transaction Date & Time</label>
        <input
          type="datetime-local"
          value={formData.transaction_date}
          onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
          disabled={formData.payment_method === 'cash'}
          className={formData.payment_method === 'cash' ? 'input-disabled' : ''}
          style={{ width: '100%' }}
        />
        {formData.payment_method === 'cash' && (
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem' }}>Disabled for cash payments</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="submit" className="btn btn-primary">Save</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}