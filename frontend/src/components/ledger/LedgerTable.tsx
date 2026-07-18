import type { LedgerTx } from '../../hooks/useDashboard';

interface LedgerTableProps {
  transactions: LedgerTx[];
}

export function LedgerTable({ transactions }: LedgerTableProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Ledger Transactions</div>
          <div className="card-subtitle">Full audit trail of all balance movements</div>
        </div>
      </div>
      <div className="table-wrap">
        {transactions.length === 0 ? (
          <div className="empty">No transactions yet. Run the advance payout job or reconcile a sale.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td className="td-bold" style={{ fontSize: 12 }}>{tx.type.replace(/_/g, ' ')}</td>
                  <td className={tx.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                    {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                  </td>
                  <td className="td-mono">{tx.referenceId.slice(0, 8)}…</td>
                  <td className="td-mono">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
