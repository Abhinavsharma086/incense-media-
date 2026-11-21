const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.leadCategory.findMany();
  console.log('Local Lead Categories:', cats);
  await prisma.$disconnect();
}
main();
