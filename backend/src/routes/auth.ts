import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { redis } from '../redis';
import { requireAuth } from '../middleware/auth';

const router = Router();

const ACCESS_TTL = '15m';
const REFRESH_TTL = 60 * 60 * 24 * 7;

function signAccess(userId: string, name: string, role: string) {
  return jwt.sign({ userId, name, role }, process.env.JWT_ACCESS_SECRET!, { expiresIn: ACCESS_TTL });
}

function signRefresh(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: `${REFRESH_TTL}s` });
}

router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ error: 'userId and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const accessToken = signAccess(user.id, user.name, user.role);
  const refreshToken = signRefresh(user.id);

  await redis.set(`refresh:${user.id}`, refreshToken, { ex: REFRESH_TTL });

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, role: user.role, withdrawableBalance: user.withdrawableBalance },
  });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  let payload: any;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
  } catch {
    return res.status(401).json({ error: 'refresh token expired or invalid' });
  }

  const stored = await redis.get(`refresh:${payload.userId}`);
  if (stored !== refreshToken) {
    return res.status(401).json({ error: 'refresh token revoked' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return res.status(401).json({ error: 'user not found' });
  }

  const newAccessToken = signAccess(user.id, user.name, user.role);
  const newRefreshToken = signRefresh(user.id);

  await redis.set(`refresh:${user.id}`, newRefreshToken, { ex: REFRESH_TTL });

  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, name: user.name, role: user.role, withdrawableBalance: user.withdrawableBalance },
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  await redis.del(`refresh:${req.user!.userId}`);
  res.json({ message: 'logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ id: user.id, name: user.name, role: user.role, withdrawableBalance: user.withdrawableBalance });
});

export default router;
