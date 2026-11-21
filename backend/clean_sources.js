const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSources() {
  console.log('[*] Cleaning lead sources in database...');
  
  // 1. Leads with manual variations
  const manualRes = await prisma.$executeRawUnsafe(`
    UPDATE \`Lead\` 
    SET source = 'manual' 
    WHERE source LIKE 'Manually%' 
       OR source LIKE 'manually%' 
       OR source LIKE 'Manual%'
       OR source = 'manual'
       OR source IS NULL
       OR source = ''
       OR source LIKE '%customer%';
  `);
  console.log(`[+] Updated manual leads: ${manualRes}`);

  // 2. Leads with import / excel
  const importRes = await prisma.$executeRawUnsafe(`
    UPDATE \`Lead\` 
    SET source = 'import' 
    WHERE source LIKE '%excel%' 
       OR source LIKE '%import%' 
       OR source LIKE '%csv%' 
       OR source LIKE '%upload%';
  `);
  console.log(`[+] Updated imported leads: ${importRes}`);

  // 3. Website
  const webRes = await prisma.$executeRawUnsafe(`
    UPDATE \`Lead\` 
    SET source = 'website' 
    WHERE source LIKE '%web%' 
       OR source LIKE '%site%';
  `);
  console.log(`[+] Updated website leads: ${webRes}`);

  // 4. WhatsApp
  const waRes = await prisma.$executeRawUnsafe(`
    UPDATE \`Lead\` 
    SET source = 'whatsapp' 
    WHERE source LIKE '%whats%' 
       OR source LIKE '%wa%';
  `);
  console.log(`[+] Updated whatsapp leads: ${waRes}`);

  // 5. Expo
  const expoRes = await prisma.$executeRawUnsafe(`
    UPDATE \`Lead\` 
    SET source = 'expo' 
    WHERE source LIKE '%expo%' 
       OR source LIKE '%exhibit%';
  `);
  console.log(`[+] Updated expo leads: ${expoRes}`);

  // 6. Instagram
  const igRes = await prisma.$executeRawUnsafe(`
    UPDATE \`Lead\` 
    SET source = 'instagram' 
    WHERE source LIKE '%insta%' 
       OR source LIKE '%ig%';
  `);
  console.log(`[+] Updated instagram leads: ${igRes}`);

  // 7. Facebook
  const fbRes = await prisma.$executeRawUnsafe(`
    UPDATE \`Lead\` 
    SET source = 'facebook' 
    WHERE source LIKE '%facebook%' 
       OR source LIKE '%fb%' 
       OR source = 'meta';
  `);
  console.log(`[+] Updated facebook leads: ${fbRes}`);

  console.log('[*] All sources cleaned successfully in database!');
}

cleanSources()
  .catch((e) => {
    console.error('Error cleaning sources:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
