import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isLoggedIn } from '@/lib/auth';

const GuestRoute: React.FC = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const location = useLocation();

  // Only redirect admin users from admin login page
  if (token && role === 'admin' && location.pathname === '/admin/login') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Redirect users if they're trying to access user auth pages while logged in
  if (isLoggedIn() && ['/login', '/register', '/forgot-password', '/otp-verification'].includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  // Redirect to login if trying to access profile without being logged in
  if (!isLoggedIn() && location.pathname === '/profile') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default GuestRoute;