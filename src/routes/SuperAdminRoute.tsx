import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import SuperAdminLayout from '../components/superadmin/SuperAdminLayout';
import { isSuperAdmin } from '@/lib/auth';

const SuperAdminRoute: React.FC = () => {
  if (!isSuperAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SuperAdminLayout>
      <Outlet />
    </SuperAdminLayout>
  );
};

export default SuperAdminRoute;
