import { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, DollarSign, Building2, X } from 'lucide-react';

export default function OrderForm({ persons, menuItems = [], onSubmit, initialData = {}, onCancel, isAdmin = true, isEditing = false }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const submitLockRef = useRef(false);
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
    : [{ menu_item_id: '', quantity: 1, price: 0, id: Date.now() + Math.random() }];

  const [formData, setFormData] = useState({
    order_date: toDateInput(initialData.order_date) || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })(),
    person_id: initialData.person_id ? String(initialData.person_id) : '',
    price: toPriceString(initialData.price),
    paid_amount: toPriceString(initialData.paid_amount),
    transaction_date: toDatetimeInput(initialData.transaction_date),
    notes: initialData.notes || '',
    payment_method: initialData.payment_method || (isEditing ? (initialData.payment_method || '') : 'bank'),
    additional_price: toPriceString(initialData.additional_price) || '',
  });

    const [selectedItems, setSelectedItems] = useState(initItems);

    const totalPrice = selectedItems.reduce((s, i) => s + (Number(i.price) * (i.quantity || 1)), 0) + (Number(formData.additional_price) || 0);

    useEffect(() => {
      setFormData(prev => ({ ...prev, price: totalPrice || prev.price }));
    }, [totalPrice]);

    const removeItem = (uid) => {
    setSelectedItems(prev => prev.filter(i => i.id !== uid));
  };

  const updateQty = (uid, qty) => {
    setSelectedItems(prev => prev.map(i => i.id === uid ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setErrorMsg('');

    if (selectedItems.some(i => !i.menu_item_id)) {
      setErrorMsg('Please select an item for each row in your order.');
      submitLockRef.current = false;
      setSubmitting(false);
      return;
    }

    const data = {
      ...formData,
      price: totalPrice || Number(formData.price),
      paid_amount: formData.paid_amount !== '' ? Number(formData.paid_amount) : null,
      person_id: Number(formData.person_id),
      transaction_date: formData.transaction_date || null,
      notes: formData.notes || '',
      payment_method: formData.payment_method || null,
      additional_price: formData.additional_price !== '' ? Number(formData.additional_price) : 0,
      items: selectedItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, price: i.price })),
    };
    try {
      await onSubmit(data);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while saving the order.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })();
  const isToday = formData.order_date === todayStr;
  const foodItems = menuItems.filter(m => m.type !== 'dessert' && !m.is_rice && (isToday ? m.is_available !== false : true));
  const dessertItems = menuItems.filter(m => m.type === 'dessert' && !m.is_rice && (isToday ? m.is_available !== false : true));
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
      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.85rem' }}>
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold', marginLeft: '0.5rem' }}><X size={16} /></button>
        </div>
      )}
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

      <div className="food-items-section" style={{ marginTop: '0.75rem' }}>
        <div className="food-items-header">
          <span className="food-items-title">Food Items</span>
          {riceItem && (
            <label className="food-items-rice-check">
              <input type="checkbox" checked={hasRice} onChange={toggleRice} />
              <span>Add Rice ({Number(riceItem.price).toLocaleString()} R)</span>
            </label>
          )}
        </div>

        {selectedItems.map((si) => {
          const mi = menuItems.find(m => m.id === Number(si.menu_item_id));
          const isRice = mi?.is_rice;
          return (
            <div className="food-item-row" key={si.id}>
              {isRice ? (
                <span className="food-item-rice-name">
                  {mi.name} ({Number(mi.price).toLocaleString()} R)
                </span>
              ) : (
                <select
                  value={si.menu_item_id}
                  onChange={(e) => {
                    const mid = Number(e.target.value);
                    if (!mid) return;
                    const item = menuItems.find(m => m.id === mid);
                    setSelectedItems(prev => prev.map(i => i.id === si.id ? { ...i, menu_item_id: mid, price: item?.price || 0 } : i));
                  }}
                  className="food-item-select"
                >
                  <option value="">Select Food</option>
                  {foodItems.length > 0 && <optgroup label="Food" />}
                  {foodItems.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({Number(m.price).toLocaleString()} R)</option>
                  ))}
                  {dessertItems.length > 0 && <optgroup label="Dessert" />}
                  {dessertItems.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({Number(m.price).toLocaleString()} R)</option>
                  ))}
                </select>
              )}
              <div className="food-qty-wrap">
                <button type="button" className="food-qty-btn" onClick={() => updateQty(si.id, (si.quantity || 1) - 1)} disabled={(si.quantity || 1) <= 1}>−</button>
                <span className="food-qty-val">{si.quantity || 1}</span>
                <button type="button" className="food-qty-btn" onClick={() => updateQty(si.id, (si.quantity || 1) + 1)}>+</button>
              </div>
              <button type="button" className="food-item-del" onClick={() => removeItem(si.id)} title="Remove">
                <Trash2 size={16} color="var(--color-danger)" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className="food-add-another"
          onClick={() => {
            setSelectedItems(prev => [...prev, { menu_item_id: '', quantity: 1, price: 0, id: Date.now() + Math.random() }]);
          }}
        >
          <Plus size={16} />
          Add Another Item
        </button>

        {selectedItems.length > 0 && (
          <div className="food-total" style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem' }}>
            Total: {totalPrice.toLocaleString()} R
          </div>
        )}
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label>Additional Price (Riel)</label>
        <input
          type="number"
          min="0"
          step="100"
          value={formData.additional_price}
          onFocus={() => {
            if (formData.additional_price === '0') {
              setFormData({ ...formData, additional_price: '' });
            }
          }}
          onBlur={() => {
            if (formData.additional_price === '') {
              setFormData({ ...formData, additional_price: '0' });
            }
          }}
          onChange={(e) => setFormData({ ...formData, additional_price: e.target.value })}
          placeholder="Add extra amount on top of items total"
        />
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label>Notes</label>
        <input
          type="text"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="e.g., no chili"
        />
      </div>
      <div className="form-row" style={{ marginTop: '0.5rem' }}>
        <div className="form-group">
          <label>Payment Method</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { value: 'cash', label: 'Cash', icon: <DollarSign size={20} /> },
              { value: 'bank', label: 'Bank Transfer', icon: <Building2 size={20} /> },
            ].map((opt) => {
              const isSelected = formData.payment_method === opt.value;
              const isDisabled = !isAdmin && isEditing;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isDisabled}
                  className={`payment-method-card${isSelected ? ' selected' : ''}`}
                  onClick={() => setFormData({ ...formData, payment_method: isSelected ? '' : opt.value })}
                >
                  {opt.icon}
                  <span style={{ fontSize: '0.72rem' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-group">
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
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}