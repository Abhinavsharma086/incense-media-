const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const cols = await prisma.$queryRawUnsafe('DESCRIBE Lead');
    console.log('Lead columns:', cols.map(c => c.Field));
    const hasDomain = cols.some(c => c.Field === 'domain');
    console.log('Has domain column in Lead table?:', hasDomain);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
