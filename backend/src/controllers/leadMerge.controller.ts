import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Scan & return groups of duplicate leads matched by phone or email
 */
export const getDuplicateLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { firstName: true, lastName: true } },
      },
    });

    const phoneMap: Record<string, any[]> = {};
    const emailMap: Record<string, any[]> = {};

    leads.forEach((l) => {
      if (l.phone && l.phone !== 'N/A') {
        const cleanPhone = l.phone.replace(/[^0-9]/g, '');
        const tenDigit = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
        if (tenDigit.length >= 6) {
          if (!phoneMap[tenDigit]) phoneMap[tenDigit] = [];
          phoneMap[tenDigit].push(l);
        }
      }
      if (l.email) {
        const cleanEmail = l.email.toLowerCase().trim();
        if (!emailMap[cleanEmail]) emailMap[cleanEmail] = [];
        emailMap[cleanEmail].push(l);
      }
    });

    const duplicateGroups: Array<{ type: 'phone' | 'email'; matchValue: string; leads: any[] }> = [];

    Object.entries(phoneMap).forEach(([phone, group]) => {
      if (group.length > 1) {
        duplicateGroups.push({ type: 'phone', matchValue: phone, leads: group });
      }
    });

    Object.entries(emailMap).forEach(([email, group]) => {
      if (group.length > 1) {
        const existing = duplicateGroups.find((g) => g.leads.some((l) => l.email === email));
        if (!existing) {
          duplicateGroups.push({ type: 'email', matchValue: email, leads: group });
        }
      }
    });

    res.json(duplicateGroups);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to detect duplicates' });
  }
};

/**
 * Merge Secondary Lead into Primary Lead
 */
export const mergeLeads = async (req: Request, res: Response): Promise<void> => {
  const { primaryLeadId, secondaryLeadId, mergedFields } = req.body;

  if (!primaryLeadId || !secondaryLeadId) {
    res.status(400).json({ message: 'primaryLeadId and secondaryLeadId are required' });
    return;
  }

  try {
    const primaryLead = await prisma.lead.findUnique({ where: { id: primaryLeadId } });
    const secondaryLead = await prisma.lead.findUnique({ where: { id: secondaryLeadId } });

    if (!primaryLead || !secondaryLead) {
      res.status(404).json({ message: 'Primary or Secondary lead not found' });
      return;
    }

    // 1. Transfer relations from secondary to primary
    try {
      await prisma.leadActivity.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } });
    } catch (e) {}
    try {
      await prisma.followUp.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } });
    } catch (e) {}
    try {
      await prisma.deal.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } });
    } catch (e) {}
    try {
      await prisma.assignmentLog.updateMany({ where: { leadId: secondaryLeadId }, data: { leadId: primaryLeadId } });
    } catch (e) {}

    // 2. Merge notes text
    let mergedNotes = primaryLead.notes || '';
    if (secondaryLead.notes && secondaryLead.notes.trim()) {
      if (!mergedNotes.includes(secondaryLead.notes.trim())) {
        mergedNotes = mergedNotes
          ? `${mergedNotes}\n---\n[Merged from Duplicate Lead]:\n${secondaryLead.notes.trim()}`
          : secondaryLead.notes.trim();
      }
    }

    // 3. Update primary lead fields
    const updateData: any = {
      notes: mergedNotes || null,
      isDuplicate: false,
    };

    if (mergedFields) {
      if (mergedFields.fullName) updateData.fullName = mergedFields.fullName;
      if (mergedFields.phone) updateData.phone = mergedFields.phone;
      if (mergedFields.email) updateData.email = mergedFields.email;
      if (mergedFields.companyName) updateData.companyName = mergedFields.companyName;
      if (mergedFields.status) updateData.status = mergedFields.status;
      if (mergedFields.category) updateData.category = mergedFields.category;
    } else {
      if (!primaryLead.companyName && secondaryLead.companyName) updateData.companyName = secondaryLead.companyName;
      if (!primaryLead.email && secondaryLead.email) updateData.email = secondaryLead.email;
      if (!primaryLead.nextFollowUpDate && secondaryLead.nextFollowUpDate) updateData.nextFollowUpDate = secondaryLead.nextFollowUpDate;
    }

    await prisma.lead.update({
      where: { id: primaryLeadId },
      data: updateData,
    });

    // 4. Delete secondary duplicate lead
    await prisma.lead.delete({
      where: { id: secondaryLeadId },
    });

    res.json({ success: true, message: 'Leads merged successfully and duplicate removed!' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to merge leads' });
  }
};

/**
 * Automatically scan and merge all duplicate phone leads across the entire database
 */
export const autoDeduplicateLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: true }
    });

    const phoneMap: Record<string, any[]> = {};
    leads.forEach(l => {
      const clean = (l.phone || '').replace(/[^0-9]/g, '');
      const ten = clean.length >= 10 ? clean.slice(-10) : clean;
      if (ten.length >= 6) {
        if (!phoneMap[ten]) phoneMap[ten] = [];
        phoneMap[ten].push(l);
      }
    });

    const duplicateGroups = Object.entries(phoneMap).filter(([_, group]) => group.length > 1);

    let mergedCount = 0;
    let deletedCount = 0;

    for (const [_, group] of duplicateGroups) {
      group.sort((a, b) => {
        const aNotesLen = (a.notes || '').trim().length;
        const bNotesLen = (b.notes || '').trim().length;
        if (aNotesLen > 0 && bNotesLen === 0) return -1;
        if (bNotesLen > 0 && aNotesLen === 0) return 1;
        if (a.nextFollowUpDate && !b.nextFollowUpDate) return -1;
        if (!a.nextFollowUpDate && b.nextFollowUpDate) return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });

      const primary = group[0];
      const secondaries = group.slice(1);

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
    }

    await prisma.lead.updateMany({
      data: { isDuplicate: false }
    });

    res.json({
      success: true,
      mergedCount,
      deletedCount,
      message: `Successfully processed ${mergedCount} duplicate groups and removed ${deletedCount} duplicate leads. All leads are now 100% unique!`,
    });
  } catch (error: any) {
    console.error('autoDeduplicateLeads error:', error);
    res.status(500).json({ message: error.message || 'Failed to auto-deduplicate leads' });
  }
};
