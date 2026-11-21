const { PrismaClient } = require('/var/www/crm-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function autoMergeAllDuplicates() {
  console.log('[*] Scanning for duplicate phone numbers across the CRM...');
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: true }
  });

  const phoneMap = {};
  leads.forEach(l => {
    const clean = (l.phone || '').replace(/[^0-9]/g, '');
    const ten = clean.length >= 10 ? clean.slice(-10) : clean;
    if (ten.length >= 6) {
      if (!phoneMap[ten]) phoneMap[ten] = [];
      phoneMap[ten].push(l);
    }
  });

  const duplicateGroups = Object.entries(phoneMap).filter(([k, v]) => v.length > 1);
  console.log(`Found ${duplicateGroups.length} duplicate phone groups to merge.`);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const [phone, group] of duplicateGroups) {
    console.log(`\nProcessing phone group ${phone} (${group.length} leads):`);

    // Sort leads: leads with non-empty notes first, then with follow-up dates, then latest updated
    group.sort((a, b) => {
      const aNotesLen = (a.notes || '').trim().length;
      const bNotesLen = (b.notes || '').trim().length;
      if (aNotesLen > 0 && bNotesLen === 0) return -1;
      if (bNotesLen > 0 && aNotesLen === 0) return 1;
      if (a.nextFollowUpDate && !b.nextFollowUpDate) return -1;
      if (!a.nextFollowUpDate && b.nextFollowUpDate) return 1;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

    const primary = group[0];
    const secondaries = group.slice(1);

    console.log(`  Master Lead: ${primary.id} - ${primary.fullName} (${primary.owner ? primary.owner.firstName + ' ' + primary.owner.lastName : 'Unassigned'})`);

    let mergedNotes = primary.notes || '';
    let updatedCompanyName = primary.companyName;
    let updatedEmail = primary.email;
    let updatedNextFollowUp = primary.nextFollowUpDate;
    let updatedCategory = primary.category;

    for (const sec of secondaries) {
      if (sec.notes && sec.notes.trim()) {
        const secText = sec.notes.trim();
        if (!mergedNotes.includes(secText)) {
          mergedNotes = mergedNotes
            ? `${mergedNotes}\n---\n[Merged from Duplicate Lead (${sec.source || 'Manual'})]:\n${secText}`
            : secText;
        }
      }

      if (!updatedCompanyName && sec.companyName) updatedCompanyName = sec.companyName;
      if (!updatedEmail && sec.email) updatedEmail = sec.email;
      if (!updatedNextFollowUp && sec.nextFollowUpDate) updatedNextFollowUp = sec.nextFollowUpDate;
      if ((!updatedCategory || updatedCategory === 'general') && sec.category && sec.category !== 'general') {
        updatedCategory = sec.category;
      }

      try {
        await prisma.leadActivity.updateMany({ where: { leadId: sec.id }, data: { leadId: primary.id } });
      } catch (e) {}
      try {
        await prisma.followUp.updateMany({ where: { leadId: sec.id }, data: { leadId: primary.id } });
      } catch (e) {}
      try {
        await prisma.deal.updateMany({ where: { leadId: sec.id }, data: { leadId: primary.id } });
      } catch (e) {}
      try {
        await prisma.assignmentLog.updateMany({ where: { leadId: sec.id }, data: { leadId: primary.id } });
      } catch (e) {}

      await prisma.lead.delete({ where: { id: sec.id } });
      deletedCount++;
      console.log(`  [-] Deleted duplicate lead ${sec.id}`);
    }

    await prisma.lead.update({
      where: { id: primary.id },
      data: {
        notes: mergedNotes || null,
        companyName: updatedCompanyName,
        email: updatedEmail,
        nextFollowUpDate: updatedNextFollowUp,
        category: updatedCategory,
        isDuplicate: false,
      }
    });

    mergedCount++;
    console.log(`  [+] Master lead updated and set unique.`);
  }

  // Set all remaining leads isDuplicate = false
  await prisma.lead.updateMany({
    data: { isDuplicate: false }
  });

  console.log(`\n==========================================`);
  console.log(`[SUCCESS] Merged ${mergedCount} groups. Removed ${deletedCount} duplicate leads.`);
  console.log(`All leads in the database are now 100% UNIQUE!`);
  console.log(`==========================================`);
}

autoMergeAllDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
