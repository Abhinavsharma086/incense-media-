const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const inqs = await prisma.$queryRawUnsafe('DESCRIBE `Inquiries`');
    console.log('Inquiries table columns:', inqs);

    const count = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM `Inquiries`');
    console.log('Total inquiries:', count);

    const sample = await prisma.$queryRawUnsafe('SELECT * FROM `Inquiries` ORDER BY id DESC LIMIT 5');
    console.log('Sample Inquiries:', JSON.stringify(sample, null, 2));

    // Also check other tables in the database!
    const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
    console.log('Tables in database:', tables);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
