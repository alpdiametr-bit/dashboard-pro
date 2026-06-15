import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ───────────── Admin ─────────────
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

  // ───────────── Firmalar (2 ta) ─────────────
  const companies = [
    {
      name: "CLEVER INVEST MIKROMOLIYA TASHKILOTI MCHJ",
      region: "Toshkent shahri",
      inn: "309876543",
      description:
        "Toshkent shahridagi mikromoliya tashkiloti. Iste'mol va tadbirkorlik kreditlari.",
    },
    {
      name: "CASH UNION MIKROMOLIYA TASHKILOTI MCHJ",
      region: "Samarqand viloyati",
      inn: "304561237",
      description:
        "Samarqand viloyatidagi mikromoliya tashkiloti. Kichik biznes moliyalashtirish.",
    },
  ];

  for (const c of companies) {
    const company = await prisma.company.upsert({
      where: { name: c.name },
      update: { region: c.region, inn: c.inn, description: c.description },
      create: c,
    });
    console.log(`✔ Firma tayyor: ${company.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
