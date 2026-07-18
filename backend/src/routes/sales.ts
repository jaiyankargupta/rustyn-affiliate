import { Router } from 'express';
import { prisma } from '../db';
import { PayoutService } from '../services/PayoutService';
import { ReconciliationService } from '../services/ReconciliationService';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { advancePayout: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/advance-payout', requireAdmin, async (req, res) => {
  try {
    const result = await PayoutService.processAdvancePayouts();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reconcile', requireAdmin, async (req, res) => {
  const { saleId, status } = req.body;
  if (!saleId || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid saleId or status' });
  }
  try {
    await ReconciliationService.reconcileSale(saleId, status);
    res.json({ message: `Sale ${saleId} successfully reconciled as ${status}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
