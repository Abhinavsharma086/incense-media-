const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const cols = await prisma.$queryRawUnsafe('DESCRIBE `Lead`');
    const hasDomain = cols.some(c => c.Field === 'domain');
    console.log('Remote Lead has domain?', hasDomain);
    if (!hasDomain) {
      await prisma.$executeRawUnsafe('ALTER TABLE `Lead` ADD COLUMN `domain` VARCHAR(255) NULL AFTER `category`');
      console.log('Successfully added `domain` column to `Lead` table!');
    }
    const check = await prisma.$queryRawUnsafe('DESCRIBE `Lead`');
    console.log('Remote Lead columns:', check.map(c => c.Field));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
