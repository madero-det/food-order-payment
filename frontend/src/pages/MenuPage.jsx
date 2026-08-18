import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMenuItems()
      .then(setItems)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Menu</h1>
      </div>

      <div className="card">
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
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ opacity: item.is_available === false ? 0.5 : 1 }}>
                  <td>{idx + 1}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>
                    <span className="badge" style={{ fontSize: '0.7rem', background: item.type === 'dessert' ? 'var(--color-badge-pending-bg)' : undefined, color: item.type === 'dessert' ? 'var(--color-badge-pending-text)' : undefined }}>
                      {item.type === 'dessert' ? 'Dessert' : 'Food'}
                    </span>
                  </td>
                  <td>{Number(item.price).toLocaleString()} R</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
