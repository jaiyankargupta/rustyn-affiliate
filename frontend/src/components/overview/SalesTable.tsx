import type { Sale } from '../../hooks/useDashboard';
import { Badge } from '../ui/Badge';

interface SalesTableProps {
  sales: Sale[];
}

export function SalesTable({ sales }: SalesTableProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Sales Pipeline</div>
          <div className="card-subtitle">{sales.length} total sales across all brands</div>
        </div>
      </div>
      <div className="table-wrap">
        {sales.length === 0 ? (
          <div className="empty">No sales yet. Reset the DB from Admin Panel to seed data.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Brand</th>
                <th>Earning</th>
                <th>Status</th>
                <th>Advance</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td className="td-mono">{s.id.slice(0, 8)}…</td>
                  <td className="td-bold">{s.brand}</td>
                  <td>₹{s.earning.toFixed(2)}</td>
                  <td><Badge status={s.status} /></td>
                  <td><Badge status={s.advancePaid ? 'yes' : 'no'} label={s.advancePaid ? 'Paid' : 'No'} /></td>
                  <td className="td-mono">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
