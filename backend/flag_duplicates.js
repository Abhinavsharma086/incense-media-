const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function flagDuplicates() {
  console.log('[*] Scanning for existing duplicate leads...');
  const leads = await prisma.lead.findMany({
    select: { id: true, phone: true, email: true, fullName: true, isDuplicate: true },
    orderBy: { createdAt: 'asc' },
  });

  const phoneMap = new Map();
  const duplicateLeadIds = new Set();

  leads.forEach((l) => {
    const rawPhone = l.phone || '';
    const clean = rawPhone.replace(/[^0-9]/g, '');
    if (clean.length >= 7) {
      const key = clean.slice(-10);
      if (phoneMap.has(key)) {
        // Both the first one and this one are part of duplicates
        duplicateLeadIds.add(phoneMap.get(key));
        duplicateLeadIds.add(l.id);
      } else {
        phoneMap.set(key, l.id);
      }
    }
  });

  console.log(`Found ${duplicateLeadIds.size} leads in duplicate groups.`);

  if (duplicateLeadIds.size > 0) {
    const updated = await prisma.lead.updateMany({
      where: { id: { in: Array.from(duplicateLeadIds) } },
      data: { isDuplicate: true, duplicateFlaggedAt: new Date() },
    });
    console.log(`[+] Flagged ${updated.count} leads with isDuplicate = true!`);
  }

  // Also reset any leads that are NOT duplicates
  const cleanLeads = await prisma.lead.updateMany({
    where: { id: { notIn: Array.from(duplicateLeadIds) }, isDuplicate: true },
    data: { isDuplicate: false, duplicateFlaggedAt: null },
  });
  console.log(`[+] Reset ${cleanLeads.count} non-duplicate leads.`);
}

flagDuplicates()
  .catch((err) => console.error('Error:', err))
  .finally(() => prisma.$disconnect());

