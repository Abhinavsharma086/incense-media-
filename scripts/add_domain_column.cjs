const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const cols = await prisma.$queryRawUnsafe('DESCRIBE Lead');
    const hasDomain = cols.some(c => c.Field === 'domain');
    if (!hasDomain) {
      console.log('Adding domain column to Lead table...');
      await prisma.$executeRawUnsafe('ALTER TABLE `Lead` ADD COLUMN `domain` VARCHAR(255) NULL AFTER `category`');
      console.log('Added domain column successfully!');
    } else {
      console.log('domain column already exists in Lead table.');
    }

    const check = await prisma.$queryRawUnsafe('DESCRIBE Lead');
    console.log('Verified columns:', check.map(c => c.Field));
  } catch (err) {
    console.error('Error adding domain column:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
