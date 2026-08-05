import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api, getImageUrl } from '../api/client';
import { API_BASE } from '../api/client';
import useSSE from '../hooks/useSSE';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatK(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return String(amount);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-item" style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString()} R
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dashboard, monthly] = await Promise.all([
        api.getDashboard({ month, year }),
        api.getMonthlyExpense({ year }),
      ]);
      setData(dashboard);
      setMonthlyData(monthly);
    } catch (err) {
      console.error(err);
    }
    if (!silent) setLoading(false);
  };

  const refreshDashboard = () => fetchDashboard(true);

  useEffect(() => {
    fetchDashboard();
  }, [month, year]);

  useSSE((event, data) => {
    if (event === 'order_created' || event === 'order_updated' || event === 'order_deleted' ||
        event === 'payment_submitted' || event === 'payment_approved' || event === 'payment_rejected' ||
        event === 'deletion_requested' || event === 'deletion_cancelled' || event === 'deletion_approved') {
      refreshDashboard();
    }
  });

  const user = api.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const formatRiel = (amount) => `${Number(amount).toLocaleString()} R`;

  const years = [2026, 2025, 2024];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dailyChartData = data?.daily?.map(d => {
    const parts = d.date.split('-');
    const day = Number(parts[2]);
    const m = Number(parts[1]) - 1;
    return { name: `${day} ${MONTHS_SHORT[m]}`, total: d.total, paid: d.paid };
  }) || [];

  const dailyMaxTotal = dailyChartData.length ? Math.max(...dailyChartData.map(d => d.total)) : 0;
  const monthlyMaxTotal = monthlyData.length ? Math.max(...monthlyData.map(d => d.total)) : 0;

  const maxDot = (color, maxValue) => (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    const isMax = payload.total === maxValue && maxValue > 0;
    return <circle cx={cx} cy={cy} r={isMax ? 5 : 3} fill={isMax ? '#dc2626' : color} />;
  };

  if (loading) return <div className="empty-state" style={{ animation: 'pulse 1.5s infinite' }}>Loading...</div>;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="date-nav">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {monthNames.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid #1d4ed8', lineHeight: 'normal' }} onClick={async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE}/dashboard/export?month=${month}&year=${year}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-${year}-${String(month).padStart(2,'0')}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
          }}>Export Excel</button>
        </div>
      </div>

      {data && (
        <>
          <div className="stats-grid">
            <div className="stat-card animate-fade-in-up-d1">
              <div className="label">Total Orders</div>
              <div className="value blue">{data.summary.total_orders}</div>
            </div>
            <div className="stat-card animate-fade-in-up-d2">
              <div className="label">Unpaid Orders</div>
              <div className="value red">{data.summary.unpaid_orders}</div>
            </div>
            <div className="stat-card animate-fade-in-up-d3">
              <div className="label">Total Revenue</div>
              <div className="value">{formatRiel(data.summary.total_price)}</div>
            </div>
            <div className="stat-card animate-fade-in-up-d4">
              <div className="label">Total Paid</div>
              <div className="value green">{formatRiel(data.summary.total_paid)}</div>
            </div>
            <div className="stat-card animate-fade-in-up-d5">
              <div className="label">Unpaid Amount</div>
              <div className="value red">{formatRiel(data.summary.total_unpaid)}</div>
            </div>
          </div>

          {!isAdmin && data.today_orders && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h2>Today's Orders</h2>
            </div>
            {data.today_orders.length === 0 ? (
              <div className="empty-state">No orders today</div>
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
                  {data.today_orders.map((o, idx) => (
                    <tr key={o.id}>
                      <td>{idx + 1}</td>
                      <td>
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
                      </td>
                      <td>{formatRiel(o.price)}</td>
                      <td>{formatRiel(o.paid_amount)}</td>
                      <td>
                        {o.paid_amount != null ? (
                          o.payment_status === 'pending' ? (
                            <span className="badge badge-pending">Pending</span>
                          ) : o.payment_status === 'rejected' ? (
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
              </div>

              <div className="mobile-cards">
                {data.today_orders.map((o, idx) => (
                  <div className="order-card" key={o.id}>
                    <div className="order-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {o.person_avatar ? (
                          <img src={getImageUrl(o.person_avatar)} alt="" className="avatar" style={{ width: 28, height: 28 }} />
                        ) : (
                          <div className="avatar avatar-initials" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
                            {o.person_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="order-date">{o.person_name}</span>
                      </div>
                      {o.paid_amount != null ? (
                        o.payment_status === 'pending' ? (
                          <span className="badge badge-pending">Pending</span>
                        ) : o.payment_status === 'rejected' ? (
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
          )}

          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h2>Daily Expense - {monthNames[month - 1]} {year}</h2>
            </div>
            {dailyChartData.length === 0 ? (
              <div className="empty-state">No data for this period</div>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={dailyChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={formatK} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2} dot={maxDot('#2563eb', dailyMaxTotal)} />
                    <Line type="monotone" dataKey="paid" name="Paid" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Monthly Expense - {year}</h2>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatK} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2} dot={maxDot('#2563eb', monthlyMaxTotal)} />
                  <Line type="monotone" dataKey="paid" name="Paid" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {isAdmin && (
          <div className="daily-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="card">
              <div className="card-header">
                <h2>Daily Breakdown</h2>
              </div>
              {data.daily.length === 0 ? (
                <div className="empty-state">No data for this period</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Orders</th>
                      <th>Total</th>
                      <th>Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.date} onClick={() => navigate(`/orders?date=${d.date}`)} style={{ cursor: 'pointer' }}>
                        <td>{(() => { const [y,m,day] = d.date.split('-'); const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const dt=new Date(`${d.date}T00:00:00`); return `${days[dt.getDay()]} ${Number(day)} ${months[Number(m)-1]}`; })()}</td>
                        <td>{d.order_count}</td>
                        <td>{formatRiel(d.total)}</td>
                        <td>{formatRiel(d.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {isAdmin && (
            <div className="card">
              <div className="card-header">
                <h2>By Person</h2>
              </div>
              {data.by_person.length === 0 ? (
                <div className="empty-state">No data for this period</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Orders</th>
                      <th>Unpaid</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_person.map((p) => (
                      <tr key={p.name} onClick={() => navigate(`/person-orders?person_id=${p.person_id}`)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {p.person_avatar ? (
                              <img src={getImageUrl(p.person_avatar)} alt="" className="avatar" style={{ width: 24, height: 24 }} />
                            ) : (
                              <div className="avatar avatar-initials" style={{ width: 24, height: 24, fontSize: '0.6rem' }}>
                                {p.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <strong>{p.name}</strong>
                          </div>
                        </td>
                        <td>{p.order_count}</td>
                        <td style={{ color: p.unpaid_count > 0 ? '#dc2626' : undefined }}>{p.unpaid_count || 0}</td>
                        <td>{formatRiel(p.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
}
