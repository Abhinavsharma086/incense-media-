import prisma from '../utils/prisma';

export interface AutoAssignResult {
  success: boolean;
  leadId: string;
  assignedToId?: string;
  assignedToName?: string;
  unitId?: string;
  unitName?: string;
  ruleType?: string;
  message: string;
}

/**
 * Auto-assigns a lead to an eligible employee within a unit using Round Robin or Workload-Based rule.
 */
export const autoAssignLead = async (leadId: string): Promise<AutoAssignResult> => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { owner: true, unit: true },
  });

  if (!lead) {
    return { success: false, leadId, message: 'Lead not found' };
  }

  // Exclusive Ownership: If lead is already assigned to an employee, preserve it!
  if (lead.ownerId) {
    const ownerName = lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : 'Existing Owner';
    return {
      success: true,
      leadId,
      assignedToId: lead.ownerId,
      assignedToName: ownerName,
      message: `Lead is already exclusively assigned to ${ownerName}`,
    };
  }

  // 1. Determine Unit
  let targetUnitId = lead.unitId;
  let targetUnitName = lead.unit?.name;

  if (!targetUnitId) {
    // Find matching rule by source
    const sourceRule = await prisma.assignmentRule.findFirst({
      where: {
        isActive: true,
        isSourceMatching: true,
        leadSourceFilter: { equals: lead.source },
      },
      include: { unit: true },
    });

    if (sourceRule) {
      targetUnitId = sourceRule.unitId;
      targetUnitName = sourceRule.unit.name;
    } else {
      // Pick first active unit
      const defaultUnit = await prisma.unit.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (defaultUnit) {
        targetUnitId = defaultUnit.id;
        targetUnitName = defaultUnit.name;
      }
    }
  }

  // 2. Fetch Unit Rule
  const rule = targetUnitId
    ? await prisma.assignmentRule.findFirst({ where: { unitId: targetUnitId, isActive: true } })
    : null;
  const ruleType = rule?.ruleType || 'round_robin';

  // 3. Get eligible active employees in unit
  let unitEmployees: any[] = [];
  if (targetUnitId) {
    unitEmployees = await prisma.unitEmployee.findMany({
      where: {
        unitId: targetUnitId,
        isActive: true,
        employee: { isActive: true },
      },
      include: { employee: true },
    });
  }

  let selectedEmployeeId: string | null = null;
  let selectedEmployeeName = '';
  let selectedUnitEmpId = '';

  if (unitEmployees.length > 0) {
    // Unit Employees exist
    if (ruleType === 'workload') {
      const empWorkloads = await Promise.all(
        unitEmployees.map(async (ue) => {
          const activeCount = await prisma.lead.count({
            where: {
              ownerId: ue.employeeId,
              status: { notIn: ['won', 'lost', 'converted'] },
            },
          });
          return {
            unitEmployeeId: ue.id,
            employeeId: ue.employeeId,
            employeeName: `${ue.employee.firstName} ${ue.employee.lastName}`,
            maxCapacity: ue.maxCapacity,
            activeCount,
            isCapacityExceeded: activeCount >= ue.maxCapacity,
          };
        })
      );

      const available = empWorkloads.filter((e) => !e.isCapacityExceeded);
      const pool = available.length > 0 ? available : empWorkloads;
      pool.sort((a, b) => a.activeCount - b.activeCount);

      selectedEmployeeId = pool[0].employeeId;
      selectedEmployeeName = pool[0].employeeName;
      selectedUnitEmpId = pool[0].unitEmployeeId;
    } else {
      // Round Robin
      unitEmployees.sort((a, b) => {
        if (!a.lastAssignedAt) return -1;
        if (!b.lastAssignedAt) return 1;
        return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
      });

      const candidate = unitEmployees[0];
      selectedEmployeeId = candidate.employeeId;
      selectedEmployeeName = `${candidate.employee.firstName} ${candidate.employee.lastName}`;
      selectedUnitEmpId = candidate.id;
    }
  } else {
    // Fallback: Pick all active sales staff directly from User table
    const salesUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: {
            in: [
              'Sales Executive',
              'Field Sales Executive',
              'Sales & Billing Specialist',
              'Telecaller',
              'Sales Manager',
            ],
          },
        },
      },
      include: { role: true },
    });

    if (salesUsers.length === 0) {
      return {
        success: false,
        leadId,
        message: 'No active sales employees available to assign lead',
      };
    }

    if (ruleType === 'workload') {
      const empWorkloads = await Promise.all(
        salesUsers.map(async (u) => {
          const activeCount = await prisma.lead.count({
            where: {
              ownerId: u.id,
              status: { notIn: ['won', 'lost', 'converted'] },
            },
          });
          return {
            employeeId: u.id,
            employeeName: `${u.firstName} ${u.lastName}`.trim(),
            activeCount,
          };
        })
      );
      empWorkloads.sort((a, b) => a.activeCount - b.activeCount);
      selectedEmployeeId = empWorkloads[0].employeeId;
      selectedEmployeeName = empWorkloads[0].employeeName;
    } else {
      // Strict Round Robin across users by last assigned lead time
      const empAssigned = await Promise.all(
        salesUsers.map(async (u) => {
          const lastLead = await prisma.lead.findFirst({
            where: { ownerId: u.id },
            orderBy: { assignedAt: 'desc' },
            select: { assignedAt: true },
          });
          return {
            employeeId: u.id,
            employeeName: `${u.firstName} ${u.lastName}`.trim(),
            lastAssignedAt: lastLead?.assignedAt || null,
          };
        })
      );

      empAssigned.sort((a, b) => {
        if (!a.lastAssignedAt) return -1;
        if (!b.lastAssignedAt) return 1;
        return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
      });

      selectedEmployeeId = empAssigned[0].employeeId;
      selectedEmployeeName = empAssigned[0].employeeName;
    }
  }

  // 4. Update Lead & Log Assignment
  const previousOwnerId = lead.ownerId;
  const now = new Date();

  const txOps: any[] = [
    prisma.lead.update({
      where: { id: leadId },
      data: {
        ownerId: selectedEmployeeId,
        unitId: targetUnitId || null,
        assignedAt: now,
      },
    }),
    prisma.assignmentLog.create({
      data: {
        leadId,
        fromEmployeeId: previousOwnerId,
        toEmployeeId: selectedEmployeeId,
        reason: `Auto-assigned via ${ruleType.toUpperCase()} rule${targetUnitName ? ` in ${targetUnitName}` : ''}`,
      },
    }),
  ];

  if (selectedUnitEmpId) {
    txOps.push(
      prisma.unitEmployee.update({
        where: { id: selectedUnitEmpId },
        data: { lastAssignedAt: now },
      })
    );
  }

  await prisma.$transaction(txOps);

  return {
    success: true,
    leadId,
    assignedToId: selectedEmployeeId,
    assignedToName: selectedEmployeeName,
    unitId: targetUnitId,
    unitName: targetUnitName,
    ruleType,
    message: `Lead successfully auto-assigned to ${selectedEmployeeName} (${ruleType})`,
  };
};

/**
 * Finds user by ID or by email/phone fallback.
 */
export const resolveUser = async (employeeId: string) => {
  if (!employeeId) return null;
  let employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (employee) return employee;

  employee = await prisma.user.findFirst({
    where: {
      OR: [
        { email: employeeId },
        { phone: employeeId },
      ],
    },
  });
  return employee;
};

/**
 * Manually assigns a lead to an employee.
 */
export const manualAssignLead = async (
  leadId: string,
  employeeId: string,
  assignedById?: string,
  reason?: string
) => {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead not found');

  const employee = await resolveUser(employeeId);
  if (!employee) throw new Error('Employee not found');

  const fromEmployeeId = lead.ownerId;
  const now = new Date();

  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      ownerId: employee.id,
      assignedAt: now,
      assignedById: assignedById || null,
    },
    include: {
      owner: { select: { firstName: true, lastName: true, email: true } },
      unit: { select: { name: true } },
    },
  });

  await prisma.assignmentLog.create({
    data: {
      leadId,
      fromEmployeeId,
      toEmployeeId: employee.id,
      assignedById: assignedById || null,
      reason: reason || 'Manual Lead Assignment',
    },
  });

  return updatedLead;
};

/**
 * Assigns multiple leads to a single employee.
 * Supports both explicit array of leadIds OR automatic selection by quantity (count).
 */
export const bulkAssignLeads = async (
  leadIds: string[],
  employeeId: string,
  assignedById?: string,
  count?: number,
  criteria?: 'unassigned' | 'new' | 'any'
) => {
  const employee = await resolveUser(employeeId);
  if (!employee) throw new Error('Employee not found');

  let targetLeadIds = Array.isArray(leadIds) ? [...leadIds] : [];

  // If leadIds is empty and count is specified, fetch top N leads matching criteria
  if (targetLeadIds.length === 0 && count && count > 0) {
    const whereClause: any = {};
    if (criteria === 'unassigned') {
      whereClause.ownerId = null;
    } else if (criteria === 'new') {
      whereClause.status = 'new';
    }
    const availableLeads = await prisma.lead.findMany({
      where: whereClause,
      take: count,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    targetLeadIds = availableLeads.map((l) => l.id);
  }

  if (targetLeadIds.length === 0) {
    throw new Error('No leads available to assign');
  }

  const leads = await prisma.lead.findMany({
    where: { id: { in: targetLeadIds } },
  });

  const now = new Date();

  await Promise.all(
    leads.map(async (l) => {
      await prisma.lead.update({
        where: { id: l.id },
        data: {
          ownerId: employee.id,
          assignedAt: now,
          assignedById: assignedById || null,
        },
      });

      await prisma.assignmentLog.create({
        data: {
          leadId: l.id,
          fromEmployeeId: l.ownerId,
          toEmployeeId: employee.id,
          assignedById: assignedById || null,
          reason: `Assigned in bulk (${leads.length} leads) to ${employee.firstName} ${employee.lastName}`,
        },
      });
    })
  );

  return {
    success: true,
    assignedCount: leads.length,
    employeeId: employee.id,
    targetEmployee: `${employee.firstName} ${employee.lastName}`.trim(),
  };
};

/**
 * Helper alias: Assign multiple leads to an employee
 */
export const assignMultipleLeadsToEmployee = bulkAssignLeads;

/**
 * Distributes multiple leads across multiple employees (Round Robin / Equal Split or Workload-Balanced).
 */
export const distributeLeads = async (
  leadIds: string[],
  employeeIds: string[],
  strategy: 'round_robin' | 'equal_split' | 'workload' = 'round_robin',
  assignedById?: string
) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new Error('Please select at least one lead to distribute');
  }
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new Error('Please select at least one employee');
  }

  // Resolve all employees
  const resolvedEmployees: any[] = [];
  for (const empId of employeeIds) {
    const u = await resolveUser(empId);
    if (u && !resolvedEmployees.some((x) => x.id === u.id)) {
      resolvedEmployees.push(u);
    }
  }

  if (resolvedEmployees.length === 0) {
    throw new Error('No valid employees found for distribution');
  }

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
  });

  if (leads.length === 0) {
    throw new Error('No matching leads found');
  }

  const now = new Date();
  const summary: Record<string, { employeeName: string; count: number }> = {};
  resolvedEmployees.forEach((emp) => {
    summary[emp.id] = {
      employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
      count: 0,
    };
  });

  if (strategy === 'workload') {
    // Workload-balanced: calculate active leads for each employee
    const workloads = await Promise.all(
      resolvedEmployees.map(async (emp) => {
        const count = await prisma.lead.count({
          where: {
            ownerId: emp.id,
            status: { notIn: ['won', 'lost', 'converted'] },
          },
        });
        return { emp, activeCount: count };
      })
    );

    for (const lead of leads) {
      workloads.sort((a, b) => a.activeCount - b.activeCount);
      const target = workloads[0];

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ownerId: target.emp.id,
          assignedAt: now,
          assignedById: assignedById || null,
        },
      });

      await prisma.assignmentLog.create({
        data: {
          leadId: lead.id,
          fromEmployeeId: lead.ownerId,
          toEmployeeId: target.emp.id,
          assignedById: assignedById || null,
          reason: `Bulk Distributed (Workload-Balanced) by Admin`,
        },
      });

      target.activeCount += 1;
      summary[target.emp.id].count += 1;
    }
  } else {
    // Equal Split / Round Robin
    for (let i = 0; i < leads.length; i++) {
      const targetEmp = resolvedEmployees[i % resolvedEmployees.length];
      const lead = leads[i];

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ownerId: targetEmp.id,
          assignedAt: now,
          assignedById: assignedById || null,
        },
      });

      await prisma.assignmentLog.create({
        data: {
          leadId: lead.id,
          fromEmployeeId: lead.ownerId,
          toEmployeeId: targetEmp.id,
          assignedById: assignedById || null,
          reason: `Bulk Distributed (Equal Split) by Admin`,
        },
      });

      summary[targetEmp.id].count += 1;
    }
  }

  return {
    totalAssigned: leads.length,
    strategy,
    breakdown: Object.entries(summary).map(([empId, data]) => ({
      employeeId: empId,
      employeeName: data.employeeName,
      assignedCount: data.count,
    })),
  };
};

/**
 * Reassigns a lead to a new employee with audit reason.
 */
export const reassignLead = async (
  leadId: string,
  newEmployeeId: string,
  assignedById?: string,
  reason?: string
) => {
  return manualAssignLead(leadId, newEmployeeId, assignedById, reason || 'Reassigned by Admin');
};

/**
 * Returns current workload (active lead count) for all employees across units.
 */
export const getEmployeeWorkloads = async () => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: { select: { name: true } },
      unitEmployees: {
        include: { unit: { select: { id: true, name: true } } },
      },
    },
    orderBy: { firstName: 'asc' },
  });

  const workloads = await Promise.all(
    users.map(async (u) => {
      const activeLeads = await prisma.lead.count({
        where: {
          ownerId: u.id,
          status: { notIn: ['won', 'lost', 'converted'] },
        },
      });

      const totalLeads = await prisma.lead.count({
        where: { ownerId: u.id },
      });

      const newLeads = await prisma.lead.count({
        where: { ownerId: u.id, status: 'new' },
      });

      const convertedLeads = await prisma.lead.count({
        where: { ownerId: u.id, status: 'converted' },
      });

      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        phone: u.phone,
        role: u.role.name,
        activeLeads,
        newLeads,
        convertedLeads,
        totalLeads,
        units: u.unitEmployees.map((ue) => ({
          unitId: ue.unit.id,
          unitName: ue.unit.name,
          maxCapacity: ue.maxCapacity,
          isActive: ue.isActive,
        })),
      };
    })
  );

  return workloads;
};

/**
 * Assigns leads to an employee by serial index range (e.g. #1 to #50) or by quantity (e.g. 10 to 100 leads).
 */
export const assignLeadsBySerialOrQuantity = async ({
  employeeId,
  quantity,
  startSerial = 1,
  endSerial,
  filterCriteria = 'unassigned', // 'unassigned' | 'new' | 'all'
  assignedById,
}: {
  employeeId: string;
  quantity?: number;
  startSerial?: number;
  endSerial?: number;
  filterCriteria?: 'unassigned' | 'new' | 'all';
  assignedById?: string;
}) => {
  const employee = await resolveUser(employeeId);
  if (!employee) throw new Error('Employee not found');

  const where: any = {};
  if (filterCriteria === 'unassigned') {
    where.ownerId = null;
  } else if (filterCriteria === 'new') {
    where.status = 'new';
  }

  const allMatchingLeads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'asc' }, // Serial chronological order
    select: {
      id: true,
      fullName: true,
      phone: true,
      city: true,
      source: true,
      status: true,
      ownerId: true,
      createdAt: true,
    },
  });

  if (allMatchingLeads.length === 0) {
    throw new Error(`No ${filterCriteria} leads found in the system to assign.`);
  }

  let selectedLeads: typeof allMatchingLeads = [];

  if (endSerial !== undefined && endSerial !== null && endSerial >= startSerial) {
    const startIndex = Math.max(0, startSerial - 1);
    const endIndex = Math.min(allMatchingLeads.length, endSerial);
    selectedLeads = allMatchingLeads.slice(startIndex, endIndex);
  } else if (quantity && quantity > 0) {
    const startIndex = Math.max(0, (startSerial || 1) - 1);
    selectedLeads = allMatchingLeads.slice(startIndex, startIndex + quantity);
  } else {
    selectedLeads = allMatchingLeads.slice(0, 10);
  }

  if (selectedLeads.length === 0) {
    throw new Error('No leads matched the specified serial range or quantity.');
  }

  const leadIds = selectedLeads.map((l) => l.id);
  const now = new Date();

  await prisma.lead.updateMany({
    where: { id: { in: leadIds } },
    data: {
      ownerId: employee.id,
      assignedAt: now,
      assignedById: assignedById || null,
    },
  });

  await Promise.all(
    selectedLeads.map((l, idx) =>
      prisma.assignmentLog.create({
        data: {
          leadId: l.id,
          fromEmployeeId: l.ownerId,
          toEmployeeId: employee.id,
          assignedById: assignedById || null,
          reason: `Serial Assignment (Serial #${(startSerial || 1) + idx}) to ${employee.firstName} ${employee.lastName}`,
        },
      })
    )
  );

  return {
    success: true,
    assignedCount: selectedLeads.length,
    startSerial: startSerial || 1,
    endSerial: (startSerial || 1) + selectedLeads.length - 1,
    employeeId: employee.id,
    targetEmployee: `${employee.firstName} ${employee.lastName}`.trim(),
    assignedLeads: selectedLeads.map((l, idx) => ({
      serialNo: (startSerial || 1) + idx,
      id: l.id,
      name: l.fullName,
      phone: l.phone,
      city: l.city,
    })),
  };
};

/**
 * Returns all unassigned leads (ownerId is null).
 */
export const getUnassignedLeads = async () => {
  return prisma.lead.findMany({
    where: { ownerId: null },
    orderBy: { createdAt: 'desc' },
    include: {
      unit: { select: { name: true } },
    },
  });
};

export interface AutoWaterfallParams {
  employeeIds?: string[];
  chunkSize?: number; // e.g. 100 leads per employee
  filterCriteria?: 'unassigned' | 'new' | 'all';
  mode?: 'waterfall' | 'workload_balanced' | 'equal_share';
  targetCap?: number; // max active leads cap for workload_balanced mode
  assignedById?: string;
}

/**
 * Auto Waterfall / Workload-Based Multi-Employee Lead Assigner.
 * Assigns exactly N leads (default 100) to Employee 1, then automatically moves to Employee 2 for the next 100, etc.
 * Guarantees STRICT ZERO DUPLICATION across all employees.
 */
export const autoWaterfallAssignLeads = async ({
  employeeIds,
  chunkSize = 100,
  filterCriteria = 'unassigned',
  mode = 'waterfall',
  targetCap = 100,
  assignedById,
}: AutoWaterfallParams) => {
  // 1. Resolve target employees
  let targetEmployees: any[] = [];
  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    for (const eid of employeeIds) {
      const u = await resolveUser(eid);
      if (u && !targetEmployees.some((x) => x.id === u.id)) {
        targetEmployees.push(u);
      }
    }
  } else {
    targetEmployees = await prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: { firstName: 'asc' },
    });
  }

  if (targetEmployees.length === 0) {
    throw new Error('No eligible active employees found for auto assignment.');
  }

  // 2. Fetch candidate leads strictly avoiding already assigned leads
  const where: any = {};
  if (filterCriteria === 'unassigned') {
    where.ownerId = null;
  } else if (filterCriteria === 'new') {
    where.status = 'new';
    where.ownerId = null;
  } else {
    // If 'all', still prioritize unassigned leads so active work is not overwritten
    where.ownerId = null;
  }

  const candidateLeads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'asc' }, // Serial chronological order: oldest to newest
    select: {
      id: true,
      fullName: true,
      phone: true,
      city: true,
      source: true,
      status: true,
      ownerId: true,
      createdAt: true,
    },
  });

  if (candidateLeads.length === 0) {
    throw new Error('No available unassigned leads found in the system to auto-assign.');
  }

  const effectiveChunk = Math.max(1, chunkSize);
  const now = new Date();
  const distributionResults: any[] = [];
  const assignedLeadIds = new Set<string>();

  if (mode === 'equal_share') {
    // Mode C: Strict Fair Equal Distribution across all selected employees (No 0 Leads)
    const total = candidateLeads.length;
    const numEmps = targetEmployees.length;
    const basePerEmployee = Math.floor(total / numEmps);
    const remainder = total % numEmps;
    let currentPointer = 0;

    for (let i = 0; i < numEmps; i++) {
      const emp = targetEmployees[i];
      const quota = basePerEmployee + (i < remainder ? 1 : 0);
      if (quota <= 0) continue;

      const slice = candidateLeads.slice(currentPointer, currentPointer + quota);
      if (slice.length === 0) continue;

      for (const lead of slice) {
        if (assignedLeadIds.has(lead.id)) {
          throw new Error(`Duplicate lead detection: Lead #${lead.id} cannot be assigned to multiple employees.`);
        }
        assignedLeadIds.add(lead.id);
      }

      const sliceIds = slice.map((l) => l.id);
      const startSerial = currentPointer + 1;
      const endSerial = currentPointer + slice.length;

      await prisma.lead.updateMany({
        where: { id: { in: sliceIds } },
        data: {
          ownerId: emp.id,
          assignedAt: now,
          assignedById: assignedById || null,
        },
      });

      await Promise.all(
        slice.map((l, idx) =>
          prisma.assignmentLog.create({
            data: {
              leadId: l.id,
              fromEmployeeId: l.ownerId,
              toEmployeeId: emp.id,
              assignedById: assignedById || null,
              reason: `Equal Share Auto Assignment (Batch of ${slice.length}, Serial #${startSerial + idx}) to ${emp.firstName} ${emp.lastName}`,
            },
          })
        )
      );

      const activeAfter = await prisma.lead.count({
        where: {
          ownerId: emp.id,
          status: { notIn: ['won', 'lost', 'converted'] },
        },
      });

      distributionResults.push({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.email,
        phone: emp.phone,
        assignedCount: slice.length,
        startSerial,
        endSerial,
        activeAfter,
      });

      currentPointer += slice.length;
    }
  } else if (mode === 'workload_balanced') {
    // Mode B: Workload-Balanced distribution (fills lowest workload first up to targetCap)
    const workloads = await Promise.all(
      targetEmployees.map(async (emp) => {
        const activeCount = await prisma.lead.count({
          where: {
            ownerId: emp.id,
            status: { notIn: ['won', 'lost', 'converted'] },
          },
        });
        return { emp, activeCount, assigned: [] as typeof candidateLeads };
      })
    );

    let leadIdx = 0;
    while (leadIdx < candidateLeads.length) {
      workloads.sort((a, b) => a.activeCount - b.activeCount);
      const target = workloads[0];

      if (targetCap && target.activeCount >= targetCap) {
        break; // Everyone reached target cap
      }

      const lead = candidateLeads[leadIdx];
      if (assignedLeadIds.has(lead.id)) {
        throw new Error(`Data integrity violation: duplicate lead ${lead.id} detected.`);
      }
      assignedLeadIds.add(lead.id);

      target.assigned.push(lead);
      target.activeCount += 1;
      leadIdx += 1;
    }

    for (const w of workloads) {
      if (w.assigned.length === 0) continue;
      const ids = w.assigned.map((l) => l.id);

      await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: {
          ownerId: w.emp.id,
          assignedAt: now,
          assignedById: assignedById || null,
        },
      });

      await Promise.all(
        w.assigned.map((l, idx) =>
          prisma.assignmentLog.create({
            data: {
              leadId: l.id,
              fromEmployeeId: l.ownerId,
              toEmployeeId: w.emp.id,
              assignedById: assignedById || null,
              reason: `Auto Workload Balanced Assignment to ${w.emp.firstName} ${w.emp.lastName}`,
            },
          })
        )
      );

      distributionResults.push({
        employeeId: w.emp.id,
        employeeName: `${w.emp.firstName} ${w.emp.lastName}`.trim(),
        email: w.emp.email,
        phone: w.emp.phone,
        assignedCount: w.assigned.length,
        newActiveCount: w.activeCount,
      });
    }
  } else {
    // Mode A: Sequential Waterfall (100 leads to Emp 1, then next 100 to Emp 2, etc.)
    let currentPointer = 0;

    for (const emp of targetEmployees) {
      if (currentPointer >= candidateLeads.length) break;

      const slice = candidateLeads.slice(currentPointer, currentPointer + effectiveChunk);
      if (slice.length === 0) break;

      // STRICT ZERO DUPLICATION CHECK
      for (const lead of slice) {
        if (assignedLeadIds.has(lead.id)) {
          throw new Error(`Duplicate lead detection: Lead #${lead.id} cannot be assigned to multiple employees.`);
        }
        assignedLeadIds.add(lead.id);
      }

      const sliceIds = slice.map((l) => l.id);
      const startSerial = currentPointer + 1;
      const endSerial = currentPointer + slice.length;

      await prisma.lead.updateMany({
        where: { id: { in: sliceIds } },
        data: {
          ownerId: emp.id,
          assignedAt: now,
          assignedById: assignedById || null,
        },
      });

      await Promise.all(
        slice.map((l, idx) =>
          prisma.assignmentLog.create({
            data: {
              leadId: l.id,
              fromEmployeeId: l.ownerId,
              toEmployeeId: emp.id,
              assignedById: assignedById || null,
              reason: `Auto Waterfall Assignment (Batch of ${slice.length}, Serial #${startSerial + idx}) to ${emp.firstName} ${emp.lastName}`,
            },
          })
        )
      );

      const activeAfter = await prisma.lead.count({
        where: {
          ownerId: emp.id,
          status: { notIn: ['won', 'lost', 'converted'] },
        },
      });

      distributionResults.push({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.email,
        phone: emp.phone,
        assignedCount: slice.length,
        startSerial,
        endSerial,
        activeAfter,
      });

      currentPointer += slice.length;
    }
  }

  return {
    success: true,
    mode,
    chunkSize: effectiveChunk,
    totalAssigned: assignedLeadIds.size,
    uniqueConfirmed: true,
    remainingPool: candidateLeads.length - assignedLeadIds.size,
    breakdown: distributionResults,
  };
};

export interface RoundRobinWorkloadAssignOptions {
  employeeIds?: string[];
  filterCriteria?: 'unassigned' | 'new' | 'all';
  maxTotalLeads?: number;
  assignedById?: string;
}

/**
 * Pure Round-Robin & Workload Balanced Auto-Assigner for ALL Active Employees.
 * - Automatically balances existing workload first (filling staff with fewer leads).
 * - Distributes unassigned leads strictly in a round-robin rotation.
 * - Ensures 100% fair and equal lead distribution across all employees.
 */
export const roundRobinWorkloadAutoAssignAll = async ({
  employeeIds,
  filterCriteria = 'unassigned',
  maxTotalLeads,
  assignedById,
}: RoundRobinWorkloadAssignOptions = {}) => {
  // 1. Identify target employees
  let targetEmployees: any[] = [];
  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    for (const eid of employeeIds) {
      const u = await resolveUser(eid);
      if (u && !targetEmployees.some((x) => x.id === u.id)) {
        targetEmployees.push(u);
      }
    }
  }

  if (targetEmployees.length === 0) {
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
              'Sales officer ',
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

  // Fallback if role names differ: select all active non-SuperAdmin users
  if (targetEmployees.length === 0) {
    targetEmployees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: { not: 'Super Admin' },
        },
      },
      include: { role: true },
      orderBy: { firstName: 'asc' },
    });
  }

  if (targetEmployees.length === 0) {
    throw new Error('No active sales employees found in the system to assign leads.');
  }

  // 2. Fetch candidate leads
  const where: any = {};
  if (filterCriteria === 'unassigned') {
    where.ownerId = null;
  } else if (filterCriteria === 'new') {
    where.status = 'new';
    where.ownerId = null;
  } else {
    where.ownerId = null;
  }

  const candidateLeads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: maxTotalLeads && maxTotalLeads > 0 ? maxTotalLeads : undefined,
    select: {
      id: true,
      fullName: true,
      phone: true,
      city: true,
      source: true,
      status: true,
      ownerId: true,
      createdAt: true,
    },
  });

  if (candidateLeads.length === 0) {
    return {
      success: false,
      message: 'No unassigned leads found in the system to distribute.',
      totalAssigned: 0,
      employeesCount: targetEmployees.length,
      breakdown: [],
    };
  }

  // 3. Compute active workloads for all employees
  const workloads = await Promise.all(
    targetEmployees.map(async (emp, idx) => {
      const activeCount = await prisma.lead.count({
        where: {
          ownerId: emp.id,
          status: { notIn: ['won', 'lost', 'converted'] },
        },
      });
      return {
        emp,
        tieBreakerIndex: idx,
        activeCount,
        assignedLeads: [] as typeof candidateLeads,
      };
    })
  );

  // 4. Distribute using Round-Robin + Workload Balancing
  let rrCycle = 0;
  for (const lead of candidateLeads) {
    // Sort: lowest activeCount first; on ties, rotate round-robin by (tieBreakerIndex + rrCycle) % N
    workloads.sort((a, b) => {
      if (a.activeCount !== b.activeCount) {
        return a.activeCount - b.activeCount;
      }
      const rotA = (a.tieBreakerIndex + rrCycle) % workloads.length;
      const rotB = (b.tieBreakerIndex + rrCycle) % workloads.length;
      return rotA - rotB;
    });

    const target = workloads[0];
    target.assignedLeads.push(lead);
    target.activeCount += 1;
    rrCycle++;
  }

  // 5. Batch update leads in database & create assignment logs
  const now = new Date();
  for (const w of workloads) {
    if (w.assignedLeads.length === 0) continue;
    const leadIds = w.assignedLeads.map((l) => l.id);

    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: {
        ownerId: w.emp.id,
        assignedAt: now,
        assignedById: assignedById || null,
      },
    });

    // Create assignment logs in chunks of 50 to avoid connection limits
    const chunkSize = 50;
    for (let i = 0; i < w.assignedLeads.length; i += chunkSize) {
      const chunk = w.assignedLeads.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((l) =>
          prisma.assignmentLog.create({
            data: {
              leadId: l.id,
              fromEmployeeId: l.ownerId,
              toEmployeeId: w.emp.id,
              assignedById: assignedById || null,
              reason: `Round Robin & Workload Balanced Auto-Assignment to ${w.emp.firstName} ${w.emp.lastName}`,
            },
          })
        )
      );
    }

    // Update UnitEmployee lastAssignedAt if exists
    await prisma.unitEmployee.updateMany({
      where: { employeeId: w.emp.id },
      data: { lastAssignedAt: now },
    });
  }

  const breakdown = workloads.map((w) => ({
    employeeId: w.emp.id,
    employeeName: `${w.emp.firstName} ${w.emp.lastName}`.trim(),
    phone: w.emp.phone,
    email: w.emp.email,
    role: w.emp.role?.name || 'Sales Executive',
    assignedCount: w.assignedLeads.length,
    totalActiveLeads: w.activeCount,
  }));

  return {
    success: true,
    message: `Successfully distributed ${candidateLeads.length} leads across ${targetEmployees.length} employees evenly using Round Robin & Workload Balancing!`,
    totalAssigned: candidateLeads.length,
    employeesCount: targetEmployees.length,
    breakdown,
  };
};



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
      message: 'All leads are already unassigned.',
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
    message: `Successfully unassigned ${result.count} leads from all employees. All leads are now available in the pool!`,
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
    throw new Error('No active sales employees found for lead distribution.');
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
      message: 'No unassigned leads available for distribution.',
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
    message: `Successfully distributed ${numLeads} leads equally across ${numEmployees} employees (~${basePerEmployee}${remainder > 0 ? `-${basePerEmployee + 1}` : ''} leads per employee)!`,
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
