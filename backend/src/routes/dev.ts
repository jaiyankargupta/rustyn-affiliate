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

  const users = [
    ['john_doe',     'John Doe',      affiliatePassword, 'affiliate'],
    ['priya_sharma', 'Priya Sharma',  affiliatePassword, 'affiliate'],
    ['ravi_kumar',   'Ravi Kumar',    affiliatePassword, 'affiliate'],
    ['admin',        'Administrator', adminPassword,      'admin'],
  ];
  for (const [id, name, pwd, role] of users) {
    await db.execute({
      sql: 'INSERT INTO User (id, name, password, role, withdrawableBalance, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)',
      args: [id, name, pwd, role, 0, now, now],
    });
  }

  const sales: [string, string, string, number][] = [
    ['john_doe',     'Nike',   'sale-jd-1', 40],
    ['john_doe',     'Adidas', 'sale-jd-2', 80],
    ['john_doe',     'Puma',   'sale-jd-3', 60],
    ['priya_sharma', 'Zara',   'sale-ps-1', 120],
    ['priya_sharma', 'H&M',    'sale-ps-2', 90],
    ['priya_sharma', 'Myntra', 'sale-ps-3', 55],
    ['ravi_kumar',   'Boat',   'sale-rk-1', 200],
    ['ravi_kumar',   'JBL',    'sale-rk-2', 150],
    ['ravi_kumar',   'Realme', 'sale-rk-3', 75],
  ];
  for (const [userId, brand, id, earning] of sales) {
    await db.execute({
      sql: 'INSERT INTO Sale (id, userId, brand, earning, status, advancePaid, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
      args: [id, userId, brand, earning, 'pending', 0, now, now],
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
