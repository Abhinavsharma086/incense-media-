
export const findDuplicateLeadInDb = async (prismaClient: any, params: {
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
  companyName?: string | null;
  excludeId?: string | null;
}) => {
  const rawPhone = String(params.phone || '').trim();
  const rawEmail = String(params.email || '').trim().toLowerCase();
  const cleanName = String(params.fullName || '').trim();
  const cleanCompany = String(params.companyName || '').trim();
  const excludeId = params.excludeId ? String(params.excludeId).trim() : null;

  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const phoneMatchKey = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : (cleanPhone.length >= 6 ? cleanPhone : '');

  const orConditions: any[] = [];

  if (rawPhone && rawPhone.length >= 5) {
    orConditions.push({ phone: rawPhone });
  }
  if (phoneMatchKey) {
    orConditions.push({ phone: { endsWith: phoneMatchKey } });
  }
  if (rawEmail && rawEmail.includes('@') && !['null', 'undefined', 'n/a', 'na', 'none', 'email@gmail.com', 'test@test.com'].includes(rawEmail)) {
    orConditions.push({ email: rawEmail });
  }
  if (cleanName.length >= 3 && cleanCompany.length >= 3) {
    orConditions.push({
      AND: [
        { fullName: cleanName },
        { companyName: cleanCompany },
      ]
    });
  }

  if (orConditions.length === 0) return null;

  const whereClause: any = { OR: orConditions };
  if (excludeId) {
    whereClause.id = { not: excludeId };
  }

  const existing = await prismaClient.lead.findFirst({
    where: whereClause,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      unit: { select: { id: true, name: true } },
    }
  });

  if (!existing) return null;

  let matchType = 'phone';
  let reason = `Phone number "${rawPhone || existing.phone}" already exists in CRM`;
  const existingCleanPhone = (existing.phone || '').replace(/[^0-9]/g, '');
  const existingPhoneKey = existingCleanPhone.length >= 10 ? existingCleanPhone.slice(-10) : existingCleanPhone;

  if (phoneMatchKey && existingPhoneKey && (existingPhoneKey === phoneMatchKey || existingCleanPhone.endsWith(phoneMatchKey) || phoneMatchKey.endsWith(existingPhoneKey))) {
    matchType = 'phone';
    reason = `Mobile / Phone "${rawPhone}" is already registered`;
  } else if (rawEmail && existing.email && existing.email.toLowerCase() === rawEmail) {
    matchType = 'email';
    reason = `Email address "${rawEmail}" is already registered`;
  } else if (cleanName && cleanCompany && existing.fullName?.toLowerCase() === cleanName.toLowerCase() && existing.companyName?.toLowerCase() === cleanCompany.toLowerCase()) {
    matchType = 'name_and_company';
    reason = `Full Name "${cleanName}" and Company "${cleanCompany}" already exist in CRM`;
  } else if (cleanCompany && rawPhone && existing.companyName?.toLowerCase() === cleanCompany.toLowerCase()) {
    matchType = 'company_and_phone';
    reason = `Company "${cleanCompany}" with Phone "${rawPhone}" already exists in CRM`;
  }

  const ownerName = existing.owner
    ? `${existing.owner.firstName || ''} ${existing.owner.lastName || ''}`.trim() || existing.owner.email
    : 'Unassigned';

  return {
    existing,
    matchType,
    reason,
    ownerName,
  };
};

import { Request, Response } from 'express';

import prisma from '../utils/prisma';



export const getLeads = async (req: Request, res: Response): Promise<void> => {

  try {

    const user = (req as any).user;

    const whereClause: any = {};



    const adminRoles = ['Super Admin', 'Admin', 'Sales Manager'];

    const isEmployeeRole = user && !adminRoles.includes(user.roleName) && !user.isDevToken;



    // Strict Isolation: Only Sales Executives, Field Staff, Telecallers see their own leads unless viewing all

    if ((isEmployeeRole || req.query.myLeads === 'true') && req.query.all !== 'true') {
      if (user?.id && !user.isDevToken && user.id !== 'legacy-user') {
        whereClause.ownerId = user.id;
      } else if (req.query.employeeId) {
        whereClause.ownerId = String(req.query.employeeId);
      } else if (user?.id) {
        whereClause.ownerId = user.id;
      } else {
        res.json([]);
        return;
      }
    } else if (req.query.employeeId) {

      whereClause.ownerId = String(req.query.employeeId);

    } else if (req.query.unassigned === 'true') {

      whereClause.ownerId = null;

    }



    if (req.query.source && req.query.source !== 'all') {
      whereClause.source = String(req.query.source);
    }

    if (req.query.category && req.query.category !== 'all') {
      whereClause.category = String(req.query.category).toLowerCase();
    }

    if (req.query.domain && req.query.domain !== 'all') {
      whereClause.domain = String(req.query.domain);
    }



    const leads = await prisma.lead.findMany({

      where: whereClause,

      orderBy: { createdAt: 'desc' },

      include: {

        owner: { select: { id: true, firstName: true, lastName: true, email: true } },

        unit: { select: { id: true, name: true } },

      }

    });

    // Safeguard Deduplication: Ensure only 1 consolidated record per 10-digit phone is returned
    const seenPhoneSet = new Set<string>();
    const uniqueLeads = leads.filter(l => {
      const clean = (l.phone || '').replace(/[^0-9]/g, '');
      const ten = clean.length >= 10 ? clean.slice(-10) : clean;
      if (ten.length >= 6) {
        if (seenPhoneSet.has(ten)) return false;
        seenPhoneSet.add(ten);
      }
      return true;
    });

    res.json(uniqueLeads);

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: 'Server error' });

  }

};



export const createLead = async (req: Request, res: Response): Promise<void> => {

  try {

    const b = req.body;

    const fullName = b.fullName || b.full_name;

    const phone = b.phone;

    const email = b.email;

    const companyName = b.companyName || b.company_name;

    const website = b.website;

    const city = b.city;

    const industry = b.industry;

    const source = b.source;

    const campaign = b.campaign;

    const status = b.status || b.stage;

    const priority = b.priority;

    const interestedService = b.interestedService || b.interested_service || b.interested_services;

    const budget = b.budget;

    const dealValue = b.dealValue !== undefined ? b.dealValue : b.deal_value;

    const notes = b.notes;

    const ownerId = b.ownerId || b.owner_id || b.assigned_to;

    const nextFollowUpDate = b.nextFollowUpDate || b.next_follow_up_date;

    const leadScore = b.leadScore !== undefined ? b.leadScore : b.lead_score;



    if (!fullName || !phone) {

      res.status(400).json({ message: 'Full name and phone number are required.' });

      return;

    }



    const duplicate = await findDuplicateLeadInDb(prisma, {
      phone,
      email,
      fullName,
      companyName
    });

    if (duplicate && !b.allowDuplicate) {
      res.status(409).json({
        status: 'error',
        isDuplicate: true,
        denied: true,
        message: `Duplicate lead denied! ${duplicate.reason}. Existing lead: "${duplicate.existing.fullName}" (${duplicate.existing.companyName || 'No Company'}), currently assigned to: ${duplicate.ownerName}. Check "Allow duplicate" to proceed.`,
        duplicateType: duplicate.matchType,
        existingLead: {
          id: duplicate.existing.id,
          fullName: duplicate.existing.fullName,
          phone: duplicate.existing.phone,
          email: duplicate.existing.email,
          companyName: duplicate.existing.companyName,
          category: duplicate.existing.category,
          status: duplicate.existing.status,
          ownerName: duplicate.ownerName,
          ownerId: duplicate.existing.ownerId,
          createdAt: duplicate.existing.createdAt,
        }
      });
      return;
    }



    const dataToCreate: any = {

      fullName: String(fullName).trim(),

      phone: String(phone).trim(),

      isDuplicate: Boolean(duplicate),

      duplicateFlaggedAt: duplicate ? new Date() : null,

      email: email && String(email).trim() !== '' ? String(email).trim() : null,

      companyName: companyName ? String(companyName).trim() : null,

      website: website ? String(website).trim() : null,

      city: city ? String(city).trim() : null,

      industry: industry ? String(industry).trim() : null,

      category: (b.category || b.interestedCategory || 'subscription').toLowerCase(),

      domain: b.domain && String(b.domain).trim() !== '' ? String(b.domain).trim() : 'Agarbatti & Perfume Expo',

      source: (() => {
        const s = source ? String(source).trim().toLowerCase() : 'manual';
        if (s === 'facebook' || s.includes('fb') || s.includes('facebook')) return 'facebook';
        if (s === 'instagram' || s.includes('insta') || s.includes('ig')) return 'instagram';
        if (s.includes('web') || s.includes('site') || s.includes('online') || s.includes('inquir')) return 'website';
        if (s.includes('excel') || s.includes('import') || s.includes('csv')) return 'import';
        if (s.includes('whats') || s.includes('wa')) return 'whatsapp';
        if (s.includes('expo') || s.includes('exhibit')) return 'expo';
        if (s.includes('google')) return 'google';
        if (s.includes('referral')) return 'referral';
        return 'manual';
      })(),

      campaign: campaign ? String(campaign) : null,

      status: status ? String(status) : 'new',

      priority: priority ? String(priority) : 'medium',

      interestedService: interestedService ? String(interestedService) : null,

      budget: budget ? String(budget) : null,

      dealValue: dealValue !== null && dealValue !== undefined && dealValue !== '' && !isNaN(Number(dealValue)) ? Number(dealValue) : null,

      notes: notes ? String(notes) : null,

      leadScore: leadScore !== null && leadScore !== undefined && !isNaN(parseInt(String(leadScore))) ? parseInt(String(leadScore)) : 0,

    };



    if (nextFollowUpDate && !isNaN(Date.parse(String(nextFollowUpDate)))) {

      dataToCreate.nextFollowUpDate = new Date(nextFollowUpDate);

    }



    const currentUser = (req as any).user;

    if (!ownerId && currentUser && !['Super Admin', 'Admin'].includes(currentUser.roleName) && currentUser.id) {

      dataToCreate.ownerId = currentUser.id;

    }



    if (ownerId && String(ownerId).trim() !== '') {

      const trimmedOwner = String(ownerId).trim();

      const userExists = await prisma.user.findUnique({ where: { id: trimmedOwner } });

      if (userExists) {

        dataToCreate.ownerId = userExists.id;

      } else {

        // If ownerId is passed as employee name (e.g. from Kanban "Rahul Sharma")

        const nameParts = trimmedOwner.split(' ');

        const matchedUser = await prisma.user.findFirst({

          where: {

            OR: [

              { firstName: { contains: nameParts[0] } },

              { lastName: { contains: nameParts[nameParts.length - 1] } }

            ]

          }

        });

        if (matchedUser) {

          dataToCreate.ownerId = matchedUser.id;

        } else {

          const fallback = await prisma.user.findFirst({ where: { isActive: true } });

          if (fallback) dataToCreate.ownerId = fallback.id;

        }

      }

    }



    const lead = await prisma.lead.create({

      data: dataToCreate

    });



    // If no owner was explicitly assigned, trigger auto-assignment rule

    if (!dataToCreate.ownerId) {

      try {

        const { autoAssignLead } = await import('../services/assignment.service');

        await autoAssignLead(lead.id);

      } catch (autoErr) {

        console.error('Auto-assignment on lead creation warning:', autoErr);

      }

    }



    const refreshedLead = await prisma.lead.findUnique({

      where: { id: lead.id },

      include: { owner: { select: { firstName: true, lastName: true } }, unit: { select: { name: true } } },

    });



    res.status(201).json(refreshedLead || lead);

  } catch (error: any) {

    console.error('Error creating lead:', error);

    res.status(500).json({ message: error?.message || 'Failed to create lead' });

  }

};



export const updateLead = async (req: Request, res: Response): Promise<void> => {

  try {

    const { id } = (req.params as any);

    const b = req.body;

    const dataToUpdate: any = {};



    const existingLead = await prisma.lead.findUnique({

      where: { id },

      select: { id: true, status: true, phone: true, email: true, ownerId: true },

    });



    if (!existingLead) {

      res.status(404).json({ message: 'Lead not found' });

      return;

    }



    const fullName = b.fullName !== undefined ? b.fullName : (b.full_name !== undefined ? b.full_name : b.name);

    if (fullName !== undefined && String(fullName).trim() !== '') {

      dataToUpdate.fullName = String(fullName).trim();

    }



    const phoneVal = b.phone !== undefined ? b.phone : (b.mobile !== undefined ? b.mobile : (b.mobileNo !== undefined ? b.mobileNo : b.contact));

    if (phoneVal !== undefined) {
      const trimmedPhone = String(phoneVal).trim();
      const isInvalidPhone = !trimmedPhone || ['null', 'undefined', 'n/a', 'not provided', 'email only'].includes(trimmedPhone.toLowerCase());

      // Safeguard: Never overwrite existing valid phone numbers with NULL, empty, or placeholder values
      if (!isInvalidPhone) {
        dataToUpdate.phone = trimmedPhone;

        // Duplicate phone check on update if phone changed
        if (dataToUpdate.phone !== existingLead.phone) {
          const cleanPhone = dataToUpdate.phone.replace(/[^0-9]/g, '');
          const matchKey = cleanPhone.length >= 6 ? cleanPhone.slice(-10) : cleanPhone;

          const otherDuplicate = await prisma.lead.findFirst({
            where: {
              id: { not: id },
              OR: [
                { phone: dataToUpdate.phone },
                ...(matchKey ? [{ phone: { endsWith: matchKey } }] : [])
              ]
            },
            include: { owner: { select: { firstName: true, lastName: true } } }
          });

          if (otherDuplicate && !b.allowDuplicate && req.query.force !== 'true') {
            res.status(409).json({
              message: `Duplicate Mobile Number: "${dataToUpdate.phone}" is already used by lead "${otherDuplicate.fullName}" (Status: ${otherDuplicate.status.toUpperCase()}, Owner: ${otherDuplicate.owner ? otherDuplicate.owner.firstName : 'Unassigned'}).`,
              isDuplicate: true,
              existingLead: otherDuplicate
            });
            return;
          }
        }
      }
    }



    if (b.email !== undefined) {

      dataToUpdate.email = b.email && String(b.email).trim() !== '' ? String(b.email).trim() : null;

    }



    const companyName = b.companyName !== undefined ? b.companyName : (b.company_name !== undefined ? b.company_name : b.company);

    if (companyName !== undefined) {

      dataToUpdate.companyName = companyName && String(companyName).trim() !== '' ? String(companyName).trim() : null;

    }



    if (b.website !== undefined) dataToUpdate.website = b.website ? String(b.website).trim() : null;

    if (b.city !== undefined) dataToUpdate.city = b.city ? String(b.city).trim() : null;

    if (b.industry !== undefined) dataToUpdate.industry = b.industry ? String(b.industry).trim() : null;

    if (b.source !== undefined && String(b.source).trim() !== '') {
      const rawS = String(b.source).trim().toLowerCase();
      if (rawS === 'facebook' || rawS.includes('facebook') || rawS === 'fb') dataToUpdate.source = 'facebook';
      else if (rawS === 'instagram' || rawS.includes('instagram') || rawS === 'ig') dataToUpdate.source = 'instagram';
      else if (rawS.includes('web') || rawS.includes('site') || rawS.includes('inquir')) dataToUpdate.source = 'website';
      else dataToUpdate.source = rawS;
    }

    if (b.campaign !== undefined) dataToUpdate.campaign = b.campaign ? String(b.campaign).trim() : null;

    if (b.category !== undefined && String(b.category).trim() !== '') {
      dataToUpdate.category = String(b.category).trim().toLowerCase();
    }

    if (b.domain !== undefined) {
      dataToUpdate.domain = b.domain && String(b.domain).trim() !== '' ? String(b.domain).trim() : null;
    }



    const newStatus = b.status !== undefined ? b.status : b.stage;

    if (newStatus !== undefined && String(newStatus).trim() !== '') {

      dataToUpdate.status = String(newStatus).trim().toLowerCase();

    }



    if (b.priority !== undefined && String(b.priority).trim() !== '') {

      dataToUpdate.priority = String(b.priority).trim().toLowerCase();

    }



    const interestedService = b.interestedService !== undefined ? b.interestedService : (b.interested_services !== undefined ? b.interested_services : b.interested_service);

    if (interestedService !== undefined) dataToUpdate.interestedService = interestedService ? String(interestedService).trim() : null;



    if (b.budget !== undefined) dataToUpdate.budget = b.budget;

    const dealValue = b.dealValue !== undefined ? b.dealValue : b.deal_value;

    if (dealValue !== undefined) {

      dataToUpdate.dealValue = dealValue !== null && dealValue !== '' && !isNaN(Number(dealValue)) ? Number(dealValue) : null;

    }



    const notesVal = b.notes !== undefined ? b.notes : (b.remark !== undefined ? b.remark : b.remarks);

    if (notesVal !== undefined) dataToUpdate.notes = notesVal;

    const leadScore = b.leadScore !== undefined ? b.leadScore : b.lead_score;

    if (leadScore !== undefined) {

      dataToUpdate.leadScore = leadScore !== null && !isNaN(parseInt(String(leadScore))) ? parseInt(String(leadScore)) : 0;

    }



    const rawOwner = b.ownerId !== undefined ? b.ownerId : (b.owner_id !== undefined ? b.owner_id : b.assigned_to);

    if (rawOwner !== undefined) {

      const sOwner = rawOwner ? String(rawOwner).trim() : '';

      if (!sOwner || sOwner === 'unassigned' || sOwner === 'None' || sOwner === 'null' || sOwner === 'undefined') {

        dataToUpdate.ownerId = null;

      } else {

        const userExists = await prisma.user.findUnique({ where: { id: sOwner } });

        if (userExists) {

          dataToUpdate.ownerId = sOwner;

        } else {

          console.warn(`[updateLead] ownerId ${sOwner} not found in User table, ignoring owner update`);

        }

      }

    }



    const unitId = b.unitId !== undefined ? b.unitId : b.unit_id;

    if (unitId !== undefined) {

      const sUnit = unitId ? String(unitId).trim() : '';

      dataToUpdate.unitId = sUnit && sUnit !== 'null' ? sUnit : null;

    }



    const nextFollowUpDate = b.nextFollowUpDate !== undefined ? b.nextFollowUpDate : b.next_follow_up_date;

    const currentFinalStatus = (dataToUpdate.status || existingLead.status || '').toLowerCase().trim();
    if (['converted', 'lost', 'won'].includes(currentFinalStatus)) {
      dataToUpdate.nextFollowUpDate = null;
    } else if (nextFollowUpDate !== undefined) {
      dataToUpdate.nextFollowUpDate = nextFollowUpDate && !isNaN(Date.parse(String(nextFollowUpDate))) ? new Date(nextFollowUpDate) : null;
    }



    const lead = await prisma.lead.update({

      where: { id },

      data: dataToUpdate,

      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true } }, unit: { select: { id: true, name: true } } },

    });



    // Log category change activity if changed

    if (dataToUpdate.category && dataToUpdate.category !== (existingLead as any).category) {

      try {

        await prisma.leadActivity.create({

          data: {

            leadId: id,

            type: 'note',

            description: `Category changed from "${(existingLead as any).category || 'General'}" to "${dataToUpdate.category}"`,

            userId: req.user?.id || null,

          },

        });

      } catch (_) { }

    }



    // Log status change activity if changed

    if (dataToUpdate.status && dataToUpdate.status !== existingLead.status) {

      try {

        await prisma.leadActivity.create({

          data: {

            leadId: id,

            type: 'status_change',

            description: `Status changed from "${existingLead.status}" to "${dataToUpdate.status}"`,

            userId: req.user?.id || null,

          },

        });

      } catch (actErr) {

        // Ignore activity logging failure

      }

    }



    res.json(lead);

  } catch (error: any) {

    console.error('Error updating lead:', error);

    res.status(500).json({ message: error?.message || 'Failed to update lead' });

  }

};



export const getLeadById = async (req: Request, res: Response): Promise<void> => {

  try {

    const { id } = (req.params as any);

    const lead = await prisma.lead.findUnique({

      where: { id },

      include: {

        owner: { select: { id: true, firstName: true, lastName: true, email: true } },

        unit: { select: { id: true, name: true } },

        activities: { orderBy: { createdAt: 'desc' } },

        followUps: { orderBy: { scheduledAt: 'asc' } },

        assignmentLogs: {

          orderBy: { timestamp: 'desc' },

          include: {

            fromEmployee: { select: { firstName: true, lastName: true } },

            toEmployee: { select: { firstName: true, lastName: true } },

            assignedBy: { select: { firstName: true, lastName: true } },

          },

        },

      }

    });

    if (!lead) {

      res.status(404).json({ message: 'Lead not found' });

      return;

    }



    // Enrich activities with user name and role if available

    if (lead.activities && lead.activities.length > 0) {

      const userIds = [...new Set(lead.activities.map(a => a.userId).filter(Boolean))] as string[];

      if (userIds.length > 0) {

        const users = await prisma.user.findMany({

          where: { id: { in: userIds } },

          select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } }

        });

        const userMap = new Map(users.map(u => [u.id, u]));

        (lead as any).activities = lead.activities.map(a => {

          const u = a.userId ? userMap.get(a.userId) : null;

          return {

            ...a,

            authorName: u ? (u.firstName + " " + u.lastName).trim() : (a.userId ? 'Team Member' : 'System'),

            authorRole: u?.role?.name || null

          };

        });

      }

    }



    res.json(lead);

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: 'Server error' });

  }

};



export const getLeadTimeline = async (req: Request, res: Response): Promise<void> => {

  try {

    const { id } = (req.params as any);

    const lead = await prisma.lead.findUnique({

      where: { id },

      select: {

        id: true,

        fullName: true,

        phone: true,

        email: true,

        companyName: true,

        status: true,

        source: true,

        category: true,

        priority: true,

        nextFollowUpDate: true,

        notes: true,

        ownerId: true,

        owner: { select: { id: true, firstName: true, lastName: true, email: true } },

        unit: { select: { id: true, name: true } },

        activities: { orderBy: { createdAt: 'desc' } },

        assignmentLogs: {

          orderBy: { timestamp: 'desc' },

          include: {

            fromEmployee: { select: { id: true, firstName: true, lastName: true } },

            toEmployee: { select: { id: true, firstName: true, lastName: true } },

            assignedBy: { select: { id: true, firstName: true, lastName: true } },

          }

        }

      }

    });



    if (!lead) {

      res.status(404).json({ message: 'Lead not found' });

      return;

    }



    // Fetch author details for activities

    const userIds = [...new Set(lead.activities.map(a => a.userId).filter(Boolean))] as string[];

    const users = userIds.length > 0 ? await prisma.user.findMany({

      where: { id: { in: userIds } },

      select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } }

    }) : [];

    const userMap = new Map(users.map(u => [u.id, u]));



    const enrichedActivities = lead.activities.map(a => {

      const u = a.userId ? userMap.get(a.userId) : null;

      return {

        id: a.id,

        type: a.type,

        description: a.description,

        createdAt: a.createdAt,

        userId: a.userId,

        authorName: u ? (u.firstName + " " + u.lastName).trim() : (a.userId ? 'Team Member' : 'System'),

        authorRole: u?.role?.name || null

      };

    });



    // Combined timeline items sorted by date desc

    const timelineItems: any[] = [

      ...enrichedActivities.map(a => ({

        id: a.id,

        kind: 'activity',

        type: a.type,

        description: a.description,

        timestamp: a.createdAt,

        author: a.authorName,

        authorRole: a.authorRole,

      })),

      ...lead.assignmentLogs.map(log => ({

        id: log.id,

        kind: 'assignment',

        type: 'assignment',

        description: log.reason || (log.toEmployee ? ("Lead assigned to " + log.toEmployee.firstName + " " + log.toEmployee.lastName) : "Lead unassigned"),

        timestamp: log.timestamp,

        author: log.assignedBy ? (log.assignedBy.firstName + " " + log.assignedBy.lastName) : "System Engine",

        fromEmployee: log.fromEmployee ? (log.fromEmployee.firstName + " " + log.fromEmployee.lastName) : null,

        toEmployee: log.toEmployee ? (log.toEmployee.firstName + " " + log.toEmployee.lastName) : null,

      }))

    ];



    timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());



    res.json({

      lead: {

        id: lead.id,

        fullName: lead.fullName,

        phone: lead.phone,

        email: lead.email,

        companyName: lead.companyName,

        status: lead.status,

        source: lead.source,

        priority: lead.priority,

        nextFollowUpDate: lead.nextFollowUpDate,

        notes: lead.notes,

        owner: lead.owner,

        unit: lead.unit,

      },

      activities: enrichedActivities,

      assignmentLogs: lead.assignmentLogs,

      timeline: timelineItems,

    });

  } catch (error) {

    console.error('getLeadTimeline error:', error);

    res.status(500).json({ message: 'Server error' });

  }

};



export const addLeadActivity = async (req: Request, res: Response): Promise<void> => {

  try {

    const { id } = (req.params as any);

    const { type, description, status, nextFollowUpDate } = req.body;

    const userId = req.user?.id || null;



    if (!description || !String(description).trim()) {

      res.status(400).json({ message: 'Remark or description is required' });

      return;

    }



    const activity = await prisma.leadActivity.create({

      data: {

        leadId: id,

        type: type || 'remark',

        description: String(description).trim(),

        userId: userId

      }

    });



    const updateData: any = {};

    if (status && status !== 'keep_current') {

      updateData.status = String(status).trim().toLowerCase();

    }

    if (nextFollowUpDate) {

      const parsed = new Date(nextFollowUpDate);

      if (!isNaN(parsed.getTime())) {

        updateData.nextFollowUpDate = parsed;

      }

    }

    if (Object.keys(updateData).length > 0) {

      await prisma.lead.update({

        where: { id },

        data: updateData

      });

    }



    let authorName = 'System';

    let authorRole: string | null = null;

    if (userId) {

      const user = await prisma.user.findUnique({

        where: { id: userId },

        select: { firstName: true, lastName: true, role: { select: { name: true } } }

      });

      if (user) {

        authorName = (user.firstName + " " + user.lastName).trim();

        authorRole = user.role?.name || null;

      }

    }



    res.status(201).json({

      ...activity,

      authorName,

      authorRole,

      leadUpdates: updateData

    });

  } catch (error) {

    console.error('addLeadActivity error:', error);

    res.status(500).json({ message: 'Server error' });

  }

};



export const deleteLead = async (req: Request, res: Response): Promise<void> => {

  try {

    const { id } = (req.params as any);

    await prisma.lead.delete({

      where: { id }

    });

    res.json({ message: 'Lead deleted successfully' });

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: 'Server error' });

  }

};



export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {

  try {

    const totalLeads = await prisma.lead.count();

    const newLeads = await prisma.lead.count({ where: { status: 'new' } });

    const qualifiedLeads = await prisma.lead.count({ where: { status: 'contacted' } });

    const hotLeads = await prisma.lead.count({ where: { priority: 'high' } });

    const unassignedLeads = await prisma.lead.count({ where: { ownerId: null } });



    res.json({

      totalLeads,

      newLeads,

      qualifiedLeads,

      hotLeads,

      unassignedLeads,

      todaysFollowups: 0,

      overdueFollowups: 0,

      todaysMeetings: 0,

      proposalsSent: 0,

      dealsWon: await prisma.lead.count({ where: { status: 'converted' } }),

      pipelineValue: 0,

      revenue: 0,

      pendingPayments: 0

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: 'Server error' });

  }

};



// Lead Assignment Endpoints

export const autoAssignLeadHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { leadId } = req.body;

    if (!leadId) {

      res.status(400).json({ message: 'leadId is required' });

      return;

    }

    const { autoAssignLead } = await import('../services/assignment.service');

    const result = await autoAssignLead(leadId);

    res.json(result);

  } catch (error: any) {

    console.error('Error auto-assigning lead:', error);

    res.status(500).json({ message: error?.message || 'Failed to auto-assign lead' });

  }

};



export const manualAssignLeadHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { leadId, employeeId, reason } = req.body;

    if (!leadId || !employeeId) {

      res.status(400).json({ message: 'leadId and employeeId are required' });

      return;

    }

    const { manualAssignLead } = await import('../services/assignment.service');

    const result = await manualAssignLead(leadId, employeeId, req.user?.id, reason);

    res.json(result);

  } catch (error: any) {

    console.error('Error manually assigning lead:', error);

    res.status(500).json({ message: error?.message || 'Failed to assign lead' });

  }

};



export const bulkAssignLeadsHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { leadIds, employeeId, count, criteria } = req.body;

    if (!employeeId) {

      res.status(400).json({ message: 'employeeId is required' });

      return;

    }

    if ((!Array.isArray(leadIds) || leadIds.length === 0) && (!count || count <= 0)) {

      res.status(400).json({ message: 'Either leadIds array or count (quantity of leads) is required' });

      return;

    }

    const { bulkAssignLeads } = await import('../services/assignment.service');

    const result = await bulkAssignLeads(leadIds, employeeId, req.user?.id, count, criteria);

    res.json(result);

  } catch (error: any) {

    console.error('Error assigning multiple leads to employee:', error);

    res.status(500).json({ message: error?.message || 'Failed to assign leads' });

  }

};



export const distributeLeadsHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { leadIds, employeeIds, strategy } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {

      res.status(400).json({ message: 'leadIds array is required' });

      return;

    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {

      res.status(400).json({ message: 'employeeIds array is required' });

      return;

    }

    const { distributeLeads } = await import('../services/assignment.service');

    const result = await distributeLeads(leadIds, employeeIds, strategy || 'round_robin', req.user?.id);

    res.json(result);

  } catch (error: any) {

    console.error('Error distributing leads:', error);

    res.status(500).json({ message: error?.message || 'Failed to distribute leads' });

  }

};



export const assignLeadsBySerialOrQuantityHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { employeeId, quantity, startSerial, endSerial, filterCriteria } = req.body;

    if (!employeeId) {

      res.status(400).json({ message: 'employeeId is required' });

      return;

    }

    const { assignLeadsBySerialOrQuantity } = await import('../services/assignment.service');

    const result = await assignLeadsBySerialOrQuantity({

      employeeId,

      quantity: quantity ? Number(quantity) : undefined,

      startSerial: startSerial ? Number(startSerial) : 1,

      endSerial: endSerial ? Number(endSerial) : undefined,

      filterCriteria: filterCriteria || 'unassigned',

      assignedById: req.user?.id,

    });

    res.json(result);

  } catch (error: any) {

    console.error('Error in serial quantity assignment:', error);

    res.status(500).json({ message: error?.message || 'Failed to assign leads by serial/quantity' });

  }

};



export const reassignLeadHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { leadId, newEmployeeId, reason } = req.body;

    if (!leadId || !newEmployeeId) {

      res.status(400).json({ message: 'leadId and newEmployeeId are required' });

      return;

    }

    const { reassignLead } = await import('../services/assignment.service');

    const result = await reassignLead(leadId, newEmployeeId, req.user?.id, reason);

    res.json(result);

  } catch (error: any) {

    console.error('Error reassigning lead:', error);

    res.status(500).json({ message: error?.message || 'Failed to reassign lead' });

  }

};



export const getWorkloadsHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { getEmployeeWorkloads } = await import('../services/assignment.service');

    const workloads = await getEmployeeWorkloads();

    res.json(workloads);

  } catch (error: any) {

    console.error('Error fetching workloads:', error);

    res.status(500).json({ message: error?.message || 'Failed to fetch workloads' });

  }

};



export const getUnassignedLeadsHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { getUnassignedLeads } = await import('../services/assignment.service');

    const unassigned = await getUnassignedLeads();

    res.json(unassigned);

  } catch (error: any) {

    console.error('Error fetching unassigned leads:', error);

    res.status(500).json({ message: error?.message || 'Failed to fetch unassigned leads' });

  }

};



export const autoWaterfallAssignHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { employeeIds, chunkSize, filterCriteria, mode, targetCap } = req.body;

    const { autoWaterfallAssignLeads } = await import('../services/assignment.service');

    const result = await autoWaterfallAssignLeads({

      employeeIds,

      chunkSize: chunkSize ? Number(chunkSize) : 100,

      filterCriteria: filterCriteria || 'unassigned',

      mode: mode || 'waterfall',

      targetCap: targetCap ? Number(targetCap) : 100,

      assignedById: req.user?.id,

    });

    res.json(result);

  } catch (error: any) {

    console.error('Error in auto waterfall assignment:', error);

    res.status(500).json({ message: error?.message || 'Failed to auto distribute leads' });

  }

};







export const roundRobinWorkloadAssignHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { employeeIds, filterCriteria, maxTotalLeads } = req.body;

    const { roundRobinWorkloadAutoAssignAll } = await import('../services/assignment.service');

    const result = await roundRobinWorkloadAutoAssignAll({

      employeeIds,

      filterCriteria: filterCriteria || 'unassigned',

      maxTotalLeads: maxTotalLeads ? Number(maxTotalLeads) : undefined,

      assignedById: req.user?.id,

    });

    res.json(result);

  } catch (error: any) {

    console.error('Error in round-robin workload assignment:', error);

    res.status(500).json({ message: error?.message || 'Failed to auto-assign leads by round-robin & workload balance' });

  }

};



export const batchImportLeads = async (req: Request, res: Response): Promise<void> => {

  try {

    const { leads, defaultSource, ownerId } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {

      res.status(400).json({ message: 'No leads provided for import' });

      return;

    }



    const currentUser = (req as any).user;

    const targetOwnerId = ownerId || (currentUser && !['Super Admin', 'Admin'].includes(currentUser.roleName) ? currentUser.id : null);



    let createdCount = 0;

    let skippedCount = 0;

    let duplicatesSkipped = 0;

    const errors: any[] = [];

    const createdLeads: any[] = [];



    // Pre-fetch existing lead phones & details to prevent duplicate and assignment conflicts
    const existingLeadsList = await prisma.lead.findMany({
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        companyName: true,
        status: true,
        ownerId: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    const existingPhoneSet = new Set<string>();
    const existingEmailSet = new Set<string>();
    const existingNameCompanySet = new Set<string>();
    const existingLeadByPhone = new Map<string, any>();

    existingLeadsList.forEach(l => {
      const raw = (l.phone || '').trim();
      const clean = raw.replace(/[^0-9]/g, '');
      if (clean.length >= 6) {
        const p10 = clean.length >= 10 ? clean.slice(-10) : clean;
        existingPhoneSet.add(p10);
        existingLeadByPhone.set(p10, l);
      }
      if (raw) {
        existingPhoneSet.add(raw);
        existingLeadByPhone.set(raw, l);
      }
      if (l.email && l.email.includes('@')) {
        const em = l.email.trim().toLowerCase();
        existingEmailSet.add(em);
      }
      if (l.fullName && l.companyName && l.fullName.trim().length >= 3 && l.companyName.trim().length >= 3) {
        existingNameCompanySet.add(`${l.fullName.trim().toLowerCase()}_${l.companyName.trim().toLowerCase()}`);
      }
    });

    const seenInBatchSet = new Set<string>();
    const alreadyAssignedLeads: any[] = [];
    const skipDuplicates = req.body.skipDuplicates !== false;



    for (let i = 0; i < leads.length; i++) {

      const row = leads[i];

      const fullName = String(row.fullName || row.full_name || row.name || row['Full Name'] || row['Name'] || row['Client Name'] || '').trim();

      const rawPhone = String(row.phone || row.mobile || row.contact || row['Phone'] || row['Mobile'] || row['Contact Number'] || '').trim();

      const phone = rawPhone.replace(/[^0-9+]/g, '');



      if (!fullName || !phone) {

        skippedCount++;

        errors.push({ row: i + 1, reason: 'Missing Full Name or Phone number' });

        continue;

      }



      const cleanPhone = phone.replace(/[^0-9]/g, '');

      const phoneKey = cleanPhone.length >= 6 ? cleanPhone.slice(-10) : cleanPhone;

      const emailLower = (row.email || row['Email'] || '').trim().toLowerCase();
      const companyNameRaw = (row.companyName || row.company_name || row.company || row['Company'] || row['Company Name'] || '').trim();
      const nameCompanyKey = `${fullName.toLowerCase()}_${companyNameRaw.toLowerCase()}`;

      const matchedExisting = (phoneKey && existingLeadByPhone.get(phoneKey)) ||
        (rawPhone && existingLeadByPhone.get(rawPhone));

      if (skipDuplicates && (existingPhoneSet.has(phoneKey) || seenInBatchSet.has(phoneKey) || (emailLower && existingEmailSet.has(emailLower)) || (fullName.length >= 3 && companyNameRaw.length >= 3 && existingNameCompanySet.has(nameCompanyKey)))) {
        skippedCount++;
        duplicatesSkipped++;
        const ownerDisplayName = matchedExisting && matchedExisting.owner
          ? `${matchedExisting.owner.firstName || ''} ${matchedExisting.owner.lastName || ''}`.trim() || matchedExisting.owner.email
          : (matchedExisting ? 'Unassigned' : 'Existing in CRM');

        alreadyAssignedLeads.push({
          row: i + 1,
          name: fullName,
          phone: phone,
          email: emailLower || null,
          company: companyNameRaw || null,
          assignedTo: ownerDisplayName,
          assignedToId: matchedExisting?.ownerId || null,
          existingId: matchedExisting?.id || null,
          existingStatus: (matchedExisting?.status || 'new').toUpperCase(),
          reason: `Already in CRM (Assigned to: ${ownerDisplayName})`,
        });
        errors.push({ row: i + 1, reason: `Lead already exists in CRM (Assigned to ${ownerDisplayName})` });
        continue;
      }

      if (phoneKey) {

        seenInBatchSet.add(phoneKey);

        existingPhoneSet.add(phoneKey);

      }



      const email = (row.email || row['Email'] || '').trim() || null;

      const companyName = (row.companyName || row.company_name || row.company || row['Company'] || row['Company Name'] || '').trim() || null;

      const city = (row.city || row['City'] || '').trim() || null;

      const rawSrc = String(row.source || defaultSource || 'import').trim().toLowerCase();
      const source = rawSrc.includes('web') ? 'website' :
        rawSrc.includes('meta') ? 'meta' :
          rawSrc.includes('whats') ? 'whatsapp' :
            rawSrc.includes('expo') ? 'expo' :
              rawSrc.includes('manual') ? 'manual' : 'import';

      const category = (row.category || req.body.defaultCategory || 'publication').trim().toLowerCase();

      const status = (row.status || 'new').trim().toLowerCase();

      const priority = (row.priority || 'medium').trim().toLowerCase();

      const notes = (row.notes || row.remark || row.remarks || row['Notes'] || row['Remarks'] || '').trim() || null;

      const dealValue = row.dealValue || row.deal_value || row['Deal Value'] || null;



      try {

        const newLead = await prisma.lead.create({

          data: {

            fullName,

            phone,

            email,

            companyName,

            city,

            source,

            category,

            status,

            priority,

            notes,

            dealValue: dealValue && !isNaN(Number(dealValue)) ? Number(dealValue) : null,

            ownerId: targetOwnerId || null,

          }

        });



        try {

          await prisma.leadActivity.create({

            data: {

              leadId: newLead.id,

              type: 'note',

              description: `Lead imported via Excel/CSV by ${currentUser?.firstName || 'User'}`,

              userId: currentUser?.id || null,

            }

          });

        } catch (_) { }



        createdCount++;

        createdLeads.push(newLead);

      } catch (err: any) {

        skippedCount++;

        errors.push({ row: i + 1, reason: err.message || 'Database error' });

      }

    }



    if (!targetOwnerId && createdLeads.length > 0) {

      try {

        const { autoAssignLeadWorkflow } = await import('../services/assignment.service');

        for (const cl of createdLeads) {

          await autoAssignLeadWorkflow(cl.id);

        }

      } catch (workflowErr) {

        console.warn('Auto-assign workflow warning in batchImportLeads:', workflowErr);

      }

    }



    res.json({

      message: `Successfully imported ${createdCount} leads (${skippedCount} skipped)`,

      total: leads.length,

      createdCount,

      skippedCount,

      duplicatesSkipped,

      alreadyAssignedLeads,

      errors: errors.slice(0, 10),

      createdLeads,

    });

  } catch (error) {

    console.error('batchImportLeads error:', error);

    res.status(500).json({ message: 'Server error during batch import' });

  }

};



export const getLeadCategories = async (req: Request, res: Response): Promise<void> => {

  try {

    let categories = await (prisma as any).leadCategory.findMany({

      orderBy: { createdAt: 'asc' }

    });



    // If table is empty, seed standard default categories

    if (!categories || categories.length === 0) {

      const defaults = [
        { id: 'cat-sub', name: 'subscription', label: 'Subscription', icon: '📦', color: 'blue' },
        { id: 'cat-ad', name: 'advertisement', label: 'Advertisement', icon: '📢', color: 'emerald' },
        { id: 'cat-expo-stall', name: 'expo-stall', label: 'Expo Stall', icon: '🏛️', color: 'amber' },
        { id: 'cat-smp', name: 'social-media-promotion', label: 'Social Media Promotion', icon: '📱', color: 'purple' },
      ];

      for (const d of defaults) {

        await (prisma as any).leadCategory.upsert({

          where: { name: d.name },

          update: {},

          create: d,

        }).catch(() => { });

      }

      categories = await (prisma as any).leadCategory.findMany({

        orderBy: { createdAt: 'asc' }

      });

    }



    res.json({ success: true, data: categories });

  } catch (error) {

    console.error('getLeadCategories error:', error);

    res.status(500).json({ message: 'Server error retrieving categories' });

  }

};



export const createLeadCategory = async (req: Request, res: Response): Promise<void> => {

  try {

    const { label, name, icon, color } = req.body;

    if (!label || !String(label).trim()) {

      res.status(400).json({ message: 'Category name/label is required' });

      return;

    }



    const trimmedLabel = String(label).trim();

    const slug = (name && String(name).trim())

      ? String(name).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '')

      : trimmedLabel.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '');



    if (!slug) {

      res.status(400).json({ message: 'Invalid category name' });

      return;

    }



    // Check if category exists

    const existing = await (prisma as any).leadCategory.findUnique({

      where: { name: slug }

    });



    if (existing) {

      res.status(200).json({

        success: true,

        message: 'Category already exists',

        data: existing,

        alreadyExisted: true

      });

      return;

    }



    const currentUser = (req as any).user;

    const newCategory = await (prisma as any).leadCategory.create({

      data: {

        name: slug,

        label: trimmedLabel,

        icon: icon || '🏷️',

        color: color || 'purple',

        createdBy: currentUser?.firstName ? (currentUser.firstName + ' (' + (currentUser.roleName || 'User') + ')') : 'User'

      }

    });



    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory
    });
  } catch (error) {
    console.error('createLeadCategory error:', error);
    res.status(500).json({ message: 'Server error creating category' });
  }
};

export const updateLeadCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { label, name, icon, color } = req.body;

    if (!id) {
      res.status(400).json({ message: 'Category ID is required' });
      return;
    }

    const existing = await (prisma as any).leadCategory.findFirst({
      where: {
        OR: [
          { id: id },
          { name: id }
        ]
      }
    });

    if (!existing) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    const trimmedLabel = label ? String(label).trim() : existing.label;
    let newSlug = (name && String(name).trim())
      ? String(name).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '')
      : (label ? trimmedLabel.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)/g, '') : existing.name);

    // Check if new slug conflicts with another existing category
    if (newSlug && newSlug !== existing.name) {
      const conflict = await (prisma as any).leadCategory.findUnique({
        where: { name: newSlug }
      }).catch(() => null);
      if (conflict && conflict.id !== existing.id) {
        newSlug = existing.name; // Retain existing slug to preserve uniqueness
      }
    }

    const updated = await (prisma as any).leadCategory.update({
      where: { id: existing.id },
      data: {
        name: newSlug || existing.name,
        label: trimmedLabel,
        icon: icon !== undefined ? icon : existing.icon,
        color: color !== undefined ? color : existing.color,
      }
    });

    // Update category name in existing leads if changed
    if (existing.name !== updated.name) {
      await (prisma as any).lead.updateMany({
        where: { category: existing.name },
        data: { category: updated.name }
      }).catch(() => { });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('updateLeadCategory error:', error);
    res.status(500).json({ message: 'Server error updating category' });
  }
};

export const deleteLeadCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: 'Category ID is required' });
      return;
    }

    const existing = await (prisma as any).leadCategory.findFirst({
      where: {
        OR: [
          { id: id },
          { name: id }
        ]
      }
    });

    if (!existing) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    // Prevent deleting root fallback category
    if (existing.name === 'general' || existing.id === 'cat-gen') {
      res.status(400).json({ success: false, message: 'Default category "General" cannot be deleted.' });
      return;
    }

    await (prisma as any).leadCategory.delete({
      where: { id: existing.id }
    });

    // Fallback assigned leads to 'general'
    await (prisma as any).lead.updateMany({
      where: { category: existing.name },
      data: { category: 'general' }
    }).catch(() => { });

    res.json({
      success: true,
      message: `Category "${existing.label}" deleted successfully`
    });
  } catch (error) {
    console.error('deleteLeadCategory error:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
};







export const unassignAllLeadsHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { unassignAllLeads } = await import('../services/assignment.service');

    const result = await unassignAllLeads(req.user?.id);

    res.json(result);

  } catch (error: any) {

    console.error('Error unassigning all leads:', error);

    res.status(500).json({ success: false, message: error?.message || 'Failed to unassign leads' });

  }

};



export const distributeLeadsEquallyHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { employeeIds, maxTotalLeads } = req.body;

    const { distributeLeadsEqually } = await import('../services/assignment.service');

    const result = await distributeLeadsEqually({

      employeeIds,

      maxTotalLeads: maxTotalLeads ? Number(maxTotalLeads) : undefined,

      assignedById: req.user?.id,

    });

    res.json(result);

  } catch (error: any) {

    console.error('Error in equal lead distribution:', error);

    res.status(500).json({ success: false, message: error?.message || 'Failed to distribute leads equally' });

  }

};



export const getWorkflowStatusHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { getAutoAssignWorkflowSetting } = await import('../services/assignment.service');

    const result = await getAutoAssignWorkflowSetting();

    res.json({ success: true, ...result });

  } catch (error: any) {

    res.status(500).json({ success: false, message: error?.message || 'Failed to get workflow status' });

  }

};



export const updateWorkflowStatusHandler = async (req: Request, res: Response): Promise<void> => {

  try {

    const { enabled } = req.body;

    const { setAutoAssignWorkflowSetting } = await import('../services/assignment.service');

    const result = await setAutoAssignWorkflowSetting(Boolean(enabled));

    res.json({ success: true, ...result });

  } catch (error: any) {

    res.status(500).json({ success: false, message: error?.message || 'Failed to update workflow status' });

  }

};





export const checkDuplicateLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPhone = String(req.query.phone || '').trim();
    const rawEmail = String(req.query.email || '').trim();
    const cleanName = String(req.query.fullName || req.query.name || '').trim();
    const cleanCompany = String(req.query.companyName || req.query.company || '').trim();
    const excludeId = String(req.query.excludeId || '').trim();

    if (!rawPhone && !rawEmail && (!cleanName || !cleanCompany)) {
      res.json({ isDuplicate: false });
      return;
    }

    const duplicate = await findDuplicateLeadInDb(prisma, {
      phone: rawPhone,
      email: rawEmail,
      fullName: cleanName,
      companyName: cleanCompany,
      excludeId: excludeId || undefined,
    });

    if (duplicate) {
      res.json({
        isDuplicate: true,
        duplicateType: duplicate.matchType,
        existingLead: {
          id: duplicate.existing.id,
          fullName: duplicate.existing.fullName,
          phone: duplicate.existing.phone,
          email: duplicate.existing.email,
          companyName: duplicate.existing.companyName,
          category: duplicate.existing.category,
          status: duplicate.existing.status,
          source: duplicate.existing.source,
          ownerName: duplicate.ownerName,
          ownerId: duplicate.existing.ownerId,
          createdAt: duplicate.existing.createdAt,
        },
        message: `Duplicate lead detected! ${duplicate.reason} (Assigned to: ${duplicate.ownerName})`,
      });
      return;
    }

    res.json({ isDuplicate: false });
  } catch (error: any) {
    console.error('checkDuplicateLead error:', error);
    res.status(500).json({ message: 'Error checking duplicate lead' });
  }
};



// ==========================================
// LEAD REMINDERS & FOLLOW-UP CONTROLLERS
// ==========================================

export const getLeadReminderCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const whereClause: any = {};
    const adminRoles = ['Super Admin', 'Admin', 'Sales Manager'];
    const isEmployee = user && !adminRoles.includes(user.roleName) && !user.isDevToken;

    if (isEmployee || req.query.myLeads === 'true') {
      if (user?.id) {
        whereClause.ownerId = user.id;
      } else {
        res.json({ counts: { today: 0, overdue: 0, upcoming: 0, total: 0 } });
        return;
      }
    } else if (req.query.employeeId) {
      whereClause.ownerId = String(req.query.employeeId);
    }

    whereClause.nextFollowUpDate = { not: null };

    const leads = await prisma.lead.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        nextFollowUpDate: true,
      }
    });

    const ownerFilter = whereClause.ownerId ? { ownerId: whereClause.ownerId } : {};
    const completedCount = await prisma.lead.count({
      where: {
        ...ownerFilter,
        status: { in: ['converted', 'lost', 'won'] }
      }
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;

    leads.forEach(l => {
      if (!l.nextFollowUpDate) return;
      const isClosed = ['converted', 'lost', 'won'].includes((l.status || '').toLowerCase());
      if (isClosed) return;

      const fDate = new Date(l.nextFollowUpDate);

      if (fDate < startOfToday) {
        overdueCount++;
      } else if (fDate <= endOfToday) {
        todayCount++;
      } else {
        upcomingCount++;
      }
    });

    res.json({
      counts: {
        today: todayCount,
        overdue: overdueCount,
        upcoming: upcomingCount,
        completed: completedCount,
        total: todayCount + overdueCount + upcomingCount,
      }
    });
  } catch (error) {
    console.error('getLeadReminderCounts error:', error);
    res.status(500).json({ message: 'Server error fetching reminder counts' });
  }
};

export const getLeadReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const whereClause: any = {};
    const adminRoles = ['Super Admin', 'Admin', 'Sales Manager'];
    const isEmployee = user && !adminRoles.includes(user.roleName) && !user.isDevToken;

    if (isEmployee || req.query.myLeads === 'true') {
      if (user?.id) {
        whereClause.ownerId = user.id;
      } else {
        res.json({ reminders: [], counts: { today: 0, overdue: 0, upcoming: 0, total: 0 } });
        return;
      }
    } else if (req.query.employeeId) {
      whereClause.ownerId = String(req.query.employeeId);
    }

    const tab = (req.query.tab as string) || 'all';

    if (tab === 'completed') {
      whereClause.status = { in: ['converted', 'lost', 'won', 'CONVERTED', 'LOST', 'WON'] };
    } else {
      whereClause.nextFollowUpDate = { not: null };
      whereClause.status = { notIn: ['converted', 'lost', 'won', 'CONVERTED', 'LOST', 'WON'] };
    }

    if (req.query.category && req.query.category !== 'all') {
      whereClause.category = String(req.query.category).toLowerCase();
    }

    if (req.query.priority && req.query.priority !== 'all') {
      whereClause.priority = String(req.query.priority).toLowerCase();
    }

    if (req.query.status && req.query.status !== 'all' && tab !== 'completed') {
      whereClause.status = String(req.query.status).toLowerCase();
    }

    let leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: tab === 'completed' ? { updatedAt: 'desc' } : { nextFollowUpDate: 'asc' },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        unit: { select: { id: true, name: true } },
        followUps: { orderBy: { scheduledAt: 'desc' }, take: 3 },
        activities: { orderBy: { createdAt: 'desc' }, take: 3 }
      }
    });

    if (tab !== 'completed') {
      leads = leads.filter(l => !['converted', 'lost', 'won'].includes((l.status || '').toLowerCase().trim()));
    }

    const ownerFilter = whereClause.ownerId ? { ownerId: whereClause.ownerId } : {};
    const [allActiveScheduled, completedCount] = await Promise.all([
      prisma.lead.findMany({
        where: {
          ...ownerFilter,
          nextFollowUpDate: { not: null },
          status: { notIn: ['converted', 'lost', 'won'] }
        },
        select: { nextFollowUpDate: true }
      }),
      prisma.lead.count({
        where: {
          ...ownerFilter,
          status: { in: ['converted', 'lost', 'won'] }
        }
      })
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;

    allActiveScheduled.forEach(l => {
      if (!l.nextFollowUpDate) return;
      const fDate = new Date(l.nextFollowUpDate);
      if (fDate < startOfToday) {
        overdueCount++;
      } else if (fDate <= endOfToday) {
        todayCount++;
      } else {
        upcomingCount++;
      }
    });

    const classified = leads.map(l => {
      const fDate = l.nextFollowUpDate ? new Date(l.nextFollowUpDate) : null;
      const isClosed = ['converted', 'lost', 'won'].includes((l.status || '').toLowerCase());
      let reminderStatus: 'overdue' | 'today' | 'upcoming' = 'upcoming';
      let daysDiff = 0;
      let isOverdue = false;
      let isToday = false;
      let isUpcoming = false;

      if (fDate) {
        const diffMs = fDate.getTime() - startOfToday.getTime();
        daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (fDate < startOfToday) {
          reminderStatus = 'overdue';
          isOverdue = !isClosed;
        } else if (fDate <= endOfToday) {
          reminderStatus = 'today';
          isToday = !isClosed;
        } else {
          reminderStatus = 'upcoming';
          isUpcoming = !isClosed;
        }
      }

      return {
        ...l,
        reminderStatus,
        daysDiff,
        isOverdue,
        isToday,
        isUpcoming,
      };
    });

    let filtered = classified;
    if (tab === 'today') {
      filtered = classified.filter(item => item.isToday);
    } else if (tab === 'overdue') {
      filtered = classified.filter(item => item.isOverdue);
    } else if (tab === 'upcoming') {
      filtered = classified.filter(item => item.isUpcoming);
    } else if (tab === 'completed') {
      filtered = classified.filter(item => ['converted', 'lost', 'won'].includes((item.status || '').toLowerCase()));
    }

    res.json({
      reminders: filtered,
      counts: {
        today: todayCount,
        overdue: overdueCount,
        upcoming: upcomingCount,
        completed: completedCount,
        total: todayCount + overdueCount + upcomingCount,
      }
    });
  } catch (error) {
    console.error('getLeadReminders error:', error);
    res.status(500).json({ message: 'Server error fetching lead reminders' });
  }
};

export const handleLeadReminderAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { leadId, action, newStatus, remark, nextFollowUpDate } = req.body;

    if (!leadId) {
      res.status(400).json({ message: 'Lead ID is required' });
      return;
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    const updateData: any = {
      lastContactDate: new Date(),
    };

    if (newStatus) {
      updateData.status = String(newStatus).toLowerCase();
    }

    const finalStatus = (updateData.status || lead.status || '').toLowerCase();
    const isNowClosed = ['converted', 'lost', 'won'].includes(finalStatus) || ['converted', 'lost', 'won', 'clear_reminder', 'complete'].includes(action);

    if (isNowClosed) {
      updateData.nextFollowUpDate = null;
    } else if (action === 'reschedule' && nextFollowUpDate) {
      updateData.nextFollowUpDate = new Date(nextFollowUpDate);
    } else if (nextFollowUpDate) {
      updateData.nextFollowUpDate = new Date(nextFollowUpDate);
    }

    const authorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.roleName : 'Employee';
    const timestamp = new Date().toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });

    if (remark && String(remark).trim()) {
      const cleanRemark = String(remark).trim();
      const currentStatusLabel = (newStatus || lead.status || '').toUpperCase();
      const nextDateStr = updateData.nextFollowUpDate ? ` | Next: ${new Date(updateData.nextFollowUpDate).toLocaleDateString('en-IN')}` : '';
      const noteEntry = `[${timestamp} by ${authorName}]: Status: ${currentStatusLabel} | Remark: ${cleanRemark}${nextDateStr}`;
      updateData.notes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

      await prisma.leadActivity.create({
        data: {
          leadId,
          type: action === 'call' ? 'call' : (action === 'whatsapp' ? 'whatsapp' : 'status_change'),
          description: `[Reminder]: ${cleanRemark} (Status: ${currentStatusLabel})`,
          userId: user?.id || null,
        }
      });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        unit: { select: { id: true, name: true } },
      }
    });

    res.json({
      message: 'Lead reminder updated successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('handleLeadReminderAction error:', error);
    res.status(500).json({ message: 'Server error updating lead reminder' });
  }
};


export const checkBatchConflictsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      res.json({ success: true, totalRows: 0, conflictCount: 0, assignedCount: 0, conflicts: [] });
      return;
    }

    const existingLeads = await prisma.lead.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        companyName: true,
        status: true,
        category: true,
        ownerId: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    const phone10Map = new Map<string, any>();
    const exactPhoneMap = new Map<string, any>();
    const emailMap = new Map<string, any>();
    const nameCompanyMap = new Map<string, any>();

    existingLeads.forEach(lead => {
      const rawP = (lead.phone || '').trim();
      const cleanP = rawP.replace(/[^0-9]/g, '');
      if (cleanP.length >= 6) {
        const p10 = cleanP.length >= 10 ? cleanP.slice(-10) : cleanP;
        phone10Map.set(p10, lead);
      }
      if (rawP) {
        exactPhoneMap.set(rawP, lead);
      }
      if (lead.email && lead.email.includes('@')) {
        emailMap.set(lead.email.trim().toLowerCase(), lead);
      }
      if (lead.fullName && lead.companyName && lead.fullName.trim().length >= 3 && lead.companyName.trim().length >= 3) {
        const key = `${lead.fullName.trim().toLowerCase()}_${lead.companyName.trim().toLowerCase()}`;
        nameCompanyMap.set(key, lead);
      }
    });

    const conflicts: any[] = [];
    const seenPhonesInBatch = new Set<string>();

    for (let i = 0; i < leads.length; i++) {
      const row = leads[i];
      const fullName = String(row.fullName || row.full_name || row.name || row['Full Name'] || row['Name'] || row['Client Name'] || '').trim();
      const rawPhone = String(row.phone || row.mobile || row.contact || row['Phone'] || row['Mobile'] || '').trim();
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const phone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : (cleanPhone.length >= 6 ? cleanPhone : '');
      const email = String(row.email || row['Email'] || '').trim().toLowerCase();
      const companyName = String(row.companyName || row.company_name || row.company || row['Company'] || row['Company Name'] || '').trim();

      let match: any = null;
      let matchType = '';
      let matchReason = '';

      if (phone10 && phone10Map.has(phone10)) {
        match = phone10Map.get(phone10);
        matchType = 'phone';
        matchReason = `Phone number ${rawPhone} is already in CRM`;
      } else if (rawPhone && exactPhoneMap.has(rawPhone)) {
        match = exactPhoneMap.get(rawPhone);
        matchType = 'phone';
        matchReason = `Phone number ${rawPhone} is already in CRM`;
      } else if (email && email.includes('@') && emailMap.has(email)) {
        match = emailMap.get(email);
        matchType = 'email';
        matchReason = `Email ${email} is already in CRM`;
      } else if (fullName.length >= 3 && companyName.length >= 3) {
        const key = `${fullName.toLowerCase()}_${companyName.toLowerCase()}`;
        if (nameCompanyMap.has(key)) {
          match = nameCompanyMap.get(key);
          matchType = 'name_and_company';
          matchReason = `Name "${fullName}" & Company "${companyName}" exist in CRM`;
        }
      }

      if (match) {
        const assignedName = match.owner
          ? `${match.owner.firstName || ''} ${match.owner.lastName || ''}`.trim() || match.owner.email
          : 'Unassigned';

        conflicts.push({
          rowIndex: i + 1,
          uploadedName: fullName || 'Unnamed',
          uploadedPhone: rawPhone,
          uploadedEmail: email || null,
          uploadedCompany: companyName || null,
          existingId: match.id,
          existingName: match.fullName,
          existingPhone: match.phone,
          existingEmail: match.email,
          existingCompany: match.companyName,
          existingStatus: (match.status || 'new').toUpperCase(),
          assignedTo: assignedName,
          assignedToId: match.ownerId || null,
          assignedToEmail: match.owner?.email || null,
          conflictType: matchType,
          conflictReason: `${matchReason} (Currently Assigned to: ${assignedName})`,
        });
      }
    }

    res.json({
      success: true,
      totalRows: leads.length,
      conflictCount: conflicts.length,
      assignedCount: conflicts.filter(c => c.assignedTo !== 'Unassigned').length,
      conflicts,
    });
  } catch (error) {
    console.error('checkBatchConflictsHandler error:', error);
    res.status(500).json({ message: 'Error checking batch conflicts' });
  }
};
