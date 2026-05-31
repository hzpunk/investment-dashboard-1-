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

async function main() {
  console.log("Seeding database...");

  for (const userData of USERS) {
    const user = await upsertUser(userData);

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