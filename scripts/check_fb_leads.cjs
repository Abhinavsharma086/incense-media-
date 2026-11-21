const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const types = await prisma.$queryRawUnsafe('SELECT type, COUNT(*) as c FROM `Inquiries` GROUP BY type');
    console.log('Inquiry types:', types);

    // Check if any inquiry has facebook or instagram in message or contactFor
    const fbInquiries = await prisma.$queryRawUnsafe(`
      SELECT id, type, contactFor, message FROM Inquiries 
      WHERE LOWER(message) LIKE '%facebook%' 
         OR LOWER(message) LIKE '%instagram%' 
         OR LOWER(message) LIKE '%meta%'
         OR LOWER(contactFor) LIKE '%facebook%'
         OR LOWER(contactFor) LIKE '%instagram%'
      LIMIT 10
    `);
    console.log('Inquiries mentioning Facebook or Instagram:', fbInquiries);

    // Also check if any leads in `Lead` table have notes mentioning facebook or instagram
    const fbLeads = await prisma.lead.findMany({
      where: {
        OR: [
          { notes: { contains: 'facebook' } },
          { notes: { contains: 'instagram' } },
          { campaign: { contains: 'facebook' } },
          { campaign: { contains: 'instagram' } },
        ]
      },
      select: { id: true, source: true, campaign: true, notes: true }
    });
    console.log('Leads mentioning Facebook or Instagram:', fbLeads);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
