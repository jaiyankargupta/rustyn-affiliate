import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';
import { requireAdmin } from '../middleware/auth';

const router = Router();

async function resetDatabase() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const affiliatePassword = await bcrypt.hash('affiliate123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);
  const now = new Date().toISOString();

  await db.execute({ sql: 'DELETE FROM LedgerTransaction', args: [] });
  await db.execute({ sql: 'DELETE FROM Withdrawal', args: [] });
  await db.execute({ sql: 'DELETE FROM AdvancePayout', args: [] });
  await db.execute({ sql: 'DELETE FROM Sale', args: [] });
  await db.execute({ sql: 'DELETE FROM User', args: [] });

  await db.execute({
    sql: 'INSERT INTO User (id, name, password, role, withdrawableBalance, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)',
    args: ['john_doe', 'John Doe', affiliatePassword, 'affiliate', 0, now, now],
  });

  await db.execute({
    sql: 'INSERT INTO User (id, name, password, role, withdrawableBalance, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)',
    args: ['admin', 'Administrator', adminPassword, 'admin', 0, now, now],
  });

  for (const id of ['sale-1', 'sale-2', 'sale-3']) {
    await db.execute({
      sql: 'INSERT INTO Sale (id, userId, brand, earning, status, advancePaid, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
      args: [id, 'john_doe', 'brand_1', 40, 'pending', 0, now, now],
    });
  }

  return { message: 'database reset and seeded successfully' };
}

router.post('/reset', requireAdmin, async (req, res) => {
  try {
    const result = await resetDatabase();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
export { resetDatabase };
