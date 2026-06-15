import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const login = process.env.SEED_ADMIN_LOGIN || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const name = process.env.SEED_ADMIN_NAME || "Bosh administrator";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { login },
    update: { name, passwordHash, isActive: true },
    create: { login, name, passwordHash, role: "superadmin" },
  });

  console.log(`✔ Admin tayyor: ${admin.login} (parol: ${password})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
