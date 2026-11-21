import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import EmployeeLayout from '../components/employee/EmployeeLayout';
import { isEmployee, isLoggedIn, isSuperAdmin, isAdmin } from '@/lib/auth';

const EmployeePrivateRoute: React.FC = () => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (!isEmployee() && !isSuperAdmin() && !isAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <EmployeeLayout>
      <Outlet />
    </EmployeeLayout>
  );
};

export default EmployeePrivateRoute;
