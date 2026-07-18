import type { Sale } from '../../hooks/useDashboard';
import { Badge } from '../ui/Badge';

interface ReconcileTableProps {
  sales: Sale[];
  busy: boolean;
  onReconcile: (saleId: string, status: 'approved' | 'rejected') => void;
}

export function ReconcileTable({ sales, busy, onReconcile }: ReconcileTableProps) {
  const pending = sales.filter(s => s.status === 'pending');

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Sale Reconciliation</div>
          <div className="card-subtitle">{pending.length} pending sales waiting for admin action</div>
        </div>
      </div>
      <div className="table-wrap">
        {pending.length === 0 ? (
          <div className="empty">No pending sales. Reset the DB from System Operations to load demo data.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Brand</th>
                <th>Earning</th>
                <th>Advance Paid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(s => (
                <tr key={s.id}>
                  <td className="td-mono">{s.id.slice(0, 8)}…</td>
                  <td className="td-bold">{s.brand}</td>
                  <td>₹{s.earning.toFixed(2)}</td>
                  <td><Badge status={s.advancePaid ? 'yes' : 'no'} label={s.advancePaid ? 'Paid' : 'No'} /></td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-success btn-sm" onClick={() => onReconcile(s.id, 'approved')} disabled={busy}>Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onReconcile(s.id, 'rejected')} disabled={busy}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
