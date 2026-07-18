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

  await prisma.user.createMany({
    data: [
      { id: 'john_doe',     name: 'John Doe',     password: affiliatePassword, role: 'affiliate', withdrawableBalance: 0 },
      { id: 'priya_sharma', name: 'Priya Sharma', password: affiliatePassword, role: 'affiliate', withdrawableBalance: 0 },
      { id: 'ravi_kumar',   name: 'Ravi Kumar',   password: affiliatePassword, role: 'affiliate', withdrawableBalance: 0 },
      { id: 'admin',        name: 'Administrator', password: adminPassword,    role: 'admin',     withdrawableBalance: 0 },
    ],
  });

  await prisma.sale.createMany({
    data: [
      // john_doe sales
      { userId: 'john_doe',     brand: 'Nike',    earning: 40,  status: 'pending' },
      { userId: 'john_doe',     brand: 'Adidas',  earning: 80,  status: 'pending' },
      { userId: 'john_doe',     brand: 'Puma',    earning: 60,  status: 'pending' },
      // priya_sharma sales
      { userId: 'priya_sharma', brand: 'Zara',    earning: 120, status: 'pending' },
      { userId: 'priya_sharma', brand: 'H&M',     earning: 90,  status: 'pending' },
      { userId: 'priya_sharma', brand: 'Myntra',  earning: 55,  status: 'pending' },
      // ravi_kumar sales
      { userId: 'ravi_kumar',   brand: 'Boat',    earning: 200, status: 'pending' },
      { userId: 'ravi_kumar',   brand: 'JBL',     earning: 150, status: 'pending' },
      { userId: 'ravi_kumar',   brand: 'Realme',  earning: 75,  status: 'pending' },
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
