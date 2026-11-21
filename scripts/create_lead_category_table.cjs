const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`LeadCategory\` (
        \`id\` VARCHAR(191) PRIMARY KEY,
        \`name\` VARCHAR(191) UNIQUE NOT NULL,
        \`label\` VARCHAR(191) NOT NULL,
        \`icon\` VARCHAR(191) DEFAULT '🏷️',
        \`color\` VARCHAR(191) DEFAULT 'purple',
        \`createdBy\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      );
    `);
    console.log('LeadCategory table created on local DB successfully!');

    // Seed standard defaults
    const defaults = [
      { id: 'cat-pub', name: 'publication', label: 'Publication', icon: '📚', color: 'purple' },
      { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
      { id: 'cat-expo', name: 'exhibition', label: 'Exhibition / Expo', icon: '🏛️', color: 'amber' },
      { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
      { id: 'cat-gen', name: 'general', label: 'General', icon: '💼', color: 'gray' },
    ];

    for (const d of defaults) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO \`LeadCategory\` (\`id\`, \`name\`, \`label\`, \`icon\`, \`color\`)
        VALUES ('${d.id}', '${d.name}', '${d.label}', '${d.icon}', '${d.color}')
        ON DUPLICATE KEY UPDATE \`label\` = '${d.label}', \`icon\` = '${d.icon}';
      `);
    }
    console.log('Standard categories seeded!');
  } catch (err) {
    console.error('Error creating LeadCategory table:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

