import { RefreshCw, Database } from 'lucide-react';

interface SystemOpsProps {
  busy: boolean;
  onAdvancePayout: () => void;
  onReset: () => void;
}

export function SystemOps({ busy, onAdvancePayout, onReset }: SystemOpsProps) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">System Operations</div>
          <div className="card-subtitle">Background jobs and database controls</div>
        </div>
      </div>
      <div className="card-body">
        <div className="action-block">
          <div className="action-info">
            <h4>Advance Payout Job</h4>
            <p>Credits 10% of earnings for all pending sales. Idempotent — running multiple times won't double-pay any sale.</p>
          </div>
          <button className="btn btn-primary" onClick={onAdvancePayout} disabled={busy}>
            <RefreshCw size={13} />
            Run Job
          </button>
        </div>
        <div className="action-block">
          <div className="action-info">
            <h4>Reset &amp; Seed Database</h4>
            <p>Wipes all data and seeds the demo user with 3 pending sales of ₹40 each for a clean demo state.</p>
          </div>
          <button className="btn btn-default" onClick={onReset} disabled={busy}>
            <Database size={13} />
            Reset DB
          </button>
        </div>
      </div>
    </div>
  );
}
