import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchMyPermissionsApi } from '@/api/superAdminApi';
import { getRole } from '@/lib/auth';

interface PermissionContextType {
  permissions: string[];
  isSuperAdmin: boolean;
  loading: boolean;
  can: (permissionKey: string) => boolean;
  isModuleAllowed: (moduleName: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  isSuperAdmin: false,
  loading: true,
  can: () => false,
  isModuleAllowed: () => false,
  refreshPermissions: async () => {},
});

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadPermissions = async () => {
    const role = (getRole() || '').toLowerCase();
    if (role === 'super admin' || role === 'superadmin') {
      setIsSuperAdmin(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchMyPermissionsApi();
      if (res?.isSuperAdmin) {
        setIsSuperAdmin(true);
        setPermissions(res?.permissions || []);
      } else {
        setIsSuperAdmin(false);
        setPermissions(res?.permissions || []);
      }
    } catch (err) {
      console.warn('Could not load user permissions, falling back to role check', err);
      if (role === 'super admin' || role === 'superadmin') {
        setIsSuperAdmin(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();

    // Auto-refresh permissions every 30 seconds for instant sync without relogin
    const interval = setInterval(() => {
      loadPermissions();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const can = (permissionKey: string): boolean => {
    if (isSuperAdmin) return true;
    const role = (getRole() || '').toLowerCase();
    if ((role === 'admin' || role === 'super admin' || role === 'superadmin') && permissions.length === 0) {
      return true;
    }
    if (!permissionKey) return true;
    return permissions.includes(permissionKey);
  };

  const isModuleAllowed = (moduleName: string): boolean => {
    if (isSuperAdmin) return true;
    const role = (getRole() || '').toLowerCase();
    if ((role === 'admin' || role === 'super admin' || role === 'superadmin') && permissions.length === 0) {
      return true;
    }
    if (!moduleName) return true;
    // Check if user has ANY function allowed for this module
    return permissions.some((key) => key.startsWith(`${moduleName}.`));
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isSuperAdmin,
        loading,
        can,
        isModuleAllowed,
        refreshPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);

export const Can: React.FC<{ do: string; children: React.ReactNode }> = ({ do: permissionKey, children }) => {
  const { can } = usePermission();

  if (!can(permissionKey)) {
    return null; // Completely invisible if denied
  }

  return <>{children}</>;
};

export const PermissionGuard: React.FC<{ permission: string; children: React.ReactNode }> = ({ permission, children }) => {
  const { can, loading } = usePermission();

  if (loading) {
    return null;
  }

  if (!can(permission)) {
    // Return 404 view so existence isn't revealed
    return (
      <div className="p-12 text-center font-sans space-y-3">
        <h1 className="text-4xl font-extrabold text-slate-800">404</h1>
        <p className="text-sm text-slate-500">Page not found</p>
      </div>
    );
  }

  return <>{children}</>;
};
