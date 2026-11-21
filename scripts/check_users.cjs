const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const cols = await prisma.$queryRawUnsafe('DESCRIBE `Users`');
    console.log('Users columns:', cols.map(c => c.Field));
    const sample = await prisma.$queryRawUnsafe('SELECT id, name, email, phone, roleId, createdAt FROM `Users` LIMIT 10');
    console.log('Sample Users:', sample);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
