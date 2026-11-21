import crmApi from '@/api/crmApi';

export interface AssignMultipleLeadsParams {
  leadIds: string[];
  employeeId: string;
}

export interface AssignLeadsByQuantityParams {
  employeeId: string;
  count: number;
  criteria?: 'unassigned' | 'new' | 'any';
}

export interface DistributeLeadsParams {
  leadIds: string[];
  employeeIds: string[];
  strategy?: 'round_robin' | 'workload';
}

/**
 * Assigns multiple leads to a single employee by their Lead IDs.
 * @param leadIds Array of Lead IDs to assign
 * @param employeeId Target employee ID / UUID
 */
export const assignMultipleLeadsToEmployee = async (
  leadIds: string[],
  employeeId: string
) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new Error('Please provide at least one lead ID');
  }
  if (!employeeId) {
    throw new Error('Please select an employee');
  }

  const res = await crmApi.post('/leads/assign/bulk', {
    leadIds,
    employeeId,
  });

  return res.data;
};

/**
 * Assigns a specific quantity of unassigned/new leads to an employee at once.
 * @param count Number of leads to assign (e.g. 10)
 * @param employeeId Target employee ID / UUID
 * @param criteria Filter for leads: 'unassigned' | 'new' | 'any'
 */
export const assignLeadsByQuantityToEmployee = async (
  count: number,
  employeeId: string,
  criteria: 'unassigned' | 'new' | 'any' = 'unassigned'
) => {
  if (!count || count <= 0) {
    throw new Error('Please enter a valid count greater than 0');
  }
  if (!employeeId) {
    throw new Error('Please select an employee');
  }

  const res = await crmApi.post('/leads/assign/bulk', {
    count,
    employeeId,
    criteria,
  });

  return res.data;
};

/**
 * Distributes multiple leads evenly or workload-balanced across multiple employees.
 * @param leadIds Array of Lead IDs to distribute
 * @param employeeIds Array of Employee IDs to receive leads
 * @param strategy 'round_robin' (equal split) or 'workload'
 */
export const distributeLeadsAcrossEmployees = async (
  leadIds: string[],
  employeeIds: string[],
  strategy: 'round_robin' | 'workload' = 'round_robin'
) => {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new Error('Please select at least one lead');
  }
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new Error('Please select at least one employee');
  }

  const res = await crmApi.post('/leads/assign/distribute', {
    leadIds,
    employeeIds,
    strategy,
  });

  return res.data;
};

/**
 * Assigns leads by serial range (e.g. from serial #1 to #50) or by exact quantity (10 to 100 leads).
 */
export const assignLeadsBySerialOrQuantity = async ({
  employeeId,
  quantity,
  startSerial = 1,
  endSerial,
  filterCriteria = 'unassigned',
}: {
  employeeId: string;
  quantity?: number;
  startSerial?: number;
  endSerial?: number;
  filterCriteria?: 'unassigned' | 'new' | 'all';
}) => {
  if (!employeeId) {
    throw new Error('Please select an employee');
  }

  const res = await crmApi.post('/leads/assign/serial-quantity', {
    employeeId,
    quantity,
    startSerial,
    endSerial,
    filterCriteria,
  });

  return res.data;
};

/**
 * Fetches current live workload & lead counts for all employees (kis ke paas kitni lead hain).
 */
export const fetchEmployeeWorkloads = async () => {
  const res = await crmApi.get('/leads/workload');
  return res.data;
};

export interface AutoWaterfallAssignParams {
  employeeIds?: string[];
  chunkSize?: number; // e.g. 100 leads per employee
  filterCriteria?: 'unassigned' | 'new' | 'all';
  mode?: 'waterfall' | 'workload_balanced' | 'equal_share';
  targetCap?: number;
}

/**
 * Auto-assigns leads in sequential batches (e.g. 100 leads to Employee 1, then next 100 to Employee 2, etc.)
 * or dynamically balances workloads without duplicating any lead across employees.
 */
export const autoWaterfallAssignLeads = async ({
  employeeIds,
  chunkSize = 100,
  filterCriteria = 'unassigned',
  mode = 'waterfall',
  targetCap = 100,
}: AutoWaterfallAssignParams) => {
  const res = await crmApi.post('/leads/assign/auto-waterfall', {
    employeeIds,
    chunkSize,
    filterCriteria,
    mode,
    targetCap,
  });
  return res.data;
};


