import type { Withdrawal } from '../../hooks/useDashboard';
import { Badge } from '../ui/Badge';

interface WithdrawalTableProps {
  withdrawals: Withdrawal[];
}

export function WithdrawalTable({ withdrawals }: WithdrawalTableProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Withdrawal History</div>
          <div className="card-subtitle">{withdrawals.length} total requests</div>
        </div>
      </div>
      <div className="table-wrap">
        {withdrawals.length === 0 ? (
          <div className="empty">No withdrawals yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td className="td-mono">{w.id.slice(0, 8)}…</td>
                  <td className="td-bold">₹{w.amount.toFixed(2)}</td>
                  <td><Badge status={w.status} /></td>
                  <td className="td-mono">{new Date(w.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
