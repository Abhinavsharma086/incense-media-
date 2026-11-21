const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const contactsCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Contacts`').catch(e => e.message);
    console.log('Contacts count:', contactsCount);

    const userDetailsCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `UserDetails`').catch(e => e.message);
    console.log('UserDetails count:', userDetailsCount);

    const usersCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM `Users`').catch(e => e.message);
    console.log('Users count:', usersCount);

    const partyCount = await prisma.party.count().catch(e => e.message);
    console.log('Party count:', partyCount);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
