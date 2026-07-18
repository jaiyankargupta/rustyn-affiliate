import { useState, type FormEvent } from 'react';
import { ChevronRight } from 'lucide-react';

interface WithdrawFormProps {
  balance: number;
  busy: boolean;
  onWithdraw: (amount: number) => void;
}

export function WithdrawForm({ balance, busy, onWithdraw }: WithdrawFormProps) {
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) return;
    onWithdraw(n);
    setAmount('');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Request Withdrawal</div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={busy}
              min="1"
              step="0.01"
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Available: <strong>₹{balance.toFixed(2)}</strong> · one request per 24 hrs
          </p>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !amount}>
            Request Withdrawal <ChevronRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
