import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { useAuth } from '../context/AuthContext';

export interface Sale {
  id: string;
  brand: string;
  earning: number;
  status: string;
  advancePaid: boolean;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface LedgerTx {
  id: string;
  amount: number;
  type: string;
  referenceId: string;
  createdAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  withdrawableBalance: number;
  sales: Sale[];
  withdrawals: Withdrawal[];
  ledgerTransactions: LedgerTx[];
}

export function useDashboard() {
  const { user } = useAuth();
  const { call } = useApi();

  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const notify = (msg: string, type: 'ok' | 'err') => {
    if (type === 'ok') {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    }
  };

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const d = await call(`/users/${user.id}/dashboard`);
      setData(d);
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setLoading(false);
    }
  }, [user?.id, call]);

  const doWithdraw = async (amount: number) => {
    try {
      setBusy(true);
      await call('/withdrawals', { method: 'POST', body: JSON.stringify({ userId: user!.id, amount }) });
      notify(`₹${amount} withdrawal initiated`, 'ok');
      await load();
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const doAdvancePayout = async () => {
    try {
      setBusy(true);
      const j = await call('/sales/advance-payout', { method: 'POST' });
      notify(`processed ${j.processedCount} sales — ₹${j.totalAmount} paid`, 'ok');
      await load();
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    try {
      setBusy(true);
      await call('/dev/reset', { method: 'POST' });
      notify('database reset to seed state', 'ok');
      await load();
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const doReconcile = async (saleId: string, status: 'approved' | 'rejected') => {
    try {
      setBusy(true);
      await call('/sales/reconcile', { method: 'POST', body: JSON.stringify({ saleId, status }) });
      notify(`sale marked as ${status}`, 'ok');
      await load();
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const doWithdrawalStatus = async (id: string, status: string) => {
    try {
      setBusy(true);
      await call(`/withdrawals/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      notify(`withdrawal marked as ${status}`, 'ok');
      await load();
    } catch (e: any) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return {
    data, loading, error, success, busy,
    load, doWithdraw, doAdvancePayout, doReset, doReconcile, doWithdrawalStatus,
  };
}
