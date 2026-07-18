import { prisma } from '../db';

export class PayoutService {
  static async processAdvancePayouts(): Promise<{ processedCount: number; totalAmount: number }> {
    const eligibleSales = await prisma.sale.findMany({
      where: {
        status: 'pending',
        advancePaid: false,
      },
    });

    let processedCount = 0;
    let totalAmount = 0;

    for (const sale of eligibleSales) {
      const advanceAmount = Math.round(sale.earning * 0.1 * 100) / 100;

      await prisma.$transaction(async (tx) => {
        const currentSale = await tx.sale.findUnique({
          where: { id: sale.id },
        });

        if (!currentSale || currentSale.status !== 'pending' || currentSale.advancePaid) {
          return;
        }

        await tx.advancePayout.create({
          data: {
            saleId: sale.id,
            amount: advanceAmount,
          },
        });

        await tx.sale.update({
          where: { id: sale.id },
          data: { advancePaid: true },
        });

        await tx.user.update({
          where: { id: sale.userId },
          data: {
            withdrawableBalance: {
              increment: advanceAmount,
            },
          },
        });

        await tx.ledgerTransaction.create({
          data: {
            userId: sale.userId,
            amount: advanceAmount,
            type: 'ADVANCE_PAYOUT',
            referenceId: sale.id,
          },
        });

        processedCount++;
        totalAmount += advanceAmount;
      });
    }

    return { processedCount, totalAmount };
  }
}
