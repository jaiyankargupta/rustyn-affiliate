import { prisma } from '../src/db';
import bcrypt from 'bcryptjs';

async function main() {
  await prisma.ledgerTransaction.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.advancePayout.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.user.deleteMany({});

  const affiliatePassword = await bcrypt.hash('affiliate123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // Create john_doe (affiliate)
  await prisma.user.create({
    data: {
      id: 'john_doe',
      name: 'John Doe',
      password: affiliatePassword,
      role: 'affiliate',
      withdrawableBalance: 0.0,
    },
  });

  // Create admin (admin)
  await prisma.user.create({
    data: {
      id: 'admin',
      name: 'Administrator',
      password: adminPassword,
      role: 'admin',
      withdrawableBalance: 0.0,
    },
  });

  await prisma.sale.createMany({
    data: [
      { userId: 'john_doe', brand: 'brand_1', earning: 40, status: 'pending' },
      { userId: 'john_doe', brand: 'brand_1', earning: 40, status: 'pending' },
      { userId: 'john_doe', brand: 'brand_1', earning: 40, status: 'pending' },
    ],
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
