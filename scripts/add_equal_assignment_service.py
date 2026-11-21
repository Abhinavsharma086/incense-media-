with open('backend/src/services/assignment.service.ts', 'r', encoding='utf-8') as f:
    code = f.read()

new_functions = """

/**
 * Unassign All Leads (Undo all current lead assignments)
 * Sets ownerId = null for all assigned leads.
 */
export const unassignAllLeads = async (assignedById?: string) => {
  const assignedCount = await prisma.lead.count({
    where: { ownerId: { not: null } },
  });

  if (assignedCount === 0) {
    return {
      success: true,
      message: 'Sabhi leads pehle se hi unassigned hain.',
      unassignedCount: 0,
    };
  }

  // Update all assigned leads to ownerId: null
  const result = await prisma.lead.updateMany({
    where: { ownerId: { not: null } },
    data: { ownerId: null },
  });

  return {
    success: true,
    message: `Safaltapoorvak ${result.count} leads ko sabhi employees se unassign kar diya gaya hai. Ab sabhi leads barabar baantne ke liye uplabdh hain!`,
    unassignedCount: result.count,
  };
};

/**
 * Fair Equal Lead Distribution (Strict Round-Robin Equal Quota)
 * Guarantees every single employee receives an EXACT equal quota (+/- 1 lead max for remainder).
 */
export const distributeLeadsEqually = async ({
  employeeIds,
  maxTotalLeads,
  assignedById,
}: {
  employeeIds?: string[];
  maxTotalLeads?: number;
  assignedById?: string;
} = {}) => {
  // 1. Identify participating employees
  let targetEmployees: any[] = [];
  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    targetEmployees = await prisma.user.findMany({
      where: { id: { in: employeeIds }, isActive: true },
      include: { role: true },
      orderBy: { firstName: 'asc' },
    });
  } else {
    // Default: Pick all active sales staff / employees, EXCLUDING Super Admin
    targetEmployees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: {
            in: [
              'Sales Executive',
              'Sales Manager',
              'Associate-Channel Sales',
              'Employee',
              'Management',
              'Sales officer',
              'Account Associate',
              'Sales & Billing Specialist',
            ],
          },
        },
      },
      include: { role: true },
      orderBy: { firstName: 'asc' },
    });
  }

  if (targetEmployees.length === 0) {
    // Fallback: active non-superadmin users
    targetEmployees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: { not: 'Super Admin' } },
      },
      include: { role: true },
      orderBy: { firstName: 'asc' },
    });
  }

  if (targetEmployees.length === 0) {
    throw new Error('Leads distribute karne ke liye koi active sales employee nahi mila.');
  }

  // 2. Fetch candidate unassigned leads
  const candidateLeads = await prisma.lead.findMany({
    where: { ownerId: null },
    orderBy: { createdAt: 'asc' },
    take: maxTotalLeads && maxTotalLeads > 0 ? maxTotalLeads : undefined,
    select: { id: true },
  });

  if (candidateLeads.length === 0) {
    return {
      success: false,
      message: 'Koi unassigned lead uplabdh nahi hai distribute karne ke liye.',
      totalAssigned: 0,
      employeesCount: targetEmployees.length,
      breakdown: [],
    };
  }

  const numLeads = candidateLeads.length;
  const numEmployees = targetEmployees.length;

  // Strict Fair Equal Distribution calculation
  const basePerEmployee = Math.floor(numLeads / numEmployees);
  const remainder = numLeads % numEmployees;

  const breakdown: any[] = [];
  let leadIndex = 0;

  for (let i = 0; i < numEmployees; i++) {
    const emp = targetEmployees[i];
    const quota = basePerEmployee + (i < remainder ? 1 : 0);
    const empLeadIds = candidateLeads.slice(leadIndex, leadIndex + quota).map((l) => l.id);
    leadIndex += quota;

    if (empLeadIds.length > 0) {
      await prisma.lead.updateMany({
        where: { id: { in: empLeadIds } },
        data: { ownerId: emp.id },
      });
    }

    breakdown.push({
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      email: emp.email,
      role: emp.role?.name || 'Sales Executive',
      assignedCount: empLeadIds.length,
    });
  }

  return {
    success: true,
    message: `${numLeads} leads ko ${numEmployees} employees me bilkul barabar baant diya gaya hai (~${basePerEmployee}${remainder > 0 ? `-${basePerEmployee + 1}` : ''} leads prati employee)!`,
    totalAssigned: numLeads,
    employeesCount: numEmployees,
    basePerEmployee,
    remainder,
    breakdown,
  };
};

/**
 * Get Auto-Assignment Workflow Status
 */
export const getAutoAssignWorkflowSetting = async () => {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: 'AUTO_ASSIGN_WORKFLOW_ENABLED' },
  });
  return {
    isEnabled: setting ? setting.value === 'true' : true, // Enabled by default
  };
};

/**
 * Set Auto-Assignment Workflow Status
 */
export const setAutoAssignWorkflowSetting = async (enabled: boolean) => {
  const setting = await prisma.globalSetting.upsert({
    where: { key: 'AUTO_ASSIGN_WORKFLOW_ENABLED' },
    update: { value: enabled ? 'true' : 'false' },
    create: {
      key: 'AUTO_ASSIGN_WORKFLOW_ENABLED',
      value: enabled ? 'true' : 'false',
      category: 'feature_flags',
      description: 'Auto-assign incoming leads equally across sales staff',
    },
  });
  return { isEnabled: setting.value === 'true' };
};

/**
 * Auto-assign a newly incoming lead (via Meta, Web Inquiries, or Import)
 * Keeps workload perfectly balanced at all times.
 */
export const autoAssignLeadWorkflow = async (leadId: string): Promise<string | null> => {
  try {
    const status = await getAutoAssignWorkflowSetting();
    if (!status.isEnabled) return null;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.ownerId) return lead?.ownerId || null;

    // Find all active sales employees
    const salesUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: {
            in: [
              'Sales Executive',
              'Sales Manager',
              'Associate-Channel Sales',
              'Employee',
              'Management',
              'Sales officer',
              'Account Associate',
              'Sales & Billing Specialist',
            ],
          },
        },
      },
      select: { id: true },
    });

    if (salesUsers.length === 0) return null;

    // Count current active leads per user to maintain perfect equal distribution
    const counts = await Promise.all(
      salesUsers.map(async (u) => {
        const leadCount = await prisma.lead.count({ where: { ownerId: u.id } });
        return { userId: u.id, leadCount };
      })
    );

    // Pick employee with the lowest count (tie-breaker: random or first)
    counts.sort((a, b) => a.leadCount - b.leadCount);
    const chosenUserId = counts[0].userId;

    await prisma.lead.update({
      where: { id: leadId },
      data: { ownerId: chosenUserId },
    });

    return chosenUserId;
  } catch (err: any) {
    console.warn('autoAssignLeadWorkflow warning:', err.message);
    return null;
  }
};
"""

if 'unassignAllLeads' not in code:
    code = code + new_functions
    with open('backend/src/services/assignment.service.ts', 'w', encoding='utf-8') as f:
        f.write(code)
    print('[+] assignment.service.ts updated with unassign & equal distribution & workflow')
else:
    print('[-] already present in assignment.service.ts')

