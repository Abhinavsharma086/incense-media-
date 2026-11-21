const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const inqsWithPhone = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Inquiries` WHERE phone IS NOT NULL AND phone != ""');
    console.log('Inquiries with phone in DB:', inqsWithPhone);

    const inqsWithNullPhone = await prisma.$queryRawUnsafe('SELECT id, name, email, phone, contactFor, message FROM `Inquiries` WHERE phone IS NULL OR phone = "" LIMIT 15');
    console.log('Inquiries with NULL phone:', JSON.stringify(inqsWithNullPhone, null, 2));

    // Check if phone numbers are in message or contactFor!
    const samplePhoneInMessage = await prisma.$queryRawUnsafe(`
      SELECT id, name, email, phone, contactFor, message 
      FROM Inquiries 
      WHERE (phone IS NULL OR phone = "" OR phone = "Email Only") 
      AND (message REGEXP '[0-9]{10}' OR contactFor REGEXP '[0-9]{10}')
      LIMIT 10
    `);
    console.log('Inquiries with 10-digit number in message or contactFor:', samplePhoneInMessage);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
