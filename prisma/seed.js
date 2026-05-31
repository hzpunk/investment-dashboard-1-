const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const USERS = [
  {
    email: "admin@example.com",
    password: "Admin12345!",
    username: "admin",
    role: "admin",
  },
  {
    email: "user@example.com",
    password: "User12345!",
    username: "user",
    role: "user",
  },
];

async function upsertUser({ email, password, username, role }) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerified: true,
    },
    create: {
      email,
      passwordHash,
      emailVerified: true,
    },
  });

  await prisma.profile.upsert({
    where: { id: user.id },
    update: {
      username,
      role,
    },
    create: {
      id: user.id,
      username,
      role,
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_role: {
        userId: user.id,
        role,
      },
    },
    update: {},
    create: {
      userId: user.id,
      role,
    },
  });

  return user;
}

async function upsertDemoData(user) {
  const assets = await Promise.all([
    prisma.asset.upsert({
      where: { symbol: "AAPL" },
      update: { name: "Apple Inc.", type: "stock", currentPrice: 190.25, currency: "USD" },
      create: { symbol: "AAPL", name: "Apple Inc.", type: "stock", currentPrice: 190.25, currency: "USD" },
    }),
    prisma.asset.upsert({
      where: { symbol: "VTI" },
      update: { name: "Vanguard Total Stock Market ETF", type: "etf", currentPrice: 255.5, currency: "USD" },
      create: { symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: "etf", currentPrice: 255.5, currency: "USD" },
    }),
    prisma.asset.upsert({
      where: { symbol: "BTC" },
      update: { name: "Bitcoin", type: "crypto", currentPrice: 68000, currency: "USD" },
      create: { symbol: "BTC", name: "Bitcoin", type: "crypto", currentPrice: 68000, currency: "USD" },
    }),
    prisma.asset.upsert({
      where: { symbol: "GLD" },
      update: { name: "SPDR Gold Shares", type: "commodity", currentPrice: 215.75, currency: "USD" },
      create: { symbol: "GLD", name: "SPDR Gold Shares", type: "commodity", currentPrice: 215.75, currency: "USD" },
    }),
  ]);

  const account =
    (await prisma.account.findFirst({
      where: { userId: user.id, name: "Demo Brokerage" },
    })) ??
    (await prisma.account.create({
      data: {
        userId: user.id,
        name: "Demo Brokerage",
        type: "brokerage",
        balance: 50000,
        currency: "USD",
      },
    }));

  await prisma.account.update({
    where: { id: account.id },
    data: { balance: 50000 },
  });

  await prisma.transaction.deleteMany({
    where: {
      userId: user.id,
      notes: { startsWith: "Seed demo transaction" },
    },
  });

  const demoTransactions = [
    { asset: assets[0], quantity: 20, pricePerUnit: 175, totalAmount: 3500 },
    { asset: assets[1], quantity: 25, pricePerUnit: 240, totalAmount: 6000 },
    { asset: assets[2], quantity: 0.12, pricePerUnit: 62000, totalAmount: 7440 },
    { asset: assets[3], quantity: 15, pricePerUnit: 205, totalAmount: 3075 },
  ];

  for (const item of demoTransactions) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        assetId: item.asset.id,
        type: "buy",
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalAmount: item.totalAmount,
        fee: 1,
        currency: "USD",
        date: new Date(),
        notes: "Seed demo transaction",
      },
    });
  }

  const portfolio =
    (await prisma.portfolio.findFirst({
      where: { userId: user.id, name: "Demo Portfolio" },
    })) ??
    (await prisma.portfolio.create({
      data: {
        userId: user.id,
        name: "Demo Portfolio",
        description: "Seeded demo holdings",
      },
    }));

  for (const item of demoTransactions) {
    await prisma.portfolioAsset.upsert({
      where: {
        portfolioId_assetId: {
          portfolioId: portfolio.id,
          assetId: item.asset.id,
        },
      },
      update: {
        quantity: item.quantity,
        averageBuyPrice: item.pricePerUnit,
      },
      create: {
        portfolioId: portfolio.id,
        assetId: item.asset.id,
        quantity: item.quantity,
        averageBuyPrice: item.pricePerUnit,
      },
    });
  }

  const goal = await prisma.goal.findFirst({
    where: { userId: user.id, name: "Build long-term portfolio" },
  });

  if (goal) {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { targetAmount: 100000, currentAmount: 20000, targetDate: new Date("2030-12-31") },
    });
  } else {
    await prisma.goal.create({
      data: {
        userId: user.id,
        name: "Build long-term portfolio",
        targetAmount: 100000,
        currentAmount: 20000,
        targetDate: new Date("2030-12-31"),
      },
    });
  }
}

async function main() {
  console.log("Seeding database...");

  for (const userData of USERS) {
    const user = await upsertUser(userData);
    await upsertDemoData(user);

    console.log(`Created/updated ${userData.role}: ${user.email}`);
    console.log(`Password: ${userData.password}`);
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
