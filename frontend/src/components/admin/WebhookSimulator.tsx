import type { Withdrawal } from '../../hooks/useDashboard';

interface WebhookSimulatorProps {
  withdrawals: Withdrawal[];
  busy: boolean;
  onUpdateStatus: (id: string, status: string) => void;
}

export function WebhookSimulator({ withdrawals, busy, onUpdateStatus }: WebhookSimulatorProps) {
  const pending = withdrawals.filter(w => w.status === 'pending');

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Payment Gateway Webhook Simulator</div>
          <div className="card-subtitle">Simulate bank callbacks on pending withdrawals to test recovery flows</div>
        </div>
      </div>
      <div className="table-wrap">
        {pending.length === 0 ? (
          <div className="empty">No pending withdrawals. Go to Withdrawals and request a payout first.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Withdrawal ID</th>
                <th>Amount</th>
                <th>Simulate</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(w => (
                <tr key={w.id}>
                  <td className="td-mono">{w.id.slice(0, 8)}…</td>
                  <td className="td-bold">₹{w.amount.toFixed(2)}</td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-success btn-sm" onClick={() => onUpdateStatus(w.id, 'success')} disabled={busy}>Success</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onUpdateStatus(w.id, 'failed')} disabled={busy}>Failed</button>
                      <button className="btn btn-default btn-sm" onClick={() => onUpdateStatus(w.id, 'cancelled')} disabled={busy}>Cancelled</button>
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
