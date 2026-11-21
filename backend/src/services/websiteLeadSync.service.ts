import prisma from '../utils/prisma';
import { autoAssignLead } from './assignment.service';

export interface WebsiteLeadSyncResult {
  totalInquiries: number;
  newlySynced: number;
  alreadySynced: number;
  skippedNewsletter: number;
}

/**
 * Synchronizes website inquiries from `Inquiries` table into CRM `Lead` table.
 * All non-newsletter inquiries become active CRM leads with source='website'.
 */
export const syncWebsiteInquiriesToLeads = async (
  autoAssignNewLeads: boolean = false,
  includeNewsletter: boolean = true
): Promise<WebsiteLeadSyncResult> => {
  try {
    // 1. Fetch all valid website inquiries (excluding soft-deleted)
    const inquiries: any[] = await prisma.$queryRawUnsafe(
      'SELECT * FROM `Inquiries` WHERE `deletedAt` IS NULL ORDER BY `id` ASC'
    );

    // 2. Fetch existing synced website leads into a fast lookup Set
    const existingLeads = await prisma.lead.findMany({
      where: {
        leadgenId: {
          startsWith: 'website_',
        },
      },
      select: {
        leadgenId: true,
      },
    });

    const existingLeadgenSet = new Set<string>(
      existingLeads.map((l) => l.leadgenId!).filter(Boolean)
    );

    let newlySynced = 0;
    let alreadySynced = 0;
    let skippedNewsletter = 0;

    for (const inq of inquiries) {
      const inqType = (inq.type || 'inquiry').trim();

      // Optionally skip newsletters if requested
      if (inqType.toLowerCase() === 'newsletter' && !includeNewsletter) {
        skippedNewsletter++;
        continue;
      }

      const leadgenId = `website_${inq.id}`;

      if (existingLeadgenSet.has(leadgenId)) {
        alreadySynced++;
        continue;
      }

      const nameStr = (inq.name || '').trim();
      const contactForStr = (inq.contactFor || '').trim();
      const emailStr = (inq.email || '').trim();
      const phoneStr = (inq.phone || '').trim();
      const messageStr = (inq.message || '').trim();

      // Clean field calculations
      const fullName =
        nameStr ||
        contactForStr ||
        (emailStr ? emailStr.split('@')[0] : (inqType.toLowerCase() === 'newsletter' ? 'Newsletter Subscriber' : 'Website Visitor'));

      // Extract real phone number: check direct phone, search contactFor & message, or match Users table
      let phone = phoneStr;
      if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
        const textToSearch = `${contactForStr} ${messageStr}`;
        const match = textToSearch.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/) || textToSearch.match(/\b([6-9]\d{9})\b/);
        if (match && match[1]) {
          phone = match[1];
        }
      }
      if (!phone && emailStr) {
        const u = await prisma.user.findFirst({
          where: { email: emailStr, phone: { not: null } },
          select: { phone: true }
        }).catch(() => null);
        if (u?.phone && u.phone.replace(/[^0-9]/g, '').length >= 10) {
          phone = u.phone.replace(/[^0-9]/g, '').slice(-10);
        }
      }
      if (!phone) {
        phone = 'Not Provided';
      }

      const email = emailStr || null;
      const companyName = contactForStr || null;

      let campaignName = 'Website Inquiry';
      if (inqType === 'contactUs') campaignName = 'Website Contact Form';
      else if (inqType === 'exhibitor-inquiry') campaignName = 'Website Exhibitor Query';
      else if (inqType === 'inquiry') campaignName = 'Website General Query';
      else if (inqType.toLowerCase() === 'newsletter') campaignName = 'Website Newsletter Subscriber';

      const priority = inqType === 'exhibitor-inquiry' ? 'high' : (inqType.toLowerCase() === 'newsletter' ? 'low' : 'medium');

      // Category: one of the 4 ('subscription', 'advertisement', 'expo-stall', 'social-media-promotion')
      let category = 'subscription';
      const lowerFull = `${contactForStr} ${messageStr}`.toLowerCase();
      if (inqType === 'exhibitor-inquiry' || lowerFull.includes('stall') || lowerFull.includes('booth') || lowerFull.includes('exhibit')) {
        category = 'expo-stall';
      } else if (lowerFull.includes('ad') || lowerFull.includes('advertis') || lowerFull.includes('banner')) {
        category = 'advertisement';
      } else if (lowerFull.includes('social') || lowerFull.includes('media') || lowerFull.includes('instagram') || lowerFull.includes('facebook')) {
        category = 'social-media-promotion';
      }

      // Domain: one of the 4 ('Agarbatti & Perfume Expo', 'Soap & Detergent Expo', 'India Stone & Tech Expo', 'India FMCG Show')
      let domain = 'Agarbatti & Perfume Expo';
      if (lowerFull.includes('soap') || lowerFull.includes('detergent')) {
        domain = 'Soap & Detergent Expo';
      } else if (lowerFull.includes('stone') || lowerFull.includes('granite') || lowerFull.includes('marble')) {
        domain = 'India Stone & Tech Expo';
      } else if (lowerFull.includes('fmcg') || lowerFull.includes('grocery')) {
        domain = 'India FMCG Show';
      }

      let notes = `[Website ${inqType} #${inq.id}]\n`;
      if (contactForStr) notes += `Subject / Company: ${contactForStr}\n`;
      if (messageStr) notes += `Message: ${messageStr}\n`;

      const createdAt = inq.createdAt ? new Date(inq.createdAt) : new Date();

      try {
        const created = await prisma.lead.create({
          data: {
            fullName: fullName.slice(0, 190),
            phone: phone.slice(0, 50),
            email: email ? email.slice(0, 190) : null,
            companyName: companyName ? companyName.slice(0, 190) : null,
            source: 'website',
            campaign: campaignName.slice(0, 190),
            status: 'new',
            priority,
            category,
            domain,
            interestedService: (contactForStr || inqType).slice(0, 190),
            leadgenId,
            notes,
            createdAt,
            updatedAt: createdAt,
          },
        });

        existingLeadgenSet.add(leadgenId);
        newlySynced++;

        // If auto-assignment is enabled, attempt auto-assigning lead
        if (autoAssignNewLeads) {
          try {
            await autoAssignLead(created.id);
          } catch (assignErr) {
            console.warn(`[Website Lead Sync] Auto-assign warning for lead ${created.id}:`, assignErr);
          }
        }
      } catch (err: any) {
        console.warn(`[Website Lead Sync] Failed to sync inquiry #${inq.id}:`, err?.message);
      }
    }

    return {
      totalInquiries: inquiries.length,
      newlySynced,
      alreadySynced,
      skippedNewsletter,
    };
  } catch (error: any) {
    console.error('[Website Lead Sync] Error during sync:', error);
    throw error;
  }
};

/**
 * Creates a website inquiry in `Inquiries` and immediately creates a corresponding CRM `Lead`.
 */
export const createInquiryWithLead = async (data: {
  name?: string;
  email?: string;
  phone?: string;
  type?: string;
  contactFor?: string;
  message?: string;
}) => {
  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const type = (data.type || 'contactUs').trim();
  const contactFor = (data.contactFor || '').trim();
  const message = (data.message || '').trim();

  // 1. Insert into Inquiries table
  await prisma.$executeRawUnsafe(
    'INSERT INTO `Inquiries` (`name`, `email`, `phone`, `type`, `contactFor`, `message`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
    name || null,
    email || null,
    phone || null,
    type,
    contactFor || null,
    message || null
  );

  // Retrieve inserted inquiry
  const inserted: any[] = await prisma.$queryRawUnsafe(
    'SELECT * FROM `Inquiries` WHERE `type` = ? ORDER BY `id` DESC LIMIT 1',
    type
  );
  const inquiry = inserted[0] || null;

  let createdLead = null;

  // 2. If not a newsletter, create a CRM Lead immediately
  if (inquiry && type.toLowerCase() !== 'newsletter') {
    const fullName = name || contactFor || (email ? email.split('@')[0] : 'Website Visitor');
    let leadPhone = phone;
    if (!leadPhone || leadPhone.replace(/[^0-9]/g, '').length < 10) {
      const match = `${contactFor || ''} ${message || ''}`.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/) || `${contactFor || ''} ${message || ''}`.match(/\b([6-9]\d{9})\b/);
      if (match && match[1]) leadPhone = match[1];
    }
    if (!leadPhone && email) {
      const u = await prisma.user.findFirst({
        where: { email, phone: { not: null } },
        select: { phone: true }
      }).catch(() => null);
      if (u?.phone && u.phone.replace(/[^0-9]/g, '').length >= 10) {
        leadPhone = u.phone.replace(/[^0-9]/g, '').slice(-10);
      }
    }
    if (!leadPhone) leadPhone = 'Not Provided';

    const leadgenId = `website_${inquiry.id}`;

    let campaignName = 'Website Inquiry';
    if (type === 'contactUs') campaignName = 'Website Contact Form';
    else if (type === 'exhibitor-inquiry') campaignName = 'Website Exhibitor Query';
    else if (type === 'inquiry') campaignName = 'Website General Query';

    const lowerFull = `${contactFor || ''} ${message || ''}`.toLowerCase();
    let category = 'subscription';
    if (type === 'exhibitor-inquiry' || lowerFull.includes('stall') || lowerFull.includes('booth') || lowerFull.includes('exhibit')) {
      category = 'expo-stall';
    } else if (lowerFull.includes('ad') || lowerFull.includes('advertis') || lowerFull.includes('banner')) {
      category = 'advertisement';
    } else if (lowerFull.includes('social') || lowerFull.includes('media') || lowerFull.includes('instagram') || lowerFull.includes('facebook')) {
      category = 'social-media-promotion';
    }

    let domain = 'Agarbatti & Perfume Expo';
    if (lowerFull.includes('soap') || lowerFull.includes('detergent')) {
      domain = 'Soap & Detergent Expo';
    } else if (lowerFull.includes('stone') || lowerFull.includes('granite') || lowerFull.includes('marble')) {
      domain = 'India Stone & Tech Expo';
    } else if (lowerFull.includes('fmcg') || lowerFull.includes('grocery')) {
      domain = 'India FMCG Show';
    }

    let notes = `[Website ${type} #${inquiry.id}]\n`;
    if (contactFor) notes += `Subject / Company: ${contactFor}\n`;
    if (message) notes += `Message: ${message}\n`;

    try {
      createdLead = await prisma.lead.create({
        data: {
          fullName: fullName.slice(0, 190),
          phone: leadPhone.slice(0, 50),
          email: email ? email.slice(0, 190) : null,
          companyName: contactFor ? contactFor.slice(0, 190) : null,
          source: 'website',
          campaign: campaignName.slice(0, 190),
          status: 'new',
          priority: type === 'exhibitor-inquiry' ? 'high' : 'medium',
          category,
          domain,
          interestedService: (contactFor || type).slice(0, 190),
          leadgenId,
          notes,
        },
      });

      // Auto-assign lead if possible
      try {
        await autoAssignLead(createdLead.id);
      } catch (assignErr) {
        console.warn('[Website Lead Sync] Auto-assign warning for new inquiry lead:', assignErr);
      }
    } catch (leadErr: any) {
      console.warn('[Website Lead Sync] Warning creating CRM lead for inquiry:', leadErr?.message);
    }
  }

  return {
    inquiry,
    lead: createdLead,
  };
};
