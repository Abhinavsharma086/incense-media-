import { instance } from './axiosInstance';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  isSuspended: boolean;
  twoFactorEnabled: boolean;
  forcePasswordReset: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    description?: string;
  };
  _count?: {
    loginHistories: number;
    sessions: number;
    activityLogs: number;
  };
}

export interface UserPermissionItem {
  id?: string;
  userId: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canApprove: boolean;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  action: string;
  module: string;
  targetId?: string;
  targetType?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: { name: string };
  };
}

export interface GlobalSettingItem {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  updatedBy?: string;
  updatedAt: string;
}

// 1. Dashboard Stats
export const fetchSuperAdminDashboardStats = async () => {
  const response = await instance.get('/api/superadmin/dashboard/stats');
  return response.data;
};

// 2. Admins CRUD
export const fetchAdminsApi = async (params?: { search?: string; status?: string; roleId?: string; type?: 'admin' | 'employee' | 'all' | string; page?: number; limit?: number }) => {
  const response = await instance.get('/api/superadmin/admins', { params });
  return response.data;
};

export const createAdminApi = async (data: any) => {
  const response = await instance.post('/api/superadmin/admins', data);
  return response.data;
};

export const updateAdminApi = async (id: string, data: any) => {
  const response = await instance.put(`/api/superadmin/admins/${id}`, data);
  return response.data;
};

export const toggleAdminSuspensionApi = async (id: string, suspend: boolean, reason?: string) => {
  const response = await instance.patch(`/api/superadmin/admins/${id}/suspend`, { suspend, reason });
  return response.data;
};

export const resetAdminPasswordApi = async (id: string, newPassword: string, forcePasswordReset: boolean = true) => {
  const response = await instance.post(`/api/superadmin/admins/${id}/reset-password`, { newPassword, forcePasswordReset });
  return response.data;
};

export const forceLogoutAdminApi = async (id: string) => {
  const response = await instance.post(`/api/superadmin/admins/${id}/force-logout`);
  return response.data;
};

export const deleteAdminApi = async (id: string, superAdminPassword: string) => {
  const response = await instance.delete(`/api/superadmin/admins/${id}`, { data: { superAdminPassword } });
  return response.data;
};

export const fetchAdminLoginHistoryApi = async (id: string) => {
  const response = await instance.get(`/api/superadmin/admins/${id}/history`);
  return response.data;
};

// 3. Permissions Control
export const fetchAdminPermissionsApi = async (id: string) => {
  const response = await instance.get(`/api/superadmin/admins/${id}/permissions`);
  return response.data;
};

export const updateAdminPermissionsApi = async (id: string, permissions: UserPermissionItem[]) => {
  const response = await instance.put(`/api/superadmin/admins/${id}/permissions`, { permissions });
  return response.data;
};

export const fetchAdminPermissionKeysApi = async (id: string) => {
  const response = await instance.get(`/api/superadmin/admins/${id}/permission-keys`);
  return response.data;
};

export const updateAdminPermissionKeysApi = async (id: string, permissions: Record<string, boolean>) => {
  const response = await instance.put(`/api/superadmin/admins/${id}/permission-keys`, { permissions });
  return response.data;
};

export const copyAdminPermissionsApi = async (fromAdminId: string, toAdminId: string) => {
  const response = await instance.post('/api/superadmin/admins/copy-permissions', { fromAdminId, toAdminId });
  return response.data;
};

export const fetchPermissionTemplatesApi = async () => {
  const response = await instance.get('/api/superadmin/permission-templates');
  return response.data;
};

export const createPermissionTemplateApi = async (data: { name: string; description?: string; permissions: string[] | string }) => {
  const response = await instance.post('/api/superadmin/permission-templates', data);
  return response.data;
};

export const applyPermissionTemplateApi = async (id: string, templateId: string) => {
  const response = await instance.post(`/api/superadmin/admins/${id}/apply-template`, { templateId });
  return response.data;
};

export const fetchMyPermissionsApi = async () => {
  const response = await instance.get('/api/superadmin/my-permissions');
  return response.data;
};

// 4. Global Settings & Feature Flags
export const fetchGlobalSettingsApi = async () => {
  const response = await instance.get('/api/superadmin/settings');
  return response.data;
};

export const updateGlobalSettingsApi = async (settings: Record<string, any> | GlobalSettingItem[]) => {
  const response = await instance.put('/api/superadmin/settings', { settings });
  return response.data;
};

// 5. Activity Audit Logs
export const fetchActivityLogsApi = async (params?: { search?: string; module?: string; action?: string; page?: number; limit?: number }) => {
  const response = await instance.get('/api/superadmin/logs', { params });
  return response.data;
};
