const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const matched = await prisma.$queryRawUnsafe(`
      SELECT l.id, l.fullName, l.email, l.phone as leadPhone, u.phone as userPhone
      FROM Lead l
      JOIN Users u ON LOWER(l.email) = LOWER(u.email)
      WHERE (l.phone IS NULL OR l.phone = '' OR l.phone = 'Email Only' OR l.phone = 'Not Provided')
      AND u.phone IS NOT NULL AND u.phone != ''
    `);
    console.log('Matched leads where User table has phone number:', matched);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
