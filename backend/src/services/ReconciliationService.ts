import { prisma } from '../db';

export class ReconciliationService {
  static async reconcileSale(saleId: string, status: 'approved' | 'rejected'): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { advancePayout: true },
      });

      if (!sale) {
        throw new Error(`Sale with ID ${saleId} not found`);
      }

      if (sale.status !== 'pending') {
        throw new Error(`Sale ${saleId} already reconciled with status: ${sale.status}`);
      }

      const advancePaidAmount = sale.advancePayout?.amount || 0;

      if (status === 'approved') {
        const finalPayout = Math.round((sale.earning - advancePaidAmount) * 100) / 100;

        await tx.sale.update({
          where: { id: saleId },
          data: { status: 'approved' },
        });

        await tx.user.update({
          where: { id: sale.userId },
          data: {
            withdrawableBalance: {
              increment: finalPayout,
            },
          },
        });

        await tx.ledgerTransaction.create({
          data: {
            userId: sale.userId,
            amount: finalPayout,
            type: 'FINAL_PAYOUT_APPROVED',
            referenceId: saleId,
          },
        });
      } else if (status === 'rejected') {
        const adjustment = -advancePaidAmount;

        await tx.sale.update({
          where: { id: saleId },
          data: { status: 'rejected' },
        });

        await tx.user.update({
          where: { id: sale.userId },
          data: {
            withdrawableBalance: {
              increment: adjustment,
            },
          },
        });

        await tx.ledgerTransaction.create({
          data: {
            userId: sale.userId,
            amount: adjustment,
            type: 'REJECTION_ADJUSTMENT',
            referenceId: saleId,
          },
        });
      }
    });
  }
}
