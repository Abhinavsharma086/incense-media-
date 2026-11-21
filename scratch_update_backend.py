import os
import sys

backend_file = r'c:\xampp\htdocs\incenseMediaAdminCode\backend\src\controllers\lead.controller.ts'
with open(backend_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update getLeads ownerId handling
old_owner_block = """        if ((isEmployeeRole || req.query.myLeads === 'true') && req.query.all !== 'true') {
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
        }"""

new_owner_block = """        if ((isEmployeeRole || req.query.myLeads === 'true') && req.query.all !== 'true') {
            if (user?.id && !user.isDevToken && user.id !== 'legacy-user') {
                whereClause.ownerId = user.id;
            } else if (req.query.employeeId && req.query.employeeId !== 'undefined' && req.query.employeeId !== 'null' && !String(req.query.employeeId).startsWith('emp-')) {
                whereClause.ownerId = String(req.query.employeeId);
            } else if (user?.id) {
                whereClause.ownerId = user.id;
            } else {
                res.json([]);
                return;
            }
        } else if (req.query.employeeId && req.query.employeeId !== 'undefined' && req.query.employeeId !== 'null' && !String(req.query.employeeId).startsWith('emp-')) {
            whereClause.ownerId = String(req.query.employeeId);
        }"""

# Normalizing newlines for replacement
if old_owner_block in content:
    content = content.replace(old_owner_block, new_owner_block)
    print("Replaced getLeads owner block")
else:
    # try with normalized newlines
    content = content.replace(old_owner_block.replace('\r\n', '\n'), new_owner_block)
    print("Replaced getLeads owner block (normalized)")

# 2. Update updateLead to clear nextFollowUpDate on converted/won/lost
old_update_fup = """        const nextFollowUpDate = b.nextFollowUpDate !== undefined ? b.nextFollowUpDate : b.next_follow_up_date;

        if (nextFollowUpDate !== undefined) {

            dataToUpdate.nextFollowUpDate = nextFollowUpDate && !isNaN(Date.parse(String(nextFollowUpDate))) ? new Date(nextFollowUpDate) : null;

        }"""

new_update_fup = """        const nextFollowUpDate = b.nextFollowUpDate !== undefined ? b.nextFollowUpDate : b.next_follow_up_date;

        const currentFinalStatus = (dataToUpdate.status || existingLead.status || '').toLowerCase().trim();
        if (['converted', 'lost', 'won'].includes(currentFinalStatus)) {
            dataToUpdate.nextFollowUpDate = null;
        } else if (nextFollowUpDate !== undefined) {
            dataToUpdate.nextFollowUpDate = nextFollowUpDate && !isNaN(Date.parse(String(nextFollowUpDate))) ? new Date(nextFollowUpDate) : null;
        }"""

if old_update_fup in content:
    content = content.replace(old_update_fup, new_update_fup)
    print("Replaced updateLead nextFollowUpDate block")
else:
    print("Warning: old_update_fup not found")

# 3. Update getLeadReminders whereClause.status
old_rem_where = """    if (tab === 'completed') {
      whereClause.status = { in: ['converted', 'lost', 'won'] };
    } else {
      whereClause.nextFollowUpDate = { not: null };
      whereClause.status = { notIn: ['converted', 'lost', 'won'] };
    }"""

new_rem_where = """    if (tab === 'completed') {
      whereClause.status = { in: ['converted', 'lost', 'won', 'CONVERTED', 'LOST', 'WON'] };
    } else {
      whereClause.nextFollowUpDate = { not: null };
      whereClause.status = { notIn: ['converted', 'lost', 'won', 'CONVERTED', 'LOST', 'WON'] };
    }"""

if old_rem_where in content:
    content = content.replace(old_rem_where, new_rem_where)
    print("Replaced getLeadReminders whereClause")
else:
    print("Warning: old_rem_where not found")

# 4. Strict filter in getLeadReminders to purge converted leads from non-completed tabs
old_leads_find = """    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: tab === 'completed' ? { updatedAt: 'desc' } : { nextFollowUpDate: 'asc' },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        unit: { select: { id: true, name: true } },
        followUps: { orderBy: { scheduledAt: 'desc' }, take: 3 },
        activities: { orderBy: { createdAt: 'desc' }, take: 3 }
      }
    });"""

new_leads_find = """    let leads = await prisma.lead.findMany({
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
    }"""

if old_leads_find in content:
    content = content.replace(old_leads_find, new_leads_find)
    print("Replaced leads find in getLeadReminders")
else:
    print("Warning: old_leads_find not found")

with open(backend_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("lead.controller.ts updated successfully!")
