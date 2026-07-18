import { prisma } from '../db';
import { redis } from '../redis';

const WITHDRAWAL_LOCK_TTL = 60 * 60 * 24;

export class WithdrawalService {
  static async initiateWithdrawal(userId: string, amount: number): Promise<any> {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      if (user.withdrawableBalance < amount) {
        throw new Error(`Insufficient balance. Available: ₹${user.withdrawableBalance}, Requested: ₹${amount}`);
      }

      const lockKey = `withdrawal:lock:${userId}`;
      const locked = await redis.get(lockKey);

      if (locked) {
        const ttl = await redis.ttl(lockKey);
        const mins = Math.ceil(ttl / 60);
        throw new Error(`Withdrawal restricted. You can withdraw once every 24 hours. Try again in ${mins} minutes.`);
      }

      const withdrawal = await tx.withdrawal.create({
        data: { userId, amount, status: 'pending' },
      });

      await tx.user.update({
        where: { id: userId },
        data: { withdrawableBalance: { decrement: amount } },
      });

      await tx.ledgerTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'WITHDRAWAL',
          referenceId: withdrawal.id,
        },
      });

      await redis.set(lockKey, withdrawal.id, { ex: WITHDRAWAL_LOCK_TTL });

      return withdrawal;
    });
  }

  static async updateWithdrawalStatus(
    withdrawalId: string,
    status: 'success' | 'failed' | 'cancelled' | 'rejected'
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });

      if (!withdrawal) {
        throw new Error(`Withdrawal ${withdrawalId} not found`);
      }

      if (withdrawal.status !== 'pending') {
        throw new Error(`Withdrawal ${withdrawalId} already in a final state: ${withdrawal.status}`);
      }

      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status },
      });

      if (status === 'failed' || status === 'cancelled' || status === 'rejected') {
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { withdrawableBalance: { increment: withdrawal.amount } },
        });

        await tx.ledgerTransaction.create({
          data: {
            userId: withdrawal.userId,
            amount: withdrawal.amount,
            type: 'WITHDRAWAL_REFUND',
            referenceId: withdrawalId,
          },
        });

        await redis.del(`withdrawal:lock:${withdrawal.userId}`);
      }

      return updated;
    });
  }
}
