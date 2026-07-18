import app from '../src/app';
import { resetDatabase } from '../src/routes/dev';
import { redis } from '../src/redis';
import { Server } from 'http';

const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}`;

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function logStep(step: string, success: boolean, detail?: string) {
  if (success) {
    console.log(`[SUCCESS] ${step} ${detail ? `(${detail})` : ''}`);
  } else {
    console.log(`[FAILURE] ${step} ${detail ? `(${detail})` : ''}`);
    process.exit(1);
  }
}

async function runTests() {
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(PORT, () => {
      resolve(s);
    });
  });

  try {
    logSection('INITIALIZING AND SEEDING DATABASE');
    const resetResult = await resetDatabase();
    await redis.del('withdrawal:lock:john_doe');
    logStep('Reset and seed database via dev route helper', true, resetResult.message);

    logSection('AUTHENTICATION');

    const affiliateLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'john_doe', password: 'affiliate123' })
    });
    const affiliateAuth = await affiliateLoginRes.json() as any;
    if (!affiliateLoginRes.ok) {
      logStep('Affiliate user login', false, affiliateAuth.error);
    }
    const affiliateToken = affiliateAuth.accessToken;
    logStep('Affiliate user login successfully', true, `Token: ${affiliateToken.substring(0, 15)}...`);

    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'admin123' })
    });
    const adminAuth = await adminLoginRes.json() as any;
    if (!adminLoginRes.ok) {
      logStep('Admin user login', false, adminAuth.error);
    }
    const adminToken = adminAuth.accessToken;
    logStep('Admin user login successfully', true, `Token: ${adminToken.substring(0, 15)}...`);

    logSection('VERIFY INITIAL STATE');

    const dashboardRes1 = await fetch(`${BASE_URL}/api/users/john_doe/dashboard`, {
      headers: { 'Authorization': `Bearer ${affiliateToken}` }
    });
    const dashboard1 = await dashboardRes1.json() as any;
    if (!dashboardRes1.ok) {
      logStep('Fetch john_doe dashboard', false, dashboard1.error);
    }

    if (dashboard1.withdrawableBalance !== 0.0) {
      logStep('Verify initial withdrawable balance is 0.0', false, `Got: ${dashboard1.withdrawableBalance}`);
    }
    logStep('Initial withdrawable balance is Rs.0.0', true);

    const pendingSales = dashboard1.sales.filter((s: any) => s.status === 'pending' && !s.advancePaid);
    if (pendingSales.length !== 3) {
      logStep('Verify 3 pending sales exist with advancePaid=false', false, `Found: ${pendingSales.length}`);
    }
    logStep('Found 3 pending sales with advancePaid = false', true);

    logSection('QUESTION 1: RULE 1 - ADVANCE PAYOUT JOB');

    const runJobRes = await fetch(`${BASE_URL}/api/sales/advance-payout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const jobResult = await runJobRes.json() as any;
    if (!runJobRes.ok) {
      logStep('Run bulk advance payout job', false, jobResult.error);
    }
    if (jobResult.processedCount !== 3 || jobResult.totalAmount !== 12.0) {
      logStep('Verify advance payout job results', false, `Processed: ${jobResult.processedCount}, Amount: ${jobResult.totalAmount}`);
    }
    logStep('Advance payout job processed 3 sales with total Rs.12.0', true);

    const dashboardRes2 = await fetch(`${BASE_URL}/api/users/john_doe/dashboard`, {
      headers: { 'Authorization': `Bearer ${affiliateToken}` }
    });
    const dashboard2 = await dashboardRes2.json() as any;
    if (dashboard2.withdrawableBalance !== 12.0) {
      logStep('Verify withdrawable balance updated to 12.0', false, `Got: ${dashboard2.withdrawableBalance}`);
    }
    logStep('Withdrawable balance updated to Rs.12.0 (10% of Rs.40 * 3 sales)', true);

    const advanceTransactions = dashboard2.ledgerTransactions.filter((lt: any) => lt.type === 'ADVANCE_PAYOUT');
    if (advanceTransactions.length !== 3) {
      logStep('Verify 3 ADVANCE_PAYOUT ledger transactions exist', false, `Found: ${advanceTransactions.length}`);
    }
    logStep('3 ADVANCE_PAYOUT ledger transactions recorded in database history', true);

    const runJobRes2 = await fetch(`${BASE_URL}/api/sales/advance-payout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const jobResult2 = await runJobRes2.json() as any;
    if (jobResult2.processedCount !== 0) {
      logStep('Verify advance payout job idempotency', false, `Processed count on re-run: ${jobResult2.processedCount}`);
    }
    logStep('Idempotency verified: re-running job processed 0 sales', true);

    logSection('QUESTION 1: RULE 2 - RECONCILIATION CASE 1 (APPROVED SALE)');

    const approvedSale = dashboard2.sales[0];
    const reconcileApprovedRes = await fetch(`${BASE_URL}/api/sales/reconcile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ saleId: approvedSale.id, status: 'approved' })
    });
    const appResult = await reconcileApprovedRes.json() as any;
    if (!reconcileApprovedRes.ok) {
      logStep('Reconcile first sale as approved', false, appResult.error);
    }
    logStep('Sale reconciled as approved successfully', true);

    const dashboardRes3 = await fetch(`${BASE_URL}/api/users/john_doe/dashboard`, {
      headers: { 'Authorization': `Bearer ${affiliateToken}` }
    });
    const dashboard3 = await dashboardRes3.json() as any;
    if (dashboard3.withdrawableBalance !== 48.0) {
      logStep('Verify remaining 90% (Rs.36) credited to withdrawable balance', false, `Got: ${dashboard3.withdrawableBalance}`);
    }
    logStep('Remaining 90% (Rs.36) credited. Withdrawable balance is Rs.48.0', true);

    const approvedLedger = dashboard3.ledgerTransactions.find((lt: any) => lt.referenceId === approvedSale.id && lt.type === 'FINAL_PAYOUT_APPROVED');
    if (!approvedLedger || approvedLedger.amount !== 36.0) {
      logStep('Verify FINAL_PAYOUT_APPROVED ledger entry', false, `Entry: ${JSON.stringify(approvedLedger)}`);
    }
    logStep('FINAL_PAYOUT_APPROVED ledger entry recorded (amount: Rs.36)', true);

    logSection('QUESTION 1: RULE 2 - RECONCILIATION CASE 2 (REJECTED SALE)');

    const rejectedSale = dashboard3.sales[1];
    const reconcileRejectedRes = await fetch(`${BASE_URL}/api/sales/reconcile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ saleId: rejectedSale.id, status: 'rejected' })
    });
    const rejResult = await reconcileRejectedRes.json() as any;
    if (!reconcileRejectedRes.ok) {
      logStep('Reconcile second sale as rejected', false, rejResult.error);
    }
    logStep('Sale reconciled as rejected successfully', true);

    const dashboardRes4 = await fetch(`${BASE_URL}/api/users/john_doe/dashboard`, {
      headers: { 'Authorization': `Bearer ${affiliateToken}` }
    });
    const dashboard4 = await dashboardRes4.json() as any;
    if (dashboard4.withdrawableBalance !== 44.0) {
      logStep('Verify advance payout (Rs.4) adjusted and debited', false, `Got: ${dashboard4.withdrawableBalance}`);
    }
    logStep('Advance payout (Rs.4) adjusted. Withdrawable balance is Rs.44.0', true);

    const rejectedLedger = dashboard4.ledgerTransactions.find((lt: any) => lt.referenceId === rejectedSale.id && lt.type === 'REJECTION_ADJUSTMENT');
    if (!rejectedLedger || rejectedLedger.amount !== -4.0) {
      logStep('Verify REJECTION_ADJUSTMENT ledger entry', false, `Entry: ${JSON.stringify(rejectedLedger)}`);
    }
    logStep('REJECTION_ADJUSTMENT ledger entry recorded (amount: -Rs.4)', true);

    logSection('QUESTION 1: RULE 3 - WITHDRAWAL RESTRICTIONS (24H LIMIT)');

    const withdrawRes1 = await fetch(`${BASE_URL}/api/withdrawals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${affiliateToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: 'john_doe', amount: 30 })
    });
    const withdrawResult1 = await withdrawRes1.json() as any;
    if (!withdrawRes1.ok) {
      logStep('Initiate first withdrawal of Rs.30', false, withdrawResult1.error);
    }
    logStep('First withdrawal of Rs.30 initiated successfully', true, `Withdrawal ID: ${withdrawResult1.id}`);

    const dashboardRes5 = await fetch(`${BASE_URL}/api/users/john_doe/dashboard`, {
      headers: { 'Authorization': `Bearer ${affiliateToken}` }
    });
    const dashboard5 = await dashboardRes5.json() as any;
    if (dashboard5.withdrawableBalance !== 14.0) {
      logStep('Verify balance decremented after withdrawal', false, `Got: ${dashboard5.withdrawableBalance}`);
    }
    logStep('Withdrawable balance decremented. Balance is now Rs.14.0', true);

    const withdrawRes2 = await fetch(`${BASE_URL}/api/withdrawals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${affiliateToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: 'john_doe', amount: 10 })
    });
    const withdrawResult2 = await withdrawRes2.json() as any;
    if (withdrawRes2.ok) {
      logStep('Attempt duplicate withdrawal within 24h', false, 'Succeeded when it should have failed');
    }
    if (!withdrawResult2.error || !withdrawResult2.error.includes('restricted')) {
      logStep('Verify withdrawal rate-limit error message', false, `Got: ${JSON.stringify(withdrawResult2)}`);
    }
    logStep('Second withdrawal blocked by 24h rate-limiting lock as expected', true, withdrawResult2.error);

    logSection('QUESTION 2: FAILED PAYOUT RECOVERY');

    const webhookRes = await fetch(`${BASE_URL}/api/withdrawals/${withdrawResult1.id}/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'failed' })
    });
    const webhookResult = await webhookRes.json() as any;
    if (!webhookRes.ok) {
      logStep('Trigger gateway failure status webhook', false, webhookResult.error);
    }
    logStep('Gateway status webhook failure processed successfully', true);

    const dashboardRes6 = await fetch(`${BASE_URL}/api/users/john_doe/dashboard`, {
      headers: { 'Authorization': `Bearer ${affiliateToken}` }
    });
    const dashboard6 = await dashboardRes6.json() as any;
    if (dashboard6.withdrawableBalance !== 44.0) {
      logStep('Verify withdrawable balance refunded back to 44.0', false, `Got: ${dashboard6.withdrawableBalance}`);
    }
    logStep('Withdrawable balance successfully refunded back to Rs.44.0', true);

    const refundLedger = dashboard6.ledgerTransactions.find((lt: any) => lt.referenceId === withdrawResult1.id && lt.type === 'WITHDRAWAL_REFUND');
    if (!refundLedger || refundLedger.amount !== 30.0) {
      logStep('Verify WITHDRAWAL_REFUND ledger entry', false, `Entry: ${JSON.stringify(refundLedger)}`);
    }
    logStep('WITHDRAWAL_REFUND ledger entry recorded (amount: Rs.30)', true);

    const withdrawRes3 = await fetch(`${BASE_URL}/api/withdrawals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${affiliateToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: 'john_doe', amount: 30 })
    });
    const withdrawResult3 = await withdrawRes3.json() as any;
    if (!withdrawRes3.ok) {
      logStep('Initiate new withdrawal after recovery', false, withdrawResult3.error);
    }
    logStep('New withdrawal succeeded immediately! Lock cleared by failed recovery', true, `Withdrawal ID: ${withdrawResult3.id}`);

    logSection('SYSTEM LIFECYCLE VERIFIED - ALL TESTS PASSED!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
