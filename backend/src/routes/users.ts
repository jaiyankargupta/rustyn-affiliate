import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/dashboard', async (req, res) => {
  const { id } = req.params;

  if (req.user?.userId !== id && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden: access denied' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      const sales = await prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
      });
      const withdrawals = await prisma.withdrawal.findMany({
        orderBy: { createdAt: 'desc' },
      });
      const ledgerTransactions = await prisma.ledgerTransaction.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        id: user.id,
        name: user.name,
        withdrawableBalance: user.withdrawableBalance,
        sales,
        withdrawals,
        ledgerTransactions,
      });
    }

    const affiliate = await prisma.user.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
        },
        ledgerTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json(affiliate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
