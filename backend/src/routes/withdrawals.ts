import { Router } from 'express';
import { prisma } from '../db';
import { WithdrawalService } from '../services/WithdrawalService';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(withdrawals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'userId and numeric amount are required' });
  }
  try {
    const withdrawal = await WithdrawalService.initiateWithdrawal(userId, amount);
    res.json(withdrawal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['success', 'failed', 'cancelled', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  try {
    const updated = await WithdrawalService.updateWithdrawalStatus(id, status);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
