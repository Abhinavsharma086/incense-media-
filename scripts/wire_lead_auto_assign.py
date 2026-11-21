with open('backend/src/controllers/lead.controller.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. In createLead:
target_1 = """        const lead = await prisma.lead.create({
            data: {
                fullName,
                phone,
                email,
                companyName,
                website,
                city,
                industry,
                source: source || 'Website',
                category: category || 'publication',
                campaign,
                status: status || 'new',
                priority: priority || 'medium',
                interestedService,
                budget,
                dealValue,
                notes,
                leadScore,
                ownerId: finalOwnerId,
                assignedAt: finalOwnerId ? new Date() : null,
            },
            include: {
                owner: true,
            },
        });"""

replacement_1 = """        const lead = await prisma.lead.create({
            data: {
                fullName,
                phone,
                email,
                companyName,
                website,
                city,
                industry,
                source: source || 'Website',
                category: category || 'publication',
                campaign,
                status: status || 'new',
                priority: priority || 'medium',
                interestedService,
                budget,
                dealValue,
                notes,
                leadScore,
                ownerId: finalOwnerId,
                assignedAt: finalOwnerId ? new Date() : null,
            },
            include: {
                owner: true,
            },
        });

        // Trigger Auto-Assign Workflow if no owner was explicitly provided
        if (!finalOwnerId) {
            try {
                const { autoAssignLeadWorkflow } = await import('../services/assignment.service');
                const assignedEmpId = await autoAssignLeadWorkflow(lead.id);
                if (assignedEmpId) {
                    (lead as any).ownerId = assignedEmpId;
                }
            } catch (wErr) {
                console.warn('Auto-assign workflow warning in createLead:', wErr);
            }
        }"""

if target_1 in text:
    text = text.replace(target_1, replacement_1)
    print('[+] Wired autoAssignLeadWorkflow into createLead')
else:
    print('[-] target_1 not found in createLead')

# 2. In batchImportLeads:
target_2 = """        res.json({
            success: true,
            message: `Successfully imported ${createdCount} leads (${skippedCount} duplicates skipped)`,
            data: {
                totalSubmitted: leads.length,
                createdCount,
                skippedCount,
                errorsCount: errors.length,
                errors: errors.slice(0, 5),
            }
        });"""

replacement_2 = """        // Trigger Auto-Assign Workflow for newly imported unassigned leads
        if (!targetOwnerId && createdLeads.length > 0) {
            try {
                const { autoAssignLeadWorkflow } = await import('../services/assignment.service');
                for (const cl of createdLeads) {
                    await autoAssignLeadWorkflow(cl.id);
                }
            } catch (wErr) {
                console.warn('Auto-assign workflow warning in batchImportLeads:', wErr);
            }
        }

        res.json({
            success: true,
            message: `Successfully imported ${createdCount} leads (${skippedCount} duplicates skipped)`,
            data: {
                totalSubmitted: leads.length,
                createdCount,
                skippedCount,
                errorsCount: errors.length,
                errors: errors.slice(0, 5),
            }
        });"""

if target_2 in text:
    text = text.replace(target_2, replacement_2)
    print('[+] Wired autoAssignLeadWorkflow into batchImportLeads')
else:
    print('[-] target_2 not found in batchImportLeads')

with open('backend/src/controllers/lead.controller.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('[+] lead.controller.ts updated!')

