import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useDashboard } from './hooks/useDashboard';
import { LoginCard } from './components/auth/LoginCard';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Alert } from './components/ui/Alert';
import { StatsRow } from './components/overview/StatsRow';
import { SalesTable } from './components/overview/SalesTable';
import { WithdrawForm } from './components/withdrawals/WithdrawForm';
import { WithdrawalTable } from './components/withdrawals/WithdrawalTable';
import { LedgerTable } from './components/ledger/LedgerTable';
import { SystemOps } from './components/admin/SystemOps';
import { ReconcileTable } from './components/admin/ReconcileTable';
import { WebhookSimulator } from './components/admin/WebhookSimulator';

type Page = 'overview' | 'withdrawals' | 'ledger' | 'admin';

export default function App() {
  const { isAuthenticated, user, restoringSession } = useAuth();
  const [page, setPage] = useState<Page>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, loading, error, success, busy, load, doWithdraw, doAdvancePayout, doReset, doReconcile, doWithdrawalStatus } = useDashboard();

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  if (restoringSession) {
    return <div className="session-restoring">Restoring session…</div>;
  }

  if (!isAuthenticated) {
    return <LoginCard />;
  }

  // Redirect to overview if an affiliate somehow lands on 'admin' page
  const activePage = (page === 'admin' && user?.role !== 'admin') ? 'overview' : page;

  return (
    <div className="layout">
      <Sidebar page={activePage} onNavigate={setPage} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main">
        <Topbar page={activePage} onRefresh={load} loading={loading} onMenuToggle={() => setSidebarOpen(true)} />

        <div className="page-content">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          {loading && !data ? (
            <div className="empty">Loading…</div>
          ) : (
            <>
              {activePage === 'overview' && data && (
                <>
                  <StatsRow data={data} />
                  <SalesTable sales={data.sales} />
                </>
              )}

              {activePage === 'withdrawals' && data && (
                <div className="content-grid two-col">
                  <div className="content-left">
                    <WithdrawalTable withdrawals={data.withdrawals} />
                  </div>
                  <div className="content-right">
                    <WithdrawForm
                      balance={data.withdrawableBalance}
                      busy={busy}
                      onWithdraw={doWithdraw}
                    />
                  </div>
                </div>
              )}

              {activePage === 'ledger' && data && (
                <LedgerTable transactions={data.ledgerTransactions} />
              )}

              {activePage === 'admin' && user?.role === 'admin' && data && (
                <>
                  <SystemOps busy={busy} onAdvancePayout={doAdvancePayout} onReset={doReset} />
                  <ReconcileTable sales={data.sales} busy={busy} onReconcile={doReconcile} />
                  <WebhookSimulator withdrawals={data.withdrawals} busy={busy} onUpdateStatus={doWithdrawalStatus} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
