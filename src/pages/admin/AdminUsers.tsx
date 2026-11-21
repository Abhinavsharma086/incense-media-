import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Shield,
  MapPin,
} from 'lucide-react';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/auth';
import Loader from '../../components/common/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface User {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  Role: {
    id: number;
    name: string;
  };
  address: string;
  city?: string;
  pincode?: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Add User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: 'user123',
    address: '',
    city: '',
    pincode: '',
    roleId: '2',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const response = await apiCall('get', ENDPOINTS.USERS);
    if (response.success) {
      setUsers(response.data?.data || []);
    }
    setLoading(false);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
    toast.success('Users list refreshed');
  };

  // Filter users based on search term and status
  const currentUserIsSuper = isSuperAdmin();

  const filteredUsers = users.filter((user) => {
    // Hide Super Admin accounts from Admin view
    if (!currentUserIsSuper) {
      const roleName = (user.Role?.name || '').toLowerCase();
      if (roleName.includes('super admin') || roleName.includes('superadmin') || user.email?.toLowerCase().includes('superadmin')) {
        return false;
      }
    }
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      fullName.includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.Role?.name && user.Role.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);

    return matchesSearch && matchesStatus;
  });

  const toggleUserStatus = async (userId: number) => {
    const response = await apiCall('put', `${ENDPOINTS.USER_TOGGLE_STATUS}/${userId}`);
    if (response.success) {
      toast.success('User status updated successfully');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
      );
    } else {
      toast.error('Failed to update user status');
    }
  };

  const handleOpenAddUser = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: 'user123',
      address: '',
      city: '',
      pincode: '',
      roleId: '2',
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSuperAdmin()) {
      const roleIdStr = String(formData.roleId || '').toLowerCase();
      if (roleIdStr === '1' || roleIdStr.includes('super')) {
        toast.error('Only Super Admin can create Super Admin accounts');
        return;
      }
    }

    const fName = formData.firstName.trim();
    const lName = formData.lastName.trim();
    const fullName = `${fName} ${lName}`.trim();
    const emailVal = formData.email.trim().toLowerCase();
    const phoneVal = formData.phone.trim();

    if (!fName) {
      toast.error('First name is required');
      return;
    }

    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!phoneVal || phoneVal.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setSubmitting(true);

    try {
      // Backend requires name, email, password, phoneNumber, and terms: true
      const payload = {
        name: fullName || fName,
        firstName: fName,
        lastName: lName || null,
        email: emailVal,
        password: formData.password || 'user123',
        phoneNumber: phoneVal,
        phone: phoneVal,
        address: formData.address || null,
        city: formData.city || null,
        pincode: formData.pincode || null,
        terms: true,
        roleId: formData.roleId,
      };

      // 1. Try signup endpoint (live production compatibility)
      let res = await apiCall('post', ENDPOINTS.SIGNUP, payload);

      if (!res.success) {
        // 2. Fallback to /admin/users endpoint
        res = await apiCall('post', ENDPOINTS.ADMIN_USERS, payload);
      }

      if (res.success) {
        toast.success(res.data?.message || 'New user account created successfully!');
        setIsModalOpen(false);
        await fetchUsers();
      } else {
        toast.error(res.error || 'Failed to create user account');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred while creating user');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-[hsl(var(--admin-text-primary))] tracking-tight">
            User Management
          </h1>
          <p className="text-[hsl(var(--admin-text-secondary))] text-sm mt-1">
            Manage and monitor registered portal user accounts ({users.length} total users).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-10 flex items-center gap-2 border-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primaryRed' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={handleOpenAddUser}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-10 rounded-xl transition-all flex items-center shadow-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[hsl(var(--admin-card))] rounded-2xl shadow-sm border border-[hsl(var(--admin-border))]">
        <div className="p-6 border-b border-[hsl(var(--admin-border))]">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--admin-text-secondary))] w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 border border-[hsl(var(--admin-border))] rounded-xl w-full focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-background text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-[hsl(var(--admin-border))] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-background text-sm"
              >
                <option value="all">All Status ({users.length})</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--admin-bg))] text-gray-500 font-semibold border-b border-[hsl(var(--admin-border))]">
              <tr>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-right text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[hsl(var(--admin-card))] divide-y divide-[hsl(var(--admin-border))]">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[hsl(var(--admin-bg))] transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-sm">
                            {user.firstName?.charAt(0) || 'U'}
                            {user.lastName?.charAt(0) || ''}
                          </div>
                        </div>
                        <div className="ml-3.5">
                          <div className="font-semibold text-[hsl(var(--admin-text-primary))]">
                            {user.firstName} {user.lastName || ''}
                          </div>
                          <div className="text-xs text-[hsl(var(--admin-text-secondary))]">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100">
                        <Shield className="w-3 h-3 mr-1" />
                        {user.Role?.name || 'User'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {user.isActive ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.phone ? (
                        <span className="text-gray-700 dark:text-gray-300 font-medium text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-[hsl(var(--admin-text-secondary))]">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                        className={`text-xs h-8 px-3 rounded-lg border ${
                          user.isActive
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-[hsl(var(--admin-text-secondary))]">
                      {searchTerm || filterStatus !== 'all'
                        ? 'No users found matching your search criteria'
                        : 'No users found in database'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADD USER MODAL DIALOG */}
      {/* ========================================================= */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create New User Account
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="usrFirstName" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  First Name *
                </Label>
                <Input
                  id="usrFirstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="e.g. Rahul"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="usrLastName" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Last Name
                </Label>
                <Input
                  id="usrLastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="e.g. Sharma"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="usrEmail" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Email Address *
              </Label>
              <Input
                id="usrEmail"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@incensemedia.in"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="usrPhone" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Mobile / Phone Number *
              </Label>
              <Input
                id="usrPhone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile number"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="usrPassword" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="usrPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="usrCity" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  City (Optional)
                </Label>
                <Input
                  id="usrCity"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="usrPincode" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Pincode (Optional)
                </Label>
                <Input
                  id="usrPincode"
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 400001"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs text-gray-500">
              ✓ Terms of Service and registration policies are automatically verified.
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 dark:border-gray-800 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;