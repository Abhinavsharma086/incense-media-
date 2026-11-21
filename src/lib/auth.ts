// src/lib/auth.ts
// Extended Authentication & Role-Based Access Control System

import { EmployeePermissions, getEmployees, DEFAULT_EMPLOYEE_PERMISSIONS } from './roleAuthStore';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'Super Admin' | 'Admin' | 'Employee' | string;
  designation?: string;
  adminId?: string;
  companyName?: string;
  permissions?: EmployeePermissions;
}

export const getToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('crm_token');
};

export const isLoggedIn = () => {
  return !!getToken();
};

export const getRole = (): string => {
  return localStorage.getItem('role') || '';
};

export const getCurrentUser = (): AuthUser | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      // continue to fallback
    }
  }
  if (isLoggedIn()) {
    const role = getRole() || 'Employee';
    return {
      id: localStorage.getItem('current_admin_id') || 'current-user',
      name: 'User',
      role: role as any,
      designation: role,
      permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
    };
  }
  return null;
};

/**
 * Synchronize the current user's profile and permissions from the backend DB
 * across all active browser windows and sessions.
 */
export const syncCurrentUserFromServer = async (): Promise<AuthUser | null> => {
  const token = getToken();
  if (!token) return null;

  const currentRole = (getRole() || '').toLowerCase();
  const existing = getCurrentUser() || ({} as any);

  // If user is currently an Employee using a local/mock employee token, preserve employee session
  if (currentRole === 'employee' && String(token).startsWith('token-emp-')) {
    return existing;
  }

  try {
    const { default: crmApi } = await import('@/api/crmApi');
    const { notifyDataChanged } = await import('./useDataSync');
    const res = await crmApi.get('/auth/me');
    if (res.data?.user) {
      const u = res.data.user;
      
      let finalRole = existing.role || 'Admin';
      const uRole = (u.role || '').toLowerCase();
      if (
        currentRole === 'employee' ||
        uRole === 'employee' ||
        uRole.includes('sales') ||
        uRole.includes('specialist') ||
        uRole.includes('executive') ||
        uRole.includes('associate') ||
        uRole.includes('operations') ||
        (!uRole.includes('super') && !uRole.includes('admin'))
      ) {
        finalRole = 'Employee';
      } else if (uRole === 'super admin' || uRole === 'superadmin') {
        finalRole = 'Super Admin';
      } else {
        finalRole = 'Admin';
      }

      const updatedUser: AuthUser = {
        ...existing,
        id: u.id || existing.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || existing.name,
        email: u.email || existing.email,
        phone: u.phone || existing.phone,
        role: finalRole as any,
        designation: u.role || existing.designation || 'Employee',
        permissions: (existing.permissions && typeof existing.permissions === 'object' && !Array.isArray(existing.permissions))
          ? existing.permissions
          : DEFAULT_EMPLOYEE_PERMISSIONS,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('role', finalRole);
      notifyDataChanged('user_profile', 'sync', updatedUser);
      return updatedUser;
    }
  } catch (err) {
    // Silently continue if offline
  }
  return getCurrentUser();
};

// Auto-sync profile on window focus
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    syncCurrentUserFromServer().catch(() => {});
  });
}

export const isSuperAdmin = (): boolean => {
  const role = getRole().toLowerCase();
  return isLoggedIn() && (role === 'super admin' || role === 'superadmin');
};

export const isEmployee = (): boolean => {
  if (!isLoggedIn()) return false;
  const role = getRole().toLowerCase();
  if (role === 'super admin' || role === 'superadmin' || role === 'admin') {
    return false;
  }
  return true;
};

export const isAdmin = (): boolean => {
  const role = getRole().toLowerCase();
  return isLoggedIn() && (role === 'super admin' || role === 'superadmin' || role === 'admin' || role.includes('admin'));
};

export const hasPermission = (
  moduleKey: keyof EmployeePermissions,
  actionKey: string = 'view'
): boolean => {
  // Super Admin & Admin have full permissions on their scope
  if (isSuperAdmin() || isAdmin()) {
    return true;
  }

  const user = getCurrentUser();
  if (!user) {
    return false;
  }

  const perms = (user.permissions && typeof user.permissions === 'object' && !Array.isArray(user.permissions))
    ? user.permissions
    : DEFAULT_EMPLOYEE_PERMISSIONS;

  const modulePerms = perms[moduleKey] as any;
  if (!modulePerms) return true;

  if (modulePerms[actionKey] !== undefined) {
    return !!modulePerms[actionKey];
  }

  const defaultMod = (DEFAULT_EMPLOYEE_PERMISSIONS as any)[moduleKey];
  if (defaultMod && defaultMod[actionKey] !== undefined) {
    return !!defaultMod[actionKey];
  }

  return true;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('crm_token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  localStorage.removeItem('current_admin_id');
  window.location.href = '/login';
};
