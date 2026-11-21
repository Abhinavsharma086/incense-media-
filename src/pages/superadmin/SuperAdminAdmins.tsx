import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldOff,
  KeyRound,
  LogOut,
  Trash2,
  Edit,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Laptop,
  Smartphone,
  Globe,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchAdminsApi,
  createAdminApi,
  updateAdminApi,
  toggleAdminSuspensionApi,
  resetAdminPasswordApi,
  forceLogoutAdminApi,
  deleteAdminApi,
  fetchAdminLoginHistoryApi,
  AdminUser,
} from '@/api/superAdminApi';
import { SecurityConfirmationModal } from '@/components/superadmin/SecurityConfirmationModal';
import { toast } from 'sonner';

const DEFAULT_ROLES = [
  { id: 'Admin', name: 'Admin' },
  { id: 'Super Admin', name: 'Super Admin' },
  { id: 'Sales Manager', name: 'Sales Manager' },
  { id: 'Employee', name: 'Employee' },
];

export const SuperAdminAdmins: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [accountType, setAccountType] = useState<'admin' | 'employee' | 'all'>('admin');
  const [counts, setCounts] = useState<{ admins: number; employees: number; all: number }>({ admins: 0, employees: 0, all: 0 });

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  const activeRolesList = roles.length > 0 ? roles : DEFAULT_ROLES;

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    roleId: 'Admin',
  });

  const [resetPassData, setResetPassData] = useState({
    newPassword: '',
    forcePasswordReset: true,
  });

  const [historyData, setHistoryData] = useState<{ loginHistory: any[]; activeSessions: any[] }>({
    loginHistory: [],
    activeSessions: [],
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminsApi({
        search,
        status: statusFilter,
        roleId: roleFilter,
        type: accountType,
        page,
        limit: 15,
      });
      setAdmins(res.data || []);
      setRoles(res.roles || []);
      if (res.counts) {
        setCounts(res.counts);
      }
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err: any) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, [search, statusFilter, roleFilter, accountType, page]);

  // Handle Create Admin
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await createAdminApi(formData);
      toast.success('Admin account created successfully!');
      setIsCreateOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', roleId: '' });
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create admin account');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Admin
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      setActionLoading(true);
      await updateAdminApi(selectedAdmin.id, formData);
      toast.success('Admin account updated successfully!');
      setIsEditOpen(false);
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update admin account');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Suspend/Restore
  const handleToggleSuspend = async (admin: AdminUser) => {
    const nextSuspend = !admin.isSuspended;
    try {
      await toggleAdminSuspensionApi(admin.id, nextSuspend);
      toast.success(`Admin ${admin.email} ${nextSuspend ? 'suspended' : 'restored'}`);
      loadAdmins();
    } catch (err: any) {
      toast.error('Failed to update suspension status');
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      setActionLoading(true);
      await resetAdminPasswordApi(selectedAdmin.id, resetPassData.newPassword, resetPassData.forcePasswordReset);
      toast.success(`Password reset successfully for ${selectedAdmin.email}`);
      setIsResetPasswordOpen(false);
      setResetPassData({ newPassword: '', forcePasswordReset: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Force Logout
  const handleForceLogout = async (admin: AdminUser) => {
    try {
      await forceLogoutAdminApi(admin.id);
      toast.success(`Active sessions terminated for ${admin.email}`);
      loadAdmins();
    } catch (err: any) {
      toast.error('Failed to force logout admin');
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async (superAdminPassword: string) => {
    if (!selectedAdmin) return;
    await deleteAdminApi(selectedAdmin.id, superAdminPassword);
    toast.success(`Admin ${selectedAdmin.email} deleted permanently.`);
    loadAdmins();
  };

  // Open History Modal
  const openHistoryModal = async (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsHistoryOpen(true);
    try {
      setHistoryLoading(true);
      const res = await fetchAdminLoginHistoryApi(admin.id);
      setHistoryData(res);
    } catch (err) {
      toast.error('Failed to fetch login history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Admin Account Management (CRUD)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, suspend, restore, reset passwords, force logout, view IP/device login logs, and control Admin accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/super-admin/employees"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" /> Employee Accounts
          </Link>
          <Button
            onClick={() => {
              const firstRole = activeRolesList.find((r) => r.name === 'Admin')?.id || activeRolesList[0]?.id || 'Admin';
              setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                phone: '',
                roleId: firstRole,
              });
              setIsCreateOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create New Admin
          </Button>
        </div>
      </div>

      {/* Category Tabs: Admin Accounts vs Employee Accounts */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAccountType('admin'); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              accountType === 'admin'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Admin Accounts
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              accountType === 'admin' ? 'bg-purple-700/70 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.admins || (accountType === 'admin' ? admins.length : 2)}
            </span>
          </button>

          <button
            onClick={() => { setAccountType('employee'); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              accountType === 'employee'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Employee Accounts
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              accountType === 'employee' ? 'bg-blue-700/70 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.employees || (accountType === 'employee' ? admins.length : 21)}
            </span>
          </button>

          <button
            onClick={() => { setAccountType('all'); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              accountType === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            All Users
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              accountType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.all || (counts.admins + counts.employees) || 23}
            </span>
          </button>
        </div>

        <Link
          to="/super-admin/employees"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Dedicated Employee Accounts Portal &rarr;
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="inactive">Deactivated</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Roles</option>
            {activeRolesList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Admin Account</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Login & IP</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Loading Admin Accounts...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No admin accounts found matching your filters.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {admin.firstName[0]}
                          {admin.lastName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {admin.firstName} {admin.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400">{admin.email}</div>
                          {admin.phone && <div className="text-[10px] text-slate-400">{admin.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold px-2.5 py-1 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {admin.role?.name || 'Admin'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {admin.isSuspended ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3 text-red-600" /> Suspended
                        </span>
                      ) : admin.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {admin.lastLoginAt ? (
                        <div>
                          <div className="text-slate-700 font-medium text-[11px]">
                            {new Date(admin.lastLoginAt).toLocaleDateString()} {new Date(admin.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-400" /> {admin.lastLoginIp || '127.0.0.1'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Never logged in</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setFormData({
                              firstName: admin.firstName,
                              lastName: admin.lastName,
                              email: admin.email,
                              password: '',
                              phone: admin.phone || '',
                              roleId: admin.role?.id || '',
                            });
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Edit Admin Account"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Suspend / Restore */}
                        {admin.role?.name !== 'Super Admin' && (
                          <button
                            onClick={() => handleToggleSuspend(admin)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              admin.isSuspended
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                            title={admin.isSuspended ? 'Restore Admin Account' : 'Suspend Admin Account'}
                          >
                            {admin.isSuspended ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setResetPassData({ newPassword: '', forcePasswordReset: true });
                            setIsResetPasswordOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Force Logout */}
                        <button
                          onClick={() => handleForceLogout(admin)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Force Logout Active Sessions"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>

                        {/* Login History */}
                        <button
                          onClick={() => openHistoryModal(admin)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Login History & Device Log"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Delete Admin */}
                        {admin.role?.name !== 'Super Admin' && (
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Admin Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ADMIN MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Admin Account</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={formData.roleId || activeRolesList[0]?.id}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 text-slate-800 font-semibold"
                  >
                    {activeRolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-5">
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {isEditOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Admin: {selectedAdmin.email}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.roleId || activeRolesList[0]?.id}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 text-slate-800 font-semibold"
                  >
                    {activeRolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-5">
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetPasswordOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">Reset password for <strong>{selectedAdmin.email}</strong>. Active sessions will be automatically terminated.</p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPassData.newPassword}
                  onChange={(e) => setResetPassData({ ...resetPassData, newPassword: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter new password"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forceReset"
                  checked={resetPassData.forcePasswordReset}
                  onChange={(e) => setResetPassData({ ...resetPassData, forcePasswordReset: e.target.checked })}
                  className="rounded-xs text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="forceReset" className="text-xs text-slate-700 font-medium">
                  Force user to change password upon next login
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsResetPasswordOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5">
                  {actionLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGIN HISTORY & DEVICE LOG MODAL */}
      {isHistoryOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Login History & Device Log</h3>
                <p className="text-xs text-slate-500">{selectedAdmin.firstName} {selectedAdmin.lastName} ({selectedAdmin.email})</p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" /> Loading log history...
                </div>
              ) : (
                <>
                  {/* Active Sessions */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-purple-600" /> Active Token Sessions ({historyData.activeSessions?.length || 0})
                    </h4>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
                      {historyData.activeSessions?.length === 0 ? (
                        <div className="text-slate-400 italic">No active tokens found.</div>
                      ) : (
                        historyData.activeSessions?.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <div className="font-mono text-[11px] text-slate-700">IP: {s.ipAddress || '127.0.0.1'}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-md">{s.userAgent}</div>
                            </div>
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ACTIVE</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Past Login Log */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-slate-600" /> Recent Login Log Stream
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="py-2 px-3">Timestamp</th>
                            <th className="py-2 px-3">IP Address</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">User Agent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {historyData.loginHistory?.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-400 italic">No login records found yet.</td>
                            </tr>
                          ) : (
                            historyData.loginHistory?.map((h: any) => (
                              <tr key={h.id}>
                                <td className="py-2 px-3 text-slate-600">{new Date(h.createdAt).toLocaleString()}</td>
                                <td className="py-2 px-3 font-mono text-slate-800">{h.ipAddress || '127.0.0.1'}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    h.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {h.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{h.userAgent || 'Desktop Browser'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DANGEROUS ACTION DELETION CONFIRMATION MODAL */}
      <SecurityConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Admin Account Permanently"
        description={`You are about to permanently delete ${selectedAdmin?.email}. This action cannot be undone.`}
        actionText="Delete Account"
        variant="danger"
      />
    </div>
  );
};

export default SuperAdminAdmins;
