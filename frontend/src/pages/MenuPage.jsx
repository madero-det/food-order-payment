import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('food');
  const [isRice, setIsRice] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

  const fetchItems = async () => {
    try {
      setItems(await api.getMenuItems());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !price) return setError('Name and price are required');
    try {
      if (editingId === 'new') {
        await api.createMenuItem({ name, price: Number(price), type, is_rice: isRice, is_available: isAvailable });
      } else {
        await api.updateMenuItem(editingId, { name, price: Number(price), type, is_rice: isRice, is_available: isAvailable });
      }
      setName('');
      setPrice('');
      setEditingId(null);
      fetchItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setType(item.type || 'food');
    setIsRice(item.is_rice || false);
    setIsAvailable(item.is_available !== false);
    setError('');
  };

  const handleDelete = async () => {
    try {
      await api.deleteMenuItem(deleteModal.id);
      setDeleteModal({ show: false, id: null });
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      await api.updateMenuItem(item.id, { name: item.name, price: Number(item.price), type: item.type, is_rice: item.is_rice, is_available: item.is_available === false });
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setType('food');
    setIsRice(false);
    setIsAvailable(true);
    setError('');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Menu</h1>
        {!editingId && (
          <button className="btn btn-primary" onClick={() => { setName(''); setPrice(''); setEditingId('new'); }}>
            + New Item
          </button>
        )}
      </div>

      {editingId && (
        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Fried Rice" required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Price (Riel)</label>
                <input type="number" min="0" step="100" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="food">Food</option>
                  <option value="dessert">Dessert</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={isRice} onChange={(e) => setIsRice(e.target.checked)} style={{ width: 14, height: 14, outline: 'none' }} />
                  Rice
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} style={{ width: 14, height: 14, outline: 'none' }} />
                  Available
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingId === 'new' ? 'Add' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No menu items yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Price</th>
                <th>Avail</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{item.name}</strong></td>
                  <td><span className={`badge ${item.type === 'dessert' ? 'badge-pending' : 'badge-paid'}`} style={{ fontSize: '0.7rem' }}>{item.type === 'dessert' ? 'Dessert' : 'Food'}</span></td>
                  <td>{Number(item.price).toLocaleString()} R</td>
                  <td>
                    <button
                      className={`btn btn-sm ${item.is_available !== false ? 'btn-success' : 'btn-ghost'}`}
                      onClick={() => handleToggleAvailable(item)}
                      style={{ fontSize: '0.7rem', minWidth: '44px' }}
                    >
                      {item.is_available !== false ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => handleEdit(item)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-danger" title="Delete" onClick={() => setDeleteModal({ show: true, id: item.id })}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteModal.show && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, id: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Menu Item</h3>
            <p style={{ margin: '1rem 0' }}>Are you sure you want to delete this item?</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteModal({ show: false, id: null })}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
