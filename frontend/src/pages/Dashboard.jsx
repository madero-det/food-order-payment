import { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { api, getImageUrl } from '../api/client';
import useSSE from '../hooks/useSSE';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await api.getDashboard({}));
    } catch (err) {
      console.error(err);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, []);

  useSSE((event) => {
    if (['order_created', 'order_updated', 'order_deleted', 'payment_submitted', 'payment_approved', 'payment_rejected', 'deletion_requested', 'deletion_cancelled', 'deletion_approved'].includes(event)) {
      fetchDashboard(true);
    }
  });

  const formatRiel = (amount) => `${Number(amount).toLocaleString()} R`;

  const todayOrders = data?.today_orders || [];

  const StatusBadge = ({ o }) => {
    if (o.paid_amount != null) {
      if (o.payment_status === 'pending') return <span className="badge badge-pending">Pending</span>;
      if (o.payment_status === 'rejected') return <span className="badge badge-rejected">Rejected</span>;
      return <span className="badge badge-paid">Paid</span>;
    }
    return <span className="badge badge-unpaid">Unpaid</span>;
  };

  const PersonCell = ({ o }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {o.person_avatar ? (
        <img src={getImageUrl(o.person_avatar)} alt="" className="avatar" style={{ width: 24, height: 24 }} />
      ) : (
        <div className="avatar avatar-initials" style={{ width: 24, height: 24, fontSize: '0.6rem' }}>
          {o.person_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
        </div>
      )}
      <strong>{o.person_name}</strong>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="page-header">
          <div className="skeleton skeleton-text lg" style={{ width: 140, height: 24 }} />
        </div>
        <div className="skeleton-card" style={{ height: 350 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Today's Orders</h2>
        </div>
        {todayOrders.length === 0 ? (
          <div className="empty-state"><ShoppingCart size={32} /><p>No orders today</p></div>
        ) : (
          <>
            <div className="table-wrapper">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayOrders.map((o, idx) => (
                      <tr key={o.id}>
                        <td>{idx + 1}</td>
                        <td><PersonCell o={o} /></td>
                        <td>{formatRiel(o.price)}</td>
                        <td>{formatRiel(o.paid_amount)}</td>
                        <td><StatusBadge o={o} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mobile-cards">
              {todayOrders.map((o, idx) => (
                <div className="order-card" key={o.id}>
                  <div className="order-card-header">
                    <PersonCell o={o} />
                    <StatusBadge o={o} />
                  </div>
                  <div className="order-card-body">
                    <div className="order-card-row">
                      <span className="label">Price</span>
                      <span className="value">{formatRiel(o.price)}</span>
                    </div>
                    <div className="order-card-row">
                      <span className="label">Paid</span>
                      <span className="value">{formatRiel(o.paid_amount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
