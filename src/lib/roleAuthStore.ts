// src/lib/roleAuthStore.ts
// Central Data & Permission Store for Super Admin, Admin, and Employee Roles

export type UserRole = 'Super Admin' | 'Admin' | 'Employee';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxEmployees: number;
  features: string[];
  status: 'active' | 'inactive';
}

export interface EmployeePermissions {
  dashboard: { view: boolean };
  leads: {
    view: boolean;
    whatsapp: boolean;
    remark: boolean;
    edit: boolean;
    reminder: boolean;
    quickAdd: boolean;
    import: boolean;
    merge: boolean;
    category: boolean;
    delete: boolean;
  };
  leadReminders: {
    view: boolean;
    whatsapp: boolean;
    takeAction: boolean;
    reschedule: boolean;
  };
  paymentReminders: {
    view: boolean;
    whatsapp: boolean;
    viewInvoice: boolean;
    delete: boolean;
  };
  customers: { create: boolean; edit: boolean; delete: boolean; view: boolean };
  products: { create: boolean; edit: boolean; delete: boolean; view: boolean };
  invoices: { create: boolean; edit: boolean; delete: boolean; view: boolean; whatsapp?: boolean };
  payments: { view: boolean; add: boolean };
  reports: { view: boolean };
  expenses: { manage: boolean };
  attendance: { manage: boolean };
  notifications: { view: boolean };
  settings: { manage: boolean };
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  password?: string;
  address: string;
  gstNumber?: string;
  planId: string;
  planName: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  maxEmployees: number;
}

export interface EmployeeAccount {
  id: string;
  adminId: string;
  adminName: string;
  companyName: string;
  name: string;
  email?: string;
  phone?: string;
  designation: string;
  password?: string;
  status: 'active' | 'inactive';
  permissions: EmployeePermissions;
  createdAt: string;
  lastLogin?: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  adminId?: string;
  action: string;
  description: string;
  ipAddress: string;
  timestamp: string;
}

export interface CustomerItem {
  id: string;
  adminId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  status: 'active' | 'lead' | 'inactive';
  totalBilled: number;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  adminId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  taxRate: number;
  stock: number;
  type: 'product' | 'service';
  status: 'active' | 'inactive';
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  adminId: string;
  customerId: string;
  customerName: string;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  dueDate: string;
  createdAt: string;
  createdBy: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

export interface ExpenseItem {
  id: string;
  adminId: string;
  category: string;
  title: string;
  amount: number;
  date: string;
  loggedBy: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  adminId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  workLog?: string;
}

// Initial Mock Data
const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-basic',
    name: 'Starter Plan',
    priceMonthly: 49,
    priceYearly: 490,
    maxEmployees: 5,
    features: ['Up to 5 Employees', 'Basic Billing', 'Standard Reports', 'Email Support'],
    status: 'active',
  },
  {
    id: 'plan-pro',
    name: 'Professional Plan',
    priceMonthly: 129,
    priceYearly: 1290,
    maxEmployees: 25,
    features: ['Up to 25 Employees', 'Advanced Invoicing', 'Expense Management', 'Priority Support', 'Custom Roles'],
    status: 'active',
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Unlimited',
    priceMonthly: 299,
    priceYearly: 2990,
    maxEmployees: 100,
    features: ['Up to 100 Employees', 'Unlimited Invoices & Products', 'Dedicated Account Manager', 'Custom Workflows', 'API Access'],
    status: 'active',
  },
];

const INITIAL_ADMINS: AdminAccount[] = [
  {
    id: 'admin-1',
    name: 'Robert Vance',
    email: 'admin@incense.com',
    phone: '+1 (555) 234-5678',
    companyName: 'Acme Media Corp',
    password: 'admin123',
    address: '100 Business Blvd, Suite 400, New York, NY',
    gstNumber: 'US987654321GST',
    planId: 'plan-enterprise',
    planName: 'Enterprise Unlimited',
    status: 'active',
    createdAt: '2025-11-10T09:00:00.000Z',
    lastLogin: new Date().toISOString(),
    maxEmployees: 100,
  },
  {
    id: 'admin-2',
    name: 'Sarah Connor',
    email: 'john@techcorp.com',
    phone: '+1 (555) 876-5432',
    companyName: 'Cyberdyne Systems',
    password: 'admin123',
    address: '500 Tech Parkway, San Francisco, CA',
    gstNumber: 'US123456789GST',
    planId: 'plan-pro',
    planName: 'Professional Plan',
    status: 'active',
    createdAt: '2026-01-15T10:30:00.000Z',
    lastLogin: new Date().toISOString(),
    maxEmployees: 25,
  },
];

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  dashboard: { view: true },
  leads: {
    view: true,
    whatsapp: true,
    remark: true,
    edit: true,
    reminder: true,
    quickAdd: true,
    import: true,
    merge: true,
    category: true,
    delete: false,
  },
  leadReminders: {
    view: true,
    whatsapp: true,
    takeAction: true,
    reschedule: true,
  },
  paymentReminders: {
    view: true,
    whatsapp: true,
    viewInvoice: true,
    delete: false,
  },
  customers: { create: true, edit: true, delete: false, view: true },
  products: { create: true, edit: true, delete: false, view: true },
  invoices: { create: true, edit: true, delete: false, view: true, whatsapp: true },
  payments: { view: true, add: true },
  reports: { view: true },
  expenses: { manage: true },
  attendance: { manage: true },
  notifications: { view: true },
  settings: { manage: false },
};

const INITIAL_EMPLOYEES: EmployeeAccount[] = [
  {
    id: 'emp-1',
    adminId: 'admin-1',
    adminName: 'Robert Vance',
    companyName: 'Acme Media Corp',
    name: 'Alex Mercer',
    email: 'employee@incense.com',
    phone: '+1 (555) 345-6789',
    designation: 'Sales & Billing Specialist',
    password: 'emp123',
    status: 'active',
    permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
    createdAt: '2026-02-01T11:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'emp-2',
    adminId: 'admin-1',
    adminName: 'Robert Vance',
    companyName: 'Acme Media Corp',
    name: 'David Miller',
    email: 'david@acmemedia.com',
    phone: '+1 (555) 456-7890',
    designation: 'Account Associate',
    password: 'emp123',
    status: 'active',
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      invoices: { create: true, edit: false, delete: false, view: true },
      expenses: { manage: false },
    },
    createdAt: '2026-02-15T14:20:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'emp-3',
    adminId: 'admin-2',
    adminName: 'Sarah Connor',
    companyName: 'Cyberdyne Systems',
    name: 'Marcus Wright',
    email: 'marcus@cyberdyne.com',
    phone: '+1 (555) 567-8901',
    designation: 'Operations Lead',
    password: 'emp123',
    status: 'active',
    permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
    createdAt: '2026-03-01T09:15:00.000Z',
    lastLogin: new Date().toISOString(),
  },
];

const INITIAL_CUSTOMERS: CustomerItem[] = [
  {
    id: 'cust-1',
    adminId: 'admin-1',
    name: 'Apex Global Logistics',
    email: 'contact@apexglobal.com',
    phone: '+1 (555) 901-2345',
    company: 'Apex Logistics LLC',
    address: '742 Evergreen Terrace, Springfield',
    city: 'Chicago',
    status: 'active',
    totalBilled: 12500,
    createdAt: '2026-01-20T10:00:00.000Z',
  },
  {
    id: 'cust-2',
    adminId: 'admin-1',
    name: 'Starlight Retailers',
    email: 'billing@starlight.io',
    phone: '+1 (555) 890-1234',
    company: 'Starlight Retail Group',
    address: '88 Commerce Street',
    city: 'Dallas',
    status: 'active',
    totalBilled: 8400,
    createdAt: '2026-02-05T12:00:00.000Z',
  },
  {
    id: 'cust-3',
    adminId: 'admin-2',
    name: 'Omni Consumer Products',
    email: 'accounts@ocp.com',
    phone: '+1 (555) 789-0123',
    company: 'OCP Inc',
    address: '100 Metro Plaza',
    city: 'Detroit',
    status: 'active',
    totalBilled: 45000,
    createdAt: '2026-02-12T15:30:00.000Z',
  },
];

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    adminId: 'admin-1',
    name: 'Media Campaign Package A',
    sku: 'PKG-MEDIA-01',
    category: 'Advertising',
    price: 2500,
    taxRate: 18,
    stock: 99,
    type: 'service',
    status: 'active',
  },
  {
    id: 'prod-2',
    adminId: 'admin-1',
    name: 'Brand Video Production',
    sku: 'SRV-VIDEO-02',
    category: 'Production',
    price: 4500,
    taxRate: 18,
    stock: 50,
    type: 'service',
    status: 'active',
  },
  {
    id: 'prod-3',
    adminId: 'admin-2',
    name: 'Cyber Security Consultation',
    sku: 'SRV-SEC-101',
    category: 'IT Services',
    price: 3500,
    taxRate: 18,
    stock: 20,
    type: 'service',
    status: 'active',
  },
];

const INITIAL_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-101',
    invoiceNumber: 'INV-2026-001',
    adminId: 'admin-1',
    customerId: 'cust-1',
    customerName: 'Apex Global Logistics',
    amount: 5000,
    tax: 900,
    discount: 0,
    total: 5900,
    status: 'paid',
    dueDate: '2026-03-15',
    createdAt: '2026-02-15T10:00:00.000Z',
    createdBy: 'Robert Vance (Admin)',
    items: [{ description: 'Media Campaign Package A', quantity: 2, unitPrice: 2500, total: 5000 }],
  },
  {
    id: 'inv-102',
    invoiceNumber: 'INV-2026-002',
    adminId: 'admin-1',
    customerId: 'cust-2',
    customerName: 'Starlight Retailers',
    amount: 4500,
    tax: 810,
    discount: 310,
    total: 5000,
    status: 'pending',
    dueDate: '2026-04-01',
    createdAt: '2026-03-01T14:30:00.000Z',
    createdBy: 'Alex Mercer (Employee)',
    items: [{ description: 'Brand Video Production', quantity: 1, unitPrice: 4500, total: 4500 }],
  },
  {
    id: 'inv-103',
    invoiceNumber: 'INV-2026-003',
    adminId: 'admin-2',
    customerId: 'cust-3',
    customerName: 'Omni Consumer Products',
    amount: 7000,
    tax: 1260,
    discount: 0,
    total: 8260,
    status: 'paid',
    dueDate: '2026-03-20',
    createdAt: '2026-02-20T11:00:00.000Z',
    createdBy: 'Sarah Connor (Admin)',
    items: [{ description: 'Cyber Security Consultation', quantity: 2, unitPrice: 3500, total: 7000 }],
  },
];

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-1',
    adminId: 'admin-1',
    category: 'Software Subscription',
    title: 'Adobe Creative Cloud Renewal',
    amount: 599,
    date: '2026-03-01',
    loggedBy: 'Alex Mercer',
    notes: 'Monthly team subscription',
  },
  {
    id: 'exp-2',
    adminId: 'admin-1',
    category: 'Office Supplies',
    title: 'Print & Banner Station Material',
    amount: 320,
    date: '2026-03-10',
    loggedBy: 'Robert Vance',
    notes: 'Event signage materials',
  },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    employeeId: 'emp-1',
    employeeName: 'Alex Mercer',
    adminId: 'admin-1',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00 AM',
    status: 'present',
    workLog: 'Working on billing & client invoices',
  },
];

const INITIAL_LOGS: ActivityLogItem[] = [
  {
    id: 'log-1',
    userId: 'super-admin-0',
    userName: 'Super Admin',
    userRole: 'Super Admin',
    action: 'Admin Account Created',
    description: 'Created Admin account for Robert Vance (Acme Media Corp)',
    ipAddress: '192.168.1.1',
    timestamp: '2025-11-10T09:00:00.000Z',
  },
  {
    id: 'log-2',
    userId: 'admin-1',
    userName: 'Robert Vance',
    userRole: 'Admin',
    adminId: 'admin-1',
    action: 'Employee Added',
    description: 'Created employee account for Alex Mercer with standard permissions',
    ipAddress: '192.168.1.45',
    timestamp: '2026-02-01T11:00:00.000Z',
  },
];

// LocalStorage Helper Functions
export const initRoleStore = () => {
  if (!localStorage.getItem('sys_plans')) {
    localStorage.setItem('sys_plans', JSON.stringify(INITIAL_PLANS));
  }
  if (!localStorage.getItem('sys_admins')) {
    localStorage.setItem('sys_admins', JSON.stringify(INITIAL_ADMINS));
  }
  if (!localStorage.getItem('sys_employees') || localStorage.getItem('sys_employees') === '[]') {
    localStorage.setItem('sys_employees', JSON.stringify(INITIAL_EMPLOYEES));
  }
  if (!localStorage.getItem('sys_customers')) {
    localStorage.setItem('sys_customers', JSON.stringify(INITIAL_CUSTOMERS));
  }
  if (!localStorage.getItem('sys_products')) {
    localStorage.setItem('sys_products', JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem('sys_invoices')) {
    localStorage.setItem('sys_invoices', JSON.stringify(INITIAL_INVOICES));
  }
  if (!localStorage.getItem('sys_expenses')) {
    localStorage.setItem('sys_expenses', JSON.stringify(INITIAL_EXPENSES));
  }
  if (!localStorage.getItem('sys_attendance')) {
    localStorage.setItem('sys_attendance', JSON.stringify(INITIAL_ATTENDANCE));
  }
  if (!localStorage.getItem('sys_activity_logs')) {
    localStorage.setItem('sys_activity_logs', JSON.stringify(INITIAL_LOGS));
  }
};

// Auto-run init
initRoleStore();

// --- Activity Log Service ---
export const logActivity = (
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  description: string,
  adminId?: string
) => {
  const logs: ActivityLogItem[] = JSON.parse(localStorage.getItem('sys_activity_logs') || '[]');
  const newLog: ActivityLogItem = {
    id: `log-${Date.now()}`,
    userId,
    userName,
    userRole,
    adminId,
    action,
    description,
    ipAddress: '127.0.0.1 (Local Session)',
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  localStorage.setItem('sys_activity_logs', JSON.stringify(logs));
};

export const getActivityLogs = (): ActivityLogItem[] => {
  return JSON.parse(localStorage.getItem('sys_activity_logs') || '[]');
};

// --- Plans Service ---
export const getPlans = (): SubscriptionPlan[] => {
  return JSON.parse(localStorage.getItem('sys_plans') || '[]');
};

export const savePlans = (plans: SubscriptionPlan[]) => {
  localStorage.setItem('sys_plans', JSON.stringify(plans));
};

// --- Admin Accounts Service ---
export const getAdmins = (): AdminAccount[] => {
  return JSON.parse(localStorage.getItem('sys_admins') || '[]');
};

export const saveAdmin = (admin: Partial<AdminAccount>): AdminAccount => {
  const admins = getAdmins();
  if (admin.id) {
    const idx = admins.findIndex((a) => a.id === admin.id);
    if (idx !== -1) {
      admins[idx] = { ...admins[idx], ...admin };
      localStorage.setItem('sys_admins', JSON.stringify(admins));
      return admins[idx];
    }
  }
  const newAdmin: AdminAccount = {
    id: `admin-${Date.now()}`,
    name: admin.name || '',
    email: admin.email || '',
    phone: admin.phone || '',
    companyName: admin.companyName || '',
    password: admin.password || 'admin123',
    address: admin.address || '',
    gstNumber: admin.gstNumber || '',
    planId: admin.planId || 'plan-basic',
    planName: admin.planName || 'Starter Plan',
    status: admin.status || 'active',
    createdAt: new Date().toISOString(),
    maxEmployees: admin.maxEmployees || 5,
  };
  admins.unshift(newAdmin);
  localStorage.setItem('sys_admins', JSON.stringify(admins));

  logActivity('super-admin-0', 'Super Admin', 'Super Admin', 'Create Admin', `Created new Admin account for ${newAdmin.name} (${newAdmin.companyName})`);
  return newAdmin;
};

export const toggleAdminStatus = (id: string) => {
  const admins = getAdmins();
  const admin = admins.find((a) => a.id === id);
  if (admin) {
    admin.status = admin.status === 'active' ? 'inactive' : 'active';
    localStorage.setItem('sys_admins', JSON.stringify(admins));
    logActivity('super-admin-0', 'Super Admin', 'Super Admin', 'Update Admin Status', `Changed status of ${admin.name} to ${admin.status}`);
  }
};

export const deleteAdmin = (id: string) => {
  let admins = getAdmins();
  const target = admins.find((a) => a.id === id);
  admins = admins.filter((a) => a.id !== id);
  localStorage.setItem('sys_admins', JSON.stringify(admins));
  if (target) {
    logActivity('super-admin-0', 'Super Admin', 'Super Admin', 'Delete Admin', `Deleted Admin account ${target.name} (${target.companyName})`);
  }
};

// --- Employee Accounts Service ---
export const getEmployees = (adminId?: string): EmployeeAccount[] => {
  let all: EmployeeAccount[] = [];
  try {
    all = JSON.parse(localStorage.getItem('sys_employees') || '[]');
  } catch (e) {
    all = [];
  }
  if (!Array.isArray(all) || all.length === 0) {
    all = INITIAL_EMPLOYEES;
    try {
      localStorage.setItem('sys_employees', JSON.stringify(INITIAL_EMPLOYEES));
    } catch (_) {}
  }
  if (adminId) {
    return all.filter((e) => e.adminId === adminId);
  }
  return all;
};

export const saveEmployee = (employee: Partial<EmployeeAccount>): EmployeeAccount => {
  const employees: EmployeeAccount[] = JSON.parse(localStorage.getItem('sys_employees') || '[]');
  if (employee.id) {
    const idx = employees.findIndex((e) => e.id === employee.id);
    if (idx !== -1) {
      const merged = { ...employees[idx], ...employee };
      if (!employee.password) {
        merged.password = employees[idx].password || 'Incense@123';
      }
      employees[idx] = merged;
      localStorage.setItem('sys_employees', JSON.stringify(employees));
      return employees[idx];
    }
  }
  const newEmp: EmployeeAccount = {
    id: `emp-${Date.now()}`,
    adminId: employee.adminId || 'admin-1',
    adminName: employee.adminName || 'Admin',
    companyName: employee.companyName || 'Company',
    name: employee.name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    designation: employee.designation || 'Staff Member',
    password: employee.password || 'emp123',
    status: employee.status || 'active',
    permissions: employee.permissions || DEFAULT_EMPLOYEE_PERMISSIONS,
    createdAt: new Date().toISOString(),
  };
  employees.unshift(newEmp);
  localStorage.setItem('sys_employees', JSON.stringify(employees));
  return newEmp;
};

export const deleteEmployee = (id: string) => {
  const employees: EmployeeAccount[] = JSON.parse(localStorage.getItem('sys_employees') || '[]');
  const filtered = employees.filter((e) => e.id !== id);
  localStorage.setItem('sys_employees', JSON.stringify(filtered));
};

// --- Customers Service ---
export const getCustomers = (adminId?: string): CustomerItem[] => {
  const all: CustomerItem[] = JSON.parse(localStorage.getItem('sys_customers') || '[]');
  return adminId ? all.filter((c) => c.adminId === adminId) : all;
};

export const saveCustomer = (customer: Partial<CustomerItem>): CustomerItem => {
  const customers: CustomerItem[] = JSON.parse(localStorage.getItem('sys_customers') || '[]');
  if (customer.id) {
    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...customer };
      localStorage.setItem('sys_customers', JSON.stringify(customers));
      return customers[idx];
    }
  }
  const newCust: CustomerItem = {
    id: `cust-${Date.now()}`,
    adminId: customer.adminId || 'admin-1',
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    company: customer.company || '',
    address: customer.address || '',
    city: customer.city || '',
    status: customer.status || 'active',
    totalBilled: customer.totalBilled || 0,
    createdAt: new Date().toISOString(),
  };
  customers.unshift(newCust);
  localStorage.setItem('sys_customers', JSON.stringify(customers));
  return newCust;
};

export const deleteCustomer = (id: string) => {
  const all: CustomerItem[] = JSON.parse(localStorage.getItem('sys_customers') || '[]');
  const filtered = all.filter((c) => c.id !== id);
  localStorage.setItem('sys_customers', JSON.stringify(filtered));
};

// --- Products Service ---
export const getProducts = (adminId?: string): ProductItem[] => {
  const all: ProductItem[] = JSON.parse(localStorage.getItem('sys_products') || '[]');
  return adminId ? all.filter((p) => p.adminId === adminId) : all;
};

export const saveProduct = (product: Partial<ProductItem>): ProductItem => {
  const products: ProductItem[] = JSON.parse(localStorage.getItem('sys_products') || '[]');
  if (product.id) {
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...product };
      localStorage.setItem('sys_products', JSON.stringify(products));
      return products[idx];
    }
  }
  const newProd: ProductItem = {
    id: `prod-${Date.now()}`,
    adminId: product.adminId || 'admin-1',
    name: product.name || '',
    sku: product.sku || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
    category: product.category || 'General',
    price: product.price || 0,
    taxRate: product.taxRate || 18,
    stock: product.stock || 100,
    type: product.type || 'service',
    status: product.status || 'active',
  };
  products.unshift(newProd);
  localStorage.setItem('sys_products', JSON.stringify(products));
  return newProd;
};

export const deleteProduct = (id: string) => {
  const all: ProductItem[] = JSON.parse(localStorage.getItem('sys_products') || '[]');
  const filtered = all.filter((p) => p.id !== id);
  localStorage.setItem('sys_products', JSON.stringify(filtered));
};

// --- Invoices Service ---
export const getInvoices = (adminId?: string): InvoiceItem[] => {
  const all: InvoiceItem[] = JSON.parse(localStorage.getItem('sys_invoices') || '[]');
  return adminId ? all.filter((i) => i.adminId === adminId) : all;
};

export const saveInvoice = (invoice: Partial<InvoiceItem>): InvoiceItem => {
  const invoices: InvoiceItem[] = JSON.parse(localStorage.getItem('sys_invoices') || '[]');
  if (invoice.id) {
    const idx = invoices.findIndex((i) => i.id === invoice.id);
    if (idx !== -1) {
      invoices[idx] = { ...invoices[idx], ...invoice };
      localStorage.setItem('sys_invoices', JSON.stringify(invoices));
      return invoices[idx];
    }
  }
  const count = invoices.length + 1;
  const newInv: InvoiceItem = {
    id: `inv-${Date.now()}`,
    invoiceNumber: `INV-2026-${String(count).padStart(3, '0')}`,
    adminId: invoice.adminId || 'admin-1',
    customerId: invoice.customerId || 'cust-1',
    customerName: invoice.customerName || 'Customer',
    amount: invoice.amount || 0,
    tax: invoice.tax || 0,
    discount: invoice.discount || 0,
    total: invoice.total || (invoice.amount || 0) + (invoice.tax || 0) - (invoice.discount || 0),
    status: invoice.status || 'pending',
    dueDate: invoice.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    createdBy: invoice.createdBy || 'System',
    items: invoice.items || [],
  };
  invoices.unshift(newInv);
  localStorage.setItem('sys_invoices', JSON.stringify(invoices));
  return newInv;
};

export const deleteInvoice = (id: string) => {
  const all: InvoiceItem[] = JSON.parse(localStorage.getItem('sys_invoices') || '[]');
  const filtered = all.filter((i) => i.id !== id);
  localStorage.setItem('sys_invoices', JSON.stringify(filtered));
};

// --- Expenses Service ---
export const getExpenses = (adminId?: string): ExpenseItem[] => {
  const all: ExpenseItem[] = JSON.parse(localStorage.getItem('sys_expenses') || '[]');
  return adminId ? all.filter((e) => e.adminId === adminId) : all;
};

export const saveExpense = (expense: Partial<ExpenseItem>): ExpenseItem => {
  const expenses: ExpenseItem[] = JSON.parse(localStorage.getItem('sys_expenses') || '[]');
  const newExp: ExpenseItem = {
    id: `exp-${Date.now()}`,
    adminId: expense.adminId || 'admin-1',
    category: expense.category || 'General',
    title: expense.title || '',
    amount: expense.amount || 0,
    date: expense.date || new Date().toISOString().split('T')[0],
    loggedBy: expense.loggedBy || 'User',
    notes: expense.notes || '',
  };
  expenses.unshift(newExp);
  localStorage.setItem('sys_expenses', JSON.stringify(expenses));
  return newExp;
};

// --- Attendance Service ---
export const getAttendanceRecords = (adminId?: string, employeeId?: string): AttendanceRecord[] => {
  let records: AttendanceRecord[] = JSON.parse(localStorage.getItem('sys_attendance') || '[]');
  if (employeeId) {
    records = records.filter((r) => r.employeeId === employeeId);
  } else if (adminId) {
    records = records.filter((r) => r.adminId === adminId);
  }
  return records;
};

export const toggleCheckInStatus = (employeeId: string, employeeName: string, adminId: string, workLog?: string): AttendanceRecord => {
  const records: AttendanceRecord[] = JSON.parse(localStorage.getItem('sys_attendance') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const activeRecord = records.find((r) => r.employeeId === employeeId && r.date === today);

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (activeRecord) {
    if (!activeRecord.checkOut) {
      activeRecord.checkOut = nowTime;
      if (workLog) activeRecord.workLog = workLog;
      localStorage.setItem('sys_attendance', JSON.stringify(records));
      return activeRecord;
    }
  }

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}`,
    employeeId,
    employeeName,
    adminId,
    date: today,
    checkIn: nowTime,
    status: 'present',
    workLog: workLog || 'Regular daily shift',
  };
  records.unshift(newRecord);
  localStorage.setItem('sys_attendance', JSON.stringify(records));
  return newRecord;
};
