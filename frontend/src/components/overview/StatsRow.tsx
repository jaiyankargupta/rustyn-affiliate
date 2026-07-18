import { Wallet, TrendingUp, Clock } from 'lucide-react';
import type { Dashboard } from '../../hooks/useDashboard';

interface StatsRowProps {
  data: Dashboard;
}

export function StatsRow({ data }: StatsRowProps) {
  const approvedEarnings = data.sales
    .filter(s => s.status === 'approved')
    .reduce((a, s) => a + s.earning, 0);

  const approvedCount = data.sales.filter(s => s.status === 'approved').length;

  const eligibleAdvance = data.sales
    .filter(s => s.status === 'pending' && !s.advancePaid)
    .reduce((a, s) => a + s.earning * 0.1, 0);

  const eligibleCount = data.sales.filter(s => s.status === 'pending' && !s.advancePaid).length;

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-label">Withdrawable Balance</span>
          <div className="stat-icon-wrap blue"><Wallet size={15} /></div>
        </div>
        <div className="stat-value">₹{data.withdrawableBalance.toFixed(2)}</div>
        <div className="stat-sub">available for withdrawal</div>
      </div>

      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-label">Approved Earnings</span>
          <div className="stat-icon-wrap green"><TrendingUp size={15} /></div>
        </div>
        <div className="stat-value">₹{approvedEarnings.toFixed(2)}</div>
        <div className="stat-sub">{approvedCount} approved sales</div>
      </div>

      <div className="stat-card">
        <div className="stat-top">
          <span className="stat-label">Pending Advance</span>
          <div className="stat-icon-wrap amber"><Clock size={15} /></div>
        </div>
        <div className="stat-value">₹{eligibleAdvance.toFixed(2)}</div>
        <div className="stat-sub">{eligibleCount} sales eligible for 10% advance</div>
      </div>
    </div>
  );
}
