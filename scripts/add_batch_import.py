with open('backend/src/controllers/lead.controller.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update source default in createLead
source_target = "source: source ? String(source) : 'manual',"
source_replacement = """source: (() => {
                const s = source ? String(source).trim() : '';
                if (!s || s.toLowerCase() === 'manual') {
                    return fullName ? `Manually Added - ${String(fullName).trim()}` : 'Manually Added by Customer';
                }
                return s;
            })(),"""
text = text.replace(source_target, source_replacement)

# Also if ownerId is not provided and user is employee, assign to user
owner_target = """        if (ownerId && String(ownerId).trim() !== '') {"""
owner_replacement = """        const currentUser = (req as any).user;
        if (!ownerId && currentUser && !['Super Admin', 'Admin'].includes(currentUser.roleName) && currentUser.id) {
            dataToCreate.ownerId = currentUser.id;
        }

        if (ownerId && String(ownerId).trim() !== '') {"""
text = text.replace(owner_target, owner_replacement)

# 2. Add batchImportLeads at the end of lead.controller.ts
batch_func = """
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
        const errors: any[] = [];
        const createdLeads: any[] = [];

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

            const email = (row.email || row['Email'] || '').trim() || null;
            const companyName = (row.companyName || row.company_name || row.company || row['Company'] || row['Company Name'] || '').trim() || null;
            const city = (row.city || row['City'] || '').trim() || null;
            const source = (row.source || defaultSource || `Imported - ${fullName}`).trim();
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
                } catch (_) {}

                createdCount++;
                createdLeads.push(newLead);
            } catch (err: any) {
                skippedCount++;
                errors.push({ row: i + 1, reason: err.message || 'Database error' });
            }
        }

        res.json({
            message: `Successfully imported ${createdCount} leads (${skippedCount} skipped)`,
            total: leads.length,
            createdCount,
            skippedCount,
            errors: errors.slice(0, 10),
            createdLeads,
        });
    } catch (error) {
        console.error('batchImportLeads error:', error);
        res.status(500).json({ message: 'Server error during batch import' });
    }
};
"""

text += batch_func

with open('backend/src/controllers/lead.controller.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated lead.controller.ts with batchImportLeads and smart source')

# 3. Update lead.routes.ts
with open('backend/src/routes/lead.routes.ts', 'r', encoding='utf-8') as f:
    rtext = f.read()

rtext = rtext.replace('  createLead,', '  createLead,\n  batchImportLeads,')
rtext = rtext.replace(
    "router.post('/', checkPermissionKey('leads.create'), createLead);",
    "router.post('/batch-import', checkPermissionKey('leads.create'), batchImportLeads);\nrouter.post('/', checkPermissionKey('leads.create'), createLead);"
)

with open('backend/src/routes/lead.routes.ts', 'w', encoding='utf-8') as f:
    f.write(rtext)

print('Updated lead.routes.ts with /batch-import route')

