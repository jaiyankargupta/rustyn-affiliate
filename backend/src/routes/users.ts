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

  // Enforce self-access or admin-access
  if (req.user?.userId !== id && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden: access denied' });
  }

  try {
    const user = await prisma.user.findUnique({
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

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
