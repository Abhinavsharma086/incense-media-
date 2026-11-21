import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  saveEmployee,
  deleteEmployee,
  EmployeeAccount,
  EmployeePermissions,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '@/lib/roleAuthStore';
import { getCurrentUser } from '@/lib/auth';
import crmApi from '@/api/crmApi';
import { useDataSync, notifyDataChanged } from '@/lib/useDataSync';
import {
  Users,
  Plus,
  Search,
  Shield,
  Check,
  X,
  Edit,
  Trash2,
  Lock,
  Building2,
  KeyRound,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/auth';

const AdminEmployees: React.FC = () => {
  const currentUser = getCurrentUser();
  const adminId = currentUser?.adminId || currentUser?.id || 'admin-1';
  const companyName = currentUser?.companyName || 'My Organization';

  const [employees, setEmployees] = useState<EmployeeAccount[]>(getEmployees(adminId));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'permissions'>('info');

  // Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetEmp, setPasswordTargetEmp] = useState<EmployeeAccount | null>(null);
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    designation: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
    permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
  });

  // Fetch employees directly from backend database so they reflect across all desktops
  const fetchLiveEmployees = async () => {
    setLoading(true);
    try {
      const res = await crmApi.get('/units/employees/available');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const liveList: EmployeeAccount[] = res.data.map((u: any) => ({
          id: u.id,
          adminId: adminId,
          adminName: currentUser?.name || 'Admin',
          companyName: companyName,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Employee',
          email: u.email && !u.email.includes('@noemail.incense.com') ? u.email : '',
          phone: u.phone || '',
          designation: u.role?.name || u.designation || 'Sales Executive',
          status: (u.isActive !== false && !u.isSuspended) ? 'active' : 'inactive',
          permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
          createdAt: u.createdAt || new Date().toISOString(),
        }));

        // Merge with local permissions cache
        const localList = getEmployees(adminId);
        const mergedMap = new Map<string, EmployeeAccount>();
        liveList.forEach((emp) => mergedMap.set(emp.id, emp));
        localList.forEach((localEmp) => {
          if (localEmp.email) {
            const found = Array.from(mergedMap.values()).find(
              (x) => x.email && x.email.toLowerCase() === localEmp.email?.toLowerCase()
            );
            if (found && localEmp.permissions) {
              found.permissions = localEmp.permissions;
            }
          }
        });

        const finalList = Array.from(mergedMap.values());
        setEmployees(finalList);
        localStorage.setItem('sys_employees', JSON.stringify(finalList));
      } else {
        setEmployees(getEmployees(adminId));
      }
    } catch (err) {
      console.warn('Backend fetch employees warning:', err);
      setEmployees(getEmployees(adminId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveEmployees();
  }, [adminId]);

  // Multi-browser and cross-tab real-time synchronization for Employees
  useDataSync('employees', fetchLiveEmployees);

  const refreshList = () => {
    fetchLiveEmployees();
  };

  const handleOpenPasswordModal = (emp: EmployeeAccount) => {
    setPasswordTargetEmp(emp);
    setNewEmployeePassword('Incense@123');
    setShowNewPassword(true);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetEmp || !newEmployeePassword || newEmployeePassword.trim().length < 4) {
      toast.error('Password must be at least 4 characters long');
      return;
    }
    setPasswordUpdating(true);
    try {
      const cleanPass = newEmployeePassword.trim();
      const res = await crmApi.post(`/units/employees/${passwordTargetEmp.id}/reset-password`, {
        password: cleanPass,
        email: passwordTargetEmp.email,
        phone: passwordTargetEmp.phone,
      });

      saveEmployee({
        id: passwordTargetEmp.id,
        password: cleanPass,
      });

      toast.success(res.data?.message || `Password changed successfully for ${passwordTargetEmp.name}!`);
      setIsPasswordModalOpen(false);
      setPasswordTargetEmp(null);
      setNewEmployeePassword('');
      await fetchLiveEmployees();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update employee password');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleOpenModal = (empToEdit?: EmployeeAccount) => {
    if (empToEdit) {
      const mergedPerms: EmployeePermissions = {
        ...DEFAULT_EMPLOYEE_PERMISSIONS,
        ...(empToEdit.permissions || {}),
        leads: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.leads,
          ...(empToEdit.permissions?.leads || {}),
        },
        leadReminders: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.leadReminders,
          ...(empToEdit.permissions?.leadReminders || {}),
        },
        paymentReminders: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.paymentReminders,
          ...(empToEdit.permissions?.paymentReminders || {}),
        },
        invoices: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.invoices,
          ...(empToEdit.permissions?.invoices || {}),
        },
        customers: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.customers,
          ...(empToEdit.permissions?.customers || {}),
        },
        products: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.products,
          ...(empToEdit.permissions?.products || {}),
        },
        payments: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.payments,
          ...(empToEdit.permissions?.payments || {}),
        },
        reports: {
          ...DEFAULT_EMPLOYEE_PERMISSIONS.reports,
          ...(empToEdit.permissions?.reports || {}),
        },
      };

      setFormData({
        id: empToEdit.id,
        name: empToEdit.name,
        email: empToEdit.email || '',
        phone: empToEdit.phone || '',
        designation: empToEdit.designation,
        password: '',
        status: empToEdit.status,
        permissions: mergedPerms,
      });
    } else {
      setFormData({
        id: '',
        name: '',
        email: '',
        phone: '',
        designation: 'Sales Executive',
        password: 'emp123',
        status: 'active',
        permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
      });
    }
    setActiveTab('info');
    setIsOpenModal(true);
  };

  const handleTogglePerm = (
    moduleKey: keyof EmployeePermissions,
    actionKey: string
  ) => {
    setFormData((prev) => {
      const currentModule = (prev.permissions[moduleKey] || {}) as any;
      const moduleObj = { ...currentModule };
      moduleObj[actionKey] = !moduleObj[actionKey];
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleKey]: moduleObj,
        },
      };
    });
  };

  const applyPreset = (presetType: 'all' | 'sales' | 'accounts' | 'none') => {
    if (presetType === 'all') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          dashboard: { view: true },
          leads: { view: true, whatsapp: true, remark: true, edit: true, reminder: true, quickAdd: true, import: true, merge: true, category: true, delete: true },
          leadReminders: { view: true, whatsapp: true, takeAction: true, reschedule: true },
          paymentReminders: { view: true, whatsapp: true, viewInvoice: true, delete: true },
          customers: { create: true, edit: true, delete: true, view: true },
          products: { create: true, edit: true, delete: true, view: true },
          invoices: { create: true, edit: true, delete: true, view: true, whatsapp: true },
          payments: { view: true, add: true },
          reports: { view: true },
          expenses: { manage: true },
          attendance: { manage: true },
          notifications: { view: true },
          settings: { manage: true },
        },
      }));
    } else if (presetType === 'sales') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          dashboard: { view: true },
          leads: { view: true, whatsapp: true, remark: true, edit: true, reminder: true, quickAdd: true, import: true, merge: true, category: true, delete: false },
          leadReminders: { view: true, whatsapp: true, takeAction: true, reschedule: true },
          paymentReminders: { view: false, whatsapp: false, viewInvoice: false, delete: false },
          customers: { create: true, edit: true, delete: false, view: true },
          products: { create: false, edit: false, delete: false, view: true },
          invoices: { create: false, edit: false, delete: false, view: false, whatsapp: false },
          payments: { view: false, add: false },
          reports: { view: false },
          expenses: { manage: false },
          attendance: { manage: true },
          notifications: { view: true },
          settings: { manage: false },
        },
      }));
    } else if (presetType === 'accounts') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          dashboard: { view: true },
          leads: { view: false, whatsapp: false, remark: false, edit: false, reminder: false, quickAdd: false, import: false, merge: false, category: false, delete: false },
          leadReminders: { view: false, whatsapp: false, takeAction: false, reschedule: false },
          paymentReminders: { view: true, whatsapp: true, viewInvoice: true, delete: true },
          customers: { create: true, edit: true, delete: false, view: true },
          products: { create: true, edit: true, delete: false, view: true },
          invoices: { create: true, edit: true, delete: false, view: true, whatsapp: true },
          payments: { view: true, add: true },
          reports: { view: true },
          expenses: { manage: true },
          attendance: { manage: true },
          notifications: { view: true },
          settings: { manage: false },
        },
      }));
    } else if (presetType === 'none') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          dashboard: { view: false },
          leads: { view: false, whatsapp: false, remark: false, edit: false, reminder: false, quickAdd: false, import: false, merge: false, category: false, delete: false },
          leadReminders: { view: false, whatsapp: false, takeAction: false, reschedule: false },
          paymentReminders: { view: false, whatsapp: false, viewInvoice: false, delete: false },
          customers: { create: false, edit: false, delete: false, view: false },
          products: { create: false, edit: false, delete: false, view: false },
          invoices: { create: false, edit: false, delete: false, view: false, whatsapp: false },
          payments: { view: false, add: false },
          reports: { view: false },
          expenses: { manage: false },
          attendance: { manage: false },
          notifications: { view: false },
          settings: { manage: false },
        },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailVal = formData.email.trim();
    const phoneVal = formData.phone.trim();
    const phoneDigits = phoneVal.replace(/\D/g, '');

    // Requirement: Either Email or Mobile is required
    if (!emailVal && !phoneVal) {
      toast.error('Please enter at least an Email Address or Mobile Number');
      return;
    }

    // Validation: If phone is provided, minimum 10 digits filter
    if (phoneVal && phoneDigits.length < 10) {
      toast.error('Mobile number must be at least 10 digits');
      return;
    }

    // Validation: If email is provided, validate email format
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const trimmedPassword = formData.password && formData.password.trim().length > 0 ? formData.password.trim() : undefined;

    try {
      // 1. Sync to backend database so it exists on all desktops
      const res = await crmApi.post('/units/employees/sync', {
        id: formData.id || undefined,
        name: formData.name,
        email: emailVal,
        phone: phoneVal,
        designation: formData.designation,
        password: trimmedPassword,
        status: formData.status,
      });

      const backendId = res.data?.id || formData.id;

      // 2. Save in local cache with returned backend ID
      saveEmployee({
        id: backendId,
        adminId,
        adminName: currentUser?.name || 'Admin',
        companyName,
        name: formData.name,
        email: emailVal,
        phone: phoneVal,
        designation: formData.designation,
        password: trimmedPassword,
        status: formData.status,
        permissions: formData.permissions,
      });

      // 3. Update loggedIn user in localStorage if active session matches
      const loggedUser = getCurrentUser();
      if (loggedUser && (loggedUser.id === backendId || loggedUser.email === emailVal || (phoneVal && loggedUser.phone === phoneVal))) {
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...loggedUser,
            permissions: formData.permissions,
          })
        );
      }

      toast.success(formData.id ? 'Employee updated successfully across all systems' : 'New Employee created successfully in database!');
      notifyDataChanged('employees', formData.id ? 'update' : 'create');
      setIsOpenModal(false);
      await fetchLiveEmployees();
    } catch (syncErr: any) {
      console.warn('Backend sync warning:', syncErr);
      saveEmployee({
        id: formData.id || undefined,
        adminId,
        adminName: currentUser?.name || 'Admin',
        companyName,
        name: formData.name,
        email: emailVal,
        phone: phoneVal,
        designation: formData.designation,
        password: formData.password || undefined,
        status: formData.status,
        permissions: formData.permissions,
      });
      notifyDataChanged('employees', formData.id ? 'update' : 'create');
      toast.success(formData.id ? 'Employee updated' : 'Employee created');
      setIsOpenModal(false);
      await fetchLiveEmployees();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this employee account?')) {
      try {
        await crmApi.delete(`/superadmin/admins/${id}`, {
          data: { superAdminPassword: 'super123' },
        }).catch(() => {});
      } catch (_) {}
      deleteEmployee(id);
      notifyDataChanged('employees', 'delete', { id });
      toast.success('Employee account removed');
      await fetchLiveEmployees();
    }
  };

  const currentUserIsSuper = isSuperAdmin();

  const filtered = employees.filter((e) => {
    if (!currentUserIsSuper) {
      const des = (e.designation || '').toLowerCase();
      const mail = (e.email || '').toLowerCase();
      if (des.includes('super admin') || des.includes('superadmin') || mail.includes('superadmin')) {
        return false;
      }
    }
    return (
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.email && e.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.phone && e.phone.includes(searchQuery)) ||
      e.designation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employee Management & Permissions</h1>
          <p className="text-sm text-gray-500">
            Create employees for {companyName} and assign granular module permission controls.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchLiveEmployees}
            disabled={loading}
            title="Refresh employees from database"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Employee
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search employee by name, designation, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Total Employees: <span className="font-bold text-gray-900">{employees.length}</span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Employee Name</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Email & Contact</th>
                <th className="px-6 py-4">Granted Modules</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No employees registered yet. Click "Add New Employee" to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const permCount = Object.values(emp.permissions || {}).filter(
                    (m: any) => Object.values(m).some(Boolean)
                  ).length;

                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{emp.name}</div>
                            <div className="text-xs text-gray-400">ID: {emp.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{emp.designation}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs space-y-0.5">
                          {emp.email ? (
                            <span className="font-medium text-gray-900">{emp.email}</span>
                          ) : (
                            <span className="text-gray-400 italic">No email</span>
                          )}
                          {emp.phone ? (
                            <span className="text-gray-500 font-mono">{emp.phone}</span>
                          ) : (
                            <span className="text-gray-400 italic">No mobile</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                          <Shield className="w-3.5 h-3.5" /> {permCount} Active Modules
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenPasswordModal(emp)}
                            className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Change Employee Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(emp)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Permissions & Profile"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee & Permission Matrix Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 my-8">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-lg font-bold">
                    {formData.id ? 'Edit Employee & Permissions' : 'Create New Employee'}
                  </h2>
                  <p className="text-xs text-slate-400">{companyName}</p>
                </div>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-6 gap-6 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-3 border-b-2 transition-all ${
                  activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                1. Basic Info & Login
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-3 border-b-2 transition-all ${
                  activeTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                2. Granular Permissions Matrix
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {activeTab === 'info' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Employee Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Alex Mercer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Email Address <span className="text-gray-400 font-normal lowercase">(optional if mobile entered)</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="alex@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Designation / Role *</label>
                      <input
                        type="text"
                        required
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Sales Executive"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Mobile Number <span className="text-gray-400 font-normal lowercase">(min 10 digits, optional if email entered)</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 9876543210"
                      />
                      <p className="text-[11px] text-blue-600 mt-1">
                        * Note: Either Email or 10-digit Mobile is required.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Password {formData.id ? '(Leave blank to keep existing)' : '*'}
                      </label>
                      <input
                        type="password"
                        required={!formData.id}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('permissions')}
                      className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 shadow-md"
                    >
                      Next: Configure Permissions →
                    </button>
                  </div>
                </div>
              ) : (
                /* Granular Permission Matrix UI */
                <div className="space-y-5">
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="font-bold">💡 Configure Access Control:</span> Check the exact features this employee is permitted to use. Unchecked features will be automatically hidden and disabled in their Employee Portal.
                    </div>
                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyPreset('all')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('sales')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                      >
                        Sales & Leads
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('accounts')}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                      >
                        Billing & Accounts
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('none')}
                        className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[11px] font-bold transition"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* 1. Dashboard Module */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">1</span>
                          Dashboard & Analytics
                        </h4>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.permissions.dashboard?.view ?? true}
                          onChange={() => handleTogglePerm('dashboard', 'view')}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        View Dashboard Summary, Counters & Pipeline Widgets
                      </label>
                    </div>

                    {/* 2. My Assigned Leads (CRM Leads) */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-black">2</span>
                          My Assigned Leads Module
                        </h4>
                        <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Core CRM</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.view ?? true}
                            onChange={() => handleTogglePerm('leads', 'view')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          View Assigned Leads
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-emerald-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.whatsapp ?? true}
                            onChange={() => handleTogglePerm('leads', 'whatsapp')}
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          1-Click WhatsApp Chat 💬
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.remark ?? true}
                            onChange={() => handleTogglePerm('leads', 'remark')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          Add Remarks & Status
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.reminder ?? true}
                            onChange={() => handleTogglePerm('leads', 'reminder')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          Set / Reschedule Reminder
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.quickAdd ?? true}
                            onChange={() => handleTogglePerm('leads', 'quickAdd')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          Quick Add Lead (+ Lead)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.import ?? true}
                            onChange={() => handleTogglePerm('leads', 'import')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          Import Excel / CSV
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.merge ?? true}
                            onChange={() => handleTogglePerm('leads', 'merge')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          Merge Duplicate Leads
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.edit ?? true}
                            onChange={() => handleTogglePerm('leads', 'edit')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          Edit Lead Info
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.category ?? true}
                            onChange={() => handleTogglePerm('leads', 'category')}
                            className="w-4 h-4 rounded text-teal-600"
                          />
                          Manage / Edit Categories
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-rose-600 font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leads?.delete ?? false}
                            onChange={() => handleTogglePerm('leads', 'delete')}
                            className="w-4 h-4 rounded text-rose-600"
                          />
                          Delete Lead
                        </label>
                      </div>
                    </div>

                    {/* 3. Lead Reminders & Follow-Ups */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">3</span>
                          Lead Reminders & Follow-ups Module
                        </h4>
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Scheduled Follow-ups</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leadReminders?.view ?? true}
                            onChange={() => handleTogglePerm('leadReminders', 'view')}
                            className="w-4 h-4 rounded text-amber-600"
                          />
                          View Follow-ups (Due & Overdue)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-emerald-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leadReminders?.whatsapp ?? true}
                            onChange={() => handleTogglePerm('leadReminders', 'whatsapp')}
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          WhatsApp Follow-Up Chat 💬
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leadReminders?.takeAction ?? true}
                            onChange={() => handleTogglePerm('leadReminders', 'takeAction')}
                            className="w-4 h-4 rounded text-amber-600"
                          />
                          Take Action / Update Notes
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.leadReminders?.reschedule ?? true}
                            onChange={() => handleTogglePerm('leadReminders', 'reschedule')}
                            className="w-4 h-4 rounded text-amber-600"
                          />
                          Reschedule Due Date
                        </label>
                      </div>
                    </div>

                    {/* 4. Payment Reminders (1-Click Follow-ups) */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-black">4</span>
                          Payment Reminders & Collection Time Limits
                        </h4>
                        <span className="text-[11px] font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">Collections ERP</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.paymentReminders?.view ?? true}
                            onChange={() => handleTogglePerm('paymentReminders', 'view')}
                            className="w-4 h-4 rounded text-orange-600"
                          />
                          View Payment Reminders
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-emerald-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={formData.permissions.paymentReminders?.whatsapp ?? true}
                            onChange={() => handleTogglePerm('paymentReminders', 'whatsapp')}
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          1-Click WhatsApp Reminder 💬
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.paymentReminders?.viewInvoice ?? true}
                            onChange={() => handleTogglePerm('paymentReminders', 'viewInvoice')}
                            className="w-4 h-4 rounded text-orange-600"
                          />
                          View / Print Tax Invoice PDF
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-rose-600 font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.paymentReminders?.delete ?? false}
                            onChange={() => handleTogglePerm('paymentReminders', 'delete')}
                            className="w-4 h-4 rounded text-rose-600"
                          />
                          Clear / Delete Reminder ❌
                        </label>
                      </div>
                    </div>

                    {/* 5. Invoices & Billing */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">5</span>
                          Invoices & Billing Module
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.invoices?.view ?? true}
                            onChange={() => handleTogglePerm('invoices', 'view')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          View Invoices
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.invoices?.create ?? true}
                            onChange={() => handleTogglePerm('invoices', 'create')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Create Invoice
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.invoices?.edit ?? true}
                            onChange={() => handleTogglePerm('invoices', 'edit')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Edit Invoice
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-emerald-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={formData.permissions.invoices?.whatsapp ?? true}
                            onChange={() => handleTogglePerm('invoices', 'whatsapp')}
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          Share on WhatsApp 💬
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-rose-600 font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.invoices?.delete ?? false}
                            onChange={() => handleTogglePerm('invoices', 'delete')}
                            className="w-4 h-4 rounded text-rose-600"
                          />
                          Delete Invoice ❌
                        </label>
                      </div>
                    </div>

                    {/* 6. Payments & Collections */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">6</span>
                          Payments & Collections
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.payments?.view ?? true}
                            onChange={() => handleTogglePerm('payments', 'view')}
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          View Received Payments
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.payments?.add ?? true}
                            onChange={() => handleTogglePerm('payments', 'add')}
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          Record New Payment
                        </label>
                      </div>
                    </div>

                    {/* 7. Reports & Analytics */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">7</span>
                          Reports & Analytics
                        </h4>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.permissions.reports?.view ?? true}
                          onChange={() => handleTogglePerm('reports', 'view')}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        View Accounting, Sales & Collection Reports
                      </label>
                    </div>

                    {/* 8. Customers Management */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-black">8</span>
                          Customers Management
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.customers?.view ?? true}
                            onChange={() => handleTogglePerm('customers', 'view')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          View Customers
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.customers?.create ?? true}
                            onChange={() => handleTogglePerm('customers', 'create')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Create Customer
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.customers?.edit ?? true}
                            onChange={() => handleTogglePerm('customers', 'edit')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Edit Customer
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-rose-600 font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.customers?.delete ?? false}
                            onChange={() => handleTogglePerm('customers', 'delete')}
                            className="w-4 h-4 rounded text-rose-600"
                          />
                          Delete Customer ❌
                        </label>
                      </div>
                    </div>

                    {/* 9. Products & Services */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-black">9</span>
                          Products & Services Catalog
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.products?.view ?? true}
                            onChange={() => handleTogglePerm('products', 'view')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          View Products
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.products?.create ?? true}
                            onChange={() => handleTogglePerm('products', 'create')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Create Product
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.products?.edit ?? true}
                            onChange={() => handleTogglePerm('products', 'edit')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Edit Product
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-rose-600 font-medium">
                          <input
                            type="checkbox"
                            checked={formData.permissions.products?.delete ?? false}
                            onChange={() => handleTogglePerm('products', 'delete')}
                            className="w-4 h-4 rounded text-rose-600"
                          />
                          Delete Product ❌
                        </label>
                      </div>
                    </div>

                    {/* 10. Attendance & Expenses */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-black">10</span>
                          Attendance & Expenses
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.attendance?.manage ?? true}
                            onChange={() => handleTogglePerm('attendance', 'manage')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Mark & View Attendance
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.expenses?.manage ?? true}
                            onChange={() => handleTogglePerm('expenses', 'manage')}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          Manage Expenses
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between gap-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      ← Back to Info
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
                    >
                      Save Employee & Permissions
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* QUICK CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && passwordTargetEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">Change Employee Password</h3>
                  <p className="text-xs text-slate-400">{passwordTargetEmp.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <div><span className="font-semibold text-slate-700">Login ID / Mobile:</span> {passwordTargetEmp.phone || 'N/A'}</div>
                <div><span className="font-semibold text-slate-700">Official Email:</span> {passwordTargetEmp.email || 'N/A'}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newEmployeePassword}
                    onChange={(e) => setNewEmployeePassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                  Quick Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNewEmployeePassword('Incense@123')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono transition-colors"
                  >
                    Incense@123
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEmployeePassword('Admin@123')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono transition-colors"
                  >
                    Admin@123
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEmployeePassword('emp123')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono transition-colors"
                  >
                    emp123
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {passwordUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{passwordUpdating ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployees;
