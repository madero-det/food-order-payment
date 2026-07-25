import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import useSSE from '../hooks/useSSE';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function PersonOrders() {
  const user = api.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [persons, setPersons] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    if (!isAdmin) return user?.id || '';
    return searchParams.get('person_id') || '';
  });
  const [orders, setOrders] = useState([]);
  const [startDate, setStartDate] = useState(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end') || '');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState(null);
  const sentinelRef = useRef(null);
  const limit = 15;

  useEffect(() => {
    if (isAdmin) {
      api.getPersons().then(setPersons);
    }
  }, [isAdmin]);

  const fetchOrders = useCallback(async (p, append = false) => {
    if (!selectedId) { setOrders([]); setSummary(null); return; }
    if (p === 1) setLoading(true); else setLoadingMore(true);
    const params = { person_id: selectedId, page: p, limit };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    try {
      const data = await api.getOrders(params);
      if (append) {
        setOrders(prev => [...prev, ...data.orders]);
      } else {
        setOrders(data.orders);
      }
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setHasMore(data.page < data.totalPages);
      setSummary(data.summary);
    } catch (err) {
      if (!append) setOrders([]);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [selectedId, startDate, endDate]);

  useEffect(() => {
    setPage(1);
    setHasMore(false);
    fetchOrders(1, false);
  }, [fetchOrders]);

  useEffect(() => {
    if (!isMobile) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchOrders(page + 1, true);
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile, hasMore, loadingMore, page, fetchOrders]);

  useSSE((event, data) => {
    if (event === 'order_created' || event === 'order_updated' || event === 'order_deleted' ||
        event === 'payment_submitted' || event === 'payment_approved' || event === 'payment_rejected' ||
        event === 'deletion_requested' || event === 'deletion_cancelled' || event === 'deletion_approved') {
      if (selectedId && (!data.triggeredBy || data.person_id === Number(selectedId) || data.triggeredBy === 'telegram')) {
        fetchOrders(page, false);
      }
    }
  });

  const handlePersonChange = (id) => {
    setSelectedId(id);
    if (id) {
      setSearchParams({ person_id: id, ...(startDate && { start: startDate }), ...(endDate && { end: endDate }) });
    } else {
      setSearchParams({});
    }
  };

  const formatRiel = (amount) => amount != null ? `${Number(amount).toLocaleString()} R` : '-';

  const formatDisplayDate = (dt) => {
    if (!dt) return '-';
    const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return dt;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  };

  const formatTime = (dt) => {
    if (!dt) return '';
    const s = String(dt).replace(' ', 'T');
    const m = s.match(/T(\d{2}):(\d{2})/);
    if (!m) return '';
    const h = Number(m[1]);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m[2]} ${ampm}`;
  };

  const selectedPerson = isAdmin ? persons.find((p) => p.id === Number(selectedId)) : user;

  return (
    <div>
      <div className="page-header">
        <h1>{isAdmin ? 'Person Orders' : 'My Orders'}</h1>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Person</label>
              <select value={selectedId} onChange={(e) => handlePersonChange(e.target.value)}>
                <option value="">Select person...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="card">
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {selectedId && summary && (
        <div className="stats-grid" style={{ marginTop: '1rem' }}>
          <div className="stat-card">
            <div className="label">{selectedPerson?.name} - Total Orders</div>
            <div className="value blue">{summary.total_orders}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Spent</div>
            <div className="value">{formatRiel(summary.total_spent)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Paid</div>
            <div className="value green">{formatRiel(summary.total_paid)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Unpaid</div>
            <div className="value red">{formatRiel(summary.total_unpaid)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found</div>
        ) : (
          <>
          <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Price</th>
                <th className="hide-mobile">Paid</th>
                <th className="hide-mobile">Transaction Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr
                  key={order.id}
                  onClick={() => order.paid_amount == null && navigate(`/orders?date=${order.order_date}`)}
                  style={order.paid_amount == null ? { cursor: 'pointer' } : undefined}
                >
                  <td>{idx + 1}</td>
                  <td>{formatDisplayDate(order.order_date)}</td>
                  <td>{formatRiel(order.price)}</td>
                  <td className="hide-mobile">{formatRiel(order.paid_amount)}</td>
                  <td className="hide-mobile">
                    {order.transaction_date
                      ? `${formatDisplayDate(order.transaction_date)} ${formatTime(order.transaction_date)}`
                      : '-'}
                  </td>
                  <td>
                    {order.paid_amount != null ? (
                      order.payment_status === 'pending' ? (
                        <span className="badge badge-pending">Pending</span>
                      ) : order.payment_status === 'rejected' ? (
                        <span className="badge badge-rejected">Rejected</span>
                      ) : (
                        <span className="badge badge-paid">Paid</span>
                      )
                    ) : (
                      <span className="badge badge-unpaid">Unpaid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="mobile-cards">
            {orders.map((order, idx) => (
              <div
                className="order-card"
                key={order.id}
                onClick={() => order.paid_amount == null && navigate(`/orders?date=${order.order_date}`)}
                style={order.paid_amount == null ? { cursor: 'pointer' } : undefined}
              >
                <div className="order-card-header">
                  <span className="order-date">{formatDisplayDate(order.order_date)}</span>
                  {order.paid_amount != null ? (
                    order.payment_status === 'pending' ? (
                      <span className="badge badge-pending">Pending</span>
                    ) : order.payment_status === 'rejected' ? (
                      <span className="badge badge-rejected">Rejected</span>
                    ) : (
                      <span className="badge badge-paid">Paid</span>
                    )
                  ) : (
                    <span className="badge badge-unpaid">Unpaid</span>
                  )}
                </div>
                <div className="order-card-body">
                  <div className="order-card-row">
                    <span className="label">Price</span>
                    <span className="value">{formatRiel(order.price)}</span>
                  </div>
                  <div className="order-card-row">
                    <span className="label">Paid</span>
                    <span className="value">{formatRiel(order.paid_amount)}</span>
                  </div>
                  <div className="order-card-row">
                    <span className="label">Transaction</span>
                    <span className="value">
                      {order.transaction_date
                        ? `${formatDisplayDate(order.transaction_date)} ${formatTime(order.transaction_date)}`
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isMobile && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              {page > 1 && (
                <button className="btn btn-ghost btn-sm" onClick={() => fetchOrders(page - 1, false)}>Previous</button>
              )}
              <span style={{ fontSize: '0.85rem', color: '#6b7280', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
              {page < totalPages && (
                <button className="btn btn-ghost btn-sm" onClick={() => fetchOrders(page + 1, false)}>Next</button>
              )}
            </div>
          )}

          {isMobile && loadingMore && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.85rem' }}>
              Loading more...
            </div>
          )}
          {isMobile && !hasMore && orders.length > limit && (
            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>
              All {orders.length} orders loaded
            </div>
          )}
          {isMobile && hasMore && <div ref={sentinelRef} />}
          </>
        )}
      </div>
    </div>
  );
}
