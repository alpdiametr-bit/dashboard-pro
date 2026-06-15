/* eslint-disable */
import { prisma } from "../src/lib/prisma";

async function main() {
  const res = await prisma.report.deleteMany({});
  console.log(`O'chirildi: ${res.count} ta hisobot (kaskad bilan)`);
  await prisma.$disconnect();
}
main();
