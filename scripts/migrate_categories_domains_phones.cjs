let PrismaClient;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (e) {
  PrismaClient = require('../backend/node_modules/@prisma/client').PrismaClient;
}
const prisma = new PrismaClient();

const STANDARD_CATEGORIES = [
  { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
  { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
  { id: 'cat-expo-stall', name: 'expo-stall', label: 'Expo Stall', icon: '🏛️', color: 'amber' },
  { id: 'cat-smp', name: 'social-media-promotion', label: 'Social Media Promotion', icon: '📱', color: 'purple' },
];

const STANDARD_DOMAINS = [
  'Agarbatti & Perfume Expo',
  'Soap & Detergent Expo',
  'India Stone & Tech Expo',
  'India FMCG Show',
];

function extractPhone(text) {
  if (!text) return null;
  // Match standard Indian 10-digit mobile numbers (+91-9876543210 or 9876543210)
  const match = text.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  if (match && match[1]) {
    return match[1];
  }
  // Generic 10 digit check
  const genericMatch = text.match(/\b([6-9]\d{9})\b/);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1];
  }
  return null;
}

function detectDomain(text) {
  const s = (text || '').toLowerCase();
  if (s.includes('soap') || s.includes('detergent')) return 'Soap & Detergent Expo';
  if (s.includes('stone') || s.includes('granite') || s.includes('marble')) return 'India Stone & Tech Expo';
  if (s.includes('fmcg') || s.includes('grocery') || s.includes('retail')) return 'India FMCG Show';
  if (s.includes('agarbatti') || s.includes('perfume') || s.includes('incense') || s.includes('fragrance') || s.includes('dhoop') || s.includes('raw material')) {
    return 'Agarbatti & Perfume Expo';
  }
  return 'Agarbatti & Perfume Expo'; // Default flagship domain
}

function detectCategory(text, type, campaign) {
  const s = `${text || ''} ${type || ''} ${campaign || ''}`.toLowerCase();
  if (s.includes('stall') || s.includes('exhibitor') || s.includes('booth') || s.includes('expo') || s.includes('space')) {
    return 'expo-stall';
  }
  if (s.includes('social') || s.includes('media') || s.includes('instagram') || s.includes('facebook') || s.includes('reel') || s.includes('youtube')) {
    return 'social-media-promotion';
  }
  if (s.includes('ad') || s.includes('banner') || s.includes('promot') || s.includes('sponsor') || s.includes('branding')) {
    return 'advertisement';
  }
  if (s.includes('subscri') || s.includes('magazine') || s.includes('journal') || s.includes('book') || s.includes('newsletter') || s.includes('issue')) {
    return 'subscription';
  }
  return 'subscription';
}

(async () => {
  try {
    console.log('--- 1. UPSERTING THE 4 STANDARD CATEGORIES IN DB ---');
    // Delete non-standard categories or replace
    for (const cat of STANDARD_CATEGORIES) {
      await prisma.leadCategory.upsert({
        where: { name: cat.name },
        update: { label: cat.label, icon: cat.icon, color: cat.color },
        create: cat,
      });
      console.log(`Upserted category: ${cat.label} (${cat.name})`);
    }

    // Keep only the 4 options in LeadCategory table
    const standardNames = STANDARD_CATEGORIES.map(c => c.name);
    await prisma.leadCategory.deleteMany({
      where: {
        name: { notIn: standardNames }
      }
    });
    console.log('LeadCategory table now contains ONLY the 4 requested categories.');

    console.log('--- 2. RECOVERING PHONE NUMBERS & SETTING DOMAIN / CATEGORY ---');
    const leads = await prisma.lead.findMany();
    let phoneRecoveredCount = 0;
    let categoryUpdatedCount = 0;
    let domainUpdatedCount = 0;

    // Preload Users map by email
    const users = await prisma.user.findMany({
      where: { phone: { not: null } },
      select: { email: true, phone: true }
    });
    const userPhoneMap = new Map();
    users.forEach(u => {
      if (u.email && u.phone && u.phone.trim() && u.phone !== 'Email Only') {
        userPhoneMap.set(u.email.toLowerCase().trim(), u.phone.trim());
      }
    });

    // Preload raw Inquiries
    const inqs = await prisma.$queryRawUnsafe('SELECT id, email, phone, contactFor, message FROM Inquiries');
    const inqMap = new Map();
    inqs.forEach(inq => {
      inqMap.set(inq.id, inq);
      if (inq.email) {
        inqMap.set(inq.email.toLowerCase().trim(), inq);
      }
    });

    for (const lead of leads) {
      const updates = {};
      const currentPhone = (lead.phone || '').trim();
      const isMissingPhone = !currentPhone || currentPhone === 'Email Only' || currentPhone === 'N/A' || currentPhone === 'Not Provided';

      // 1. Phone recovery
      if (isMissingPhone) {
        let foundPhone = null;

        // Try User table by email
        if (lead.email) {
          const uPhone = userPhoneMap.get(lead.email.toLowerCase().trim());
          if (uPhone && uPhone.replace(/[^0-9]/g, '').length >= 10) {
            foundPhone = uPhone.replace(/[^0-9]/g, '').slice(-10);
          }
        }

        // Try Inquiries by leadgenId or email
        if (!foundPhone && lead.leadgenId && lead.leadgenId.startsWith('website_')) {
          const inqId = parseInt(lead.leadgenId.replace('website_', ''));
          const inq = inqMap.get(inqId);
          if (inq) {
            if (inq.phone && inq.phone.replace(/[^0-9]/g, '').length >= 10) {
              foundPhone = inq.phone.replace(/[^0-9]/g, '').slice(-10);
            }
            if (!foundPhone) {
              foundPhone = extractPhone(inq.contactFor) || extractPhone(inq.message);
            }
          }
        }

        // Try notes
        if (!foundPhone && lead.notes) {
          foundPhone = extractPhone(lead.notes);
        }

        if (foundPhone) {
          updates.phone = foundPhone;
          phoneRecoveredCount++;
        }
      }

      // 2. Category normalization to one of the 4:
      // subscription, advertisement, expo-stall, social-media-promotion
      const curCat = (lead.category || '').toLowerCase();
      if (!standardNames.includes(curCat)) {
        const newCat = detectCategory(`${lead.notes || ''} ${lead.campaign || ''} ${lead.fullName || ''}`, lead.campaign, lead.source);
        updates.category = newCat;
        categoryUpdatedCount++;
      }

      // 3. Domain assignment (one of the 4)
      if (!lead.domain) {
        const newDomain = detectDomain(`${lead.notes || ''} ${lead.campaign || ''} ${lead.companyName || ''}`);
        updates.domain = newDomain;
        domainUpdatedCount++;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: updates
        });
      }
    }

    console.log(`Summary of Historical Data Migration:`);
    console.log(`- Phone numbers recovered: ${phoneRecoveredCount}`);
    console.log(`- Categories updated to 4 standards: ${categoryUpdatedCount}`);
    console.log(`- Domains populated: ${domainUpdatedCount}`);

    // Verification
    const updatedCategories = await prisma.leadCategory.findMany();
    console.log('Categories in DB now:', updatedCategories.map(c => `${c.label} (${c.name})`));

    const domainCounts = await prisma.lead.groupBy({ by: ['domain'], _count: { id: true } });
    console.log('Domain breakdown in Leads:', domainCounts);

    const categoryCounts = await prisma.lead.groupBy({ by: ['category'], _count: { id: true } });
    console.log('Category breakdown in Leads:', categoryCounts);

    const remainingEmailOnly = await prisma.lead.count({ where: { phone: 'Email Only' } });
    console.log('Remaining Email Only phones:', remainingEmailOnly);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
