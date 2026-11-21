const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$executeRawUnsafe(
      'ALTER TABLE `Lead` ADD COLUMN IF NOT EXISTS `category` VARCHAR(191) NULL DEFAULT "general";'
    );
    console.log('Local DB Category column added/ensured successfully!', res);
  } catch (e) {
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE `Lead` ADD COLUMN `category` VARCHAR(191) NULL DEFAULT "general";');
      console.log('Local DB Category column created successfully!');
    } catch (err) {
      console.log('Column check result:', err.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
