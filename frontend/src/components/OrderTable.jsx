import { MoreHorizontal, Check, X, Pencil, Trash2, Clock, ShoppingCart } from 'lucide-react';
import { getImageUrl } from '../api/client';
import ActionDropdown from './ActionDropdown';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';
}

function sortItems(items) {
  if (!items || !items.length) return items;
  return [...items].sort((a, b) => {
    if (a.is_rice || a.type === 'rice') return 1;
    if (b.is_rice || b.type === 'rice') return -1;
    return 0;
  });
}

export default function OrderTable({ orders, onPay, onEdit, onDelete, onApprove, onReject, onApproveDeletion, onCancelDeletion, isAdmin, currentUser }) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <ShoppingCart size={36} />
        <p className="empty-title">No orders for this date</p>
      </div>
    );
  }

  const formatRiel = (amount) =>
    amount != null ? `${Number(amount).toLocaleString()} R` : '-';

  const formatDate = (dt) => {
    if (!dt) return '-';
    const s = String(dt).replace(' ', 'T');
    const parts = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!parts) return dt;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthName = months[Number(parts[2]) - 1];
    if (!parts[4]) return `${monthName} ${Number(parts[3])}, ${parts[1]}`;
    const h = Number(parts[4]);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${monthName} ${Number(parts[3])}, ${parts[1]} ${h12}:${parts[5]} ${ampm}`;
  };

  const renderBadges = (order) => (
    <>
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
      {order.deletion_status === 'pending' && (
        <span className="badge badge-pending" style={{ marginLeft: '0.25rem' }}>Delete Pending</span>
      )}
    </>
  );

  const checkIsOwner = (order) => {
    return isAdmin || (currentUser?.id && Number(order.person_id) === Number(currentUser.id)) || (currentUser?.pid && Number(order.person_id) === Number(currentUser.pid));
  };

  const renderActions = (order) => (
    <ActionDropdown>
      <button className="btn btn-ghost btn-sm actions-dots" title="Actions">
        <MoreHorizontal size={16} />
      </button>
      <div className="actions-dropdown-menu">
        {order.paid_amount == null && (
          <button className="btn btn-ghost btn-sm" onClick={() => onPay(order.id)}>
            <Check size={14} />
            <span>Pay</span>
          </button>
        )}
        {isAdmin && order.payment_status === 'pending' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => onApprove(order.id)}>
              <Check size={14} />
              <span>Approve</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onReject(order.id)}>
              <X size={14} />
              <span>Reject</span>
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(order)}>
          <Pencil size={14} />
          <span>Edit</span>
        </button>
        {order.deletion_status === 'pending' ? (
          isAdmin ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => onApproveDeletion(order.id)}>
                <Check size={14} />
                <span>Approve Delete</span>
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => onCancelDeletion(order.id)}>
                <X size={14} />
                <span>Cancel Delete</span>
              </button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.5 }}>
              <Clock size={14} />
              <span>Delete Pending</span>
            </button>
          )
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(order.id)} style={{ color: 'var(--color-danger)' }}>
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </ActionDropdown>
  );

  return (
    <>
    {/* Desktop table */}
    <div className="table-wrapper">
    <div className="table-scroll">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Items</th>
          <th>Price</th>
          <th className="hide-mobile">Paid</th>
          <th className="hide-mobile">Transaction Date</th>
          <th>Status</th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order, idx) => {
          const isOwner = checkIsOwner(order);
          return (
            <tr key={order.id}>
              <td>{idx + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {order.person_avatar ? (
                    <img src={getImageUrl(order.person_avatar)} alt="" className="avatar" style={{ width: 26, height: 26 }} />
                  ) : (
                    <div className="avatar avatar-initials" style={{ width: 26, height: 26, fontSize: '0.6rem' }}>
                      {getInitials(order.person_name)}
                    </div>
                  )}
                  <div>
                    <strong>{order.person_name}</strong>
                  </div>
                </div>
              </td>
              <td style={{ fontSize: '0.85rem' }}>
                {order.items && order.items.length > 0 ? (
                  <span>
                    <span style={{ color: 'var(--color-primary)' }}>{sortItems(order.items).map(i => i.name).join(', ')}</span>
                    {order.notes && <span style={{ color: 'var(--color-warning)' }}> ({order.notes})</span>}
                  </span>
                ) : order.notes ? (
                  <span style={{ color: 'var(--color-warning)' }}>({order.notes})</span>
                ) : '-'}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>{formatRiel(order.price)}</span>
                  {order.payment_method && <span className="badge" style={{ background: order.payment_method === 'cash' ? '#dbeafe' : '#d1fae5', color: order.payment_method === 'cash' ? '#1e40af' : '#065f46', fontSize: '0.6rem', padding: '0.1rem 0.35rem', whiteSpace: 'nowrap' }}>{order.payment_method === 'cash' ? 'Cash' : 'Bank'}</span>}
                </div>
              </td>
              <td className="hide-mobile">{formatRiel(order.paid_amount)}</td>
              <td className="hide-mobile">{formatDate(order.transaction_date)}</td>
              <td>{renderBadges(order)}</td>
              <td className="text-right">
                {isOwner ? renderActions(order) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', paddingRight: '0.5rem' }}>View only</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
    </div>

    {/* Mobile cards */}
    <div className="mobile-cards">
      {orders.map((order) => {
        const isOwner = checkIsOwner(order);
        return (
          <div className="order-card" key={order.id}>
            <div className="order-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {order.person_avatar ? (
                  <img src={getImageUrl(order.person_avatar)} alt="" className="avatar" style={{ width: 28, height: 28 }} />
                ) : (
                  <div className="avatar avatar-initials" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
                    {getInitials(order.person_name)}
                  </div>
                )}
                <span className="order-date">{order.person_name}</span>
              </div>
              {renderBadges(order)}
            </div>
            <div className="order-card-body">
              {order.items && order.items.length > 0 && (
                <div className="order-card-row">
                  <span className="label">Items</span>
                  <span className="value">
                    <span style={{ color: 'var(--color-primary)' }}>{sortItems(order.items).map(i => i.name).join(', ')}</span>
                    {order.notes && <span style={{ color: 'var(--color-warning)' }}> ({order.notes})</span>}
                  </span>
                </div>
              )}
              {order.notes && !order.items?.length && (
                <div className="order-card-row">
                  <span className="label">Notes</span>
                  <span className="value" style={{ color: 'var(--color-text-secondary)' }}>{order.notes}</span>
                </div>
              )}
              {order.payment_method && (
                <div className="order-card-row">
                  <span className="label">Method</span>
                  <span className="value" style={{ color: order.payment_method === 'cash' ? '#1e40af' : '#065f46' }}>{order.payment_method === 'cash' ? 'Cash' : 'Bank'}</span>
                </div>
              )}
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
                <span className="value">{formatDate(order.transaction_date)}</span>
              </div>
            </div>
            <div className="order-card-actions">
              {isOwner ? renderActions(order) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', padding: '0.25rem 0' }}>View only</span>}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
